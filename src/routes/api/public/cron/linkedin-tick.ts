import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { authorizeCron, getAdmin } from "@/lib/automation.server";

// Passage LinkedIn (horaire) : prépare le mois, rédige 3 posts vides au plus,
// publie au plus 5 posts dus (validés, ou brouillons en mode tout automatique) à partir de 9 h.
const LEASE_MS = 4 * 60 * 1000;
const WRITE_BATCH = 3;
const PUBLISH_BATCH = 5;

const parisNow = () => {
  const p = new Intl.DateTimeFormat("fr-CA", { timeZone: "Europe/Paris", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", hour12: false }).formatToParts(new Date());
  const g = (t: string) => p.find((x) => x.type === t)?.value ?? "";
  return { date: `${g("year")}-${g("month")}-${g("day")}`, hour: Number(g("hour")) };
};

export const Route = createFileRoute("/api/public/cron/linkedin-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = request.headers.get("x-cron-token") ? await authorizeCron(request) : await authenticateCronRequest(request);
        if (denied) return denied;
        const admin = await getAdmin();
        const { data: st } = await admin.from("linkedin_job_state").select("paused_reason").eq("id", true).maybeSingle();
        if (st?.paused_reason) return Response.json({ paused: st.paused_reason });
        const now = new Date();
        const { data: lease } = await admin.from("linkedin_job_state")
          .update({ lease_until: new Date(now.getTime() + LEASE_MS).toISOString(), updated_at: now.toISOString() })
          .eq("id", true).or(`lease_until.is.null,lease_until.lt.${now.toISOString()}`).select("id");
        if (!lease?.length) return Response.json({ skipped: "locked" });

        const { ensureMonthPlan, writePost, publishToLinkedin, linkedinBudgetLeft } = await import("@/lib/linkedin.server");
        const { date, hour } = parisNow();
        let written = 0, published = 0;
        try {
          const { data: users } = await admin.from("linkedin_settings").select("user_id, market_day, auto_publish, reconnect_required");
          for (const u of users ?? []) await ensureMonthPlan(admin, u.user_id, u.market_day);

          // Rédaction bornée des emplacements vides, les plus proches d'abord.
          if (await linkedinBudgetLeft(admin)) {
            const { data: empty } = await admin.from("linkedin_posts").select("id, user_id, kind").eq("body", "").eq("status", "brouillon")
              .gte("scheduled_for", date).order("scheduled_for").limit(WRITE_BATCH);
            for (const p of empty ?? []) {
              const r = await writePost(admin, p.user_id, p.kind as "actifs" | "specialite" | "marche");
              if ("error" in r) {
                await admin.from("linkedin_posts").update({ error: r.error }).eq("id", p.id);
                if (r.error.includes("Plafond")) break;
                continue;
              }
              await admin.from("linkedin_posts").update({ body: r.body.trim(), chart: r.chart, error: null }).eq("id", p.id);
              written++;
            }
          }

          // Publication des posts dus.
          if (hour >= 9) {
            const auto = new Set((users ?? []).filter((u) => u.auto_publish).map((u) => u.user_id));
            const blocked = new Set((users ?? []).filter((u) => u.reconnect_required).map((u) => u.user_id));
            const { data: due } = await admin.from("linkedin_posts").select("id, user_id, body, status")
              .in("status", ["valide", "brouillon"]).neq("body", "").lte("scheduled_for", date).order("scheduled_for").limit(50);
            const todo = (due ?? []).filter((p) => !blocked.has(p.user_id) && (p.status === "valide" || auto.has(p.user_id))).slice(0, PUBLISH_BATCH);
            for (const p of todo) {
              // Réservation : un post ne part qu'une fois.
              const { data: claim } = await admin.from("linkedin_posts").update({ status: "echec", error: "Envoi en cours" }).eq("id", p.id).eq("status", p.status).select("id");
              if (!claim?.length) continue;
              const r = await publishToLinkedin(p.user_id, p.body);
              if (r.ok) { await admin.from("linkedin_posts").update({ status: "publie", published_at: new Date().toISOString(), error: null }).eq("id", p.id); published++; }
              else {
                await admin.from("linkedin_posts").update({ error: r.error }).eq("id", p.id);
                if (r.reconnect) { await admin.from("linkedin_settings").update({ reconnect_required: true }).eq("user_id", p.user_id); blocked.add(p.user_id); }
              }
            }
          }
        } finally {
          await admin.from("linkedin_job_state").update({ lease_until: null }).eq("id", true);
        }
        return Response.json({ written, published });
      },
    },
  },
});
