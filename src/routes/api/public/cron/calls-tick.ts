import { createFileRoute } from "@tanstack/react-router";
import { authorizeCron, getAdmin } from "@/lib/automation.server";
import { geminiStatus } from "@/lib/aiscan.server";
import { BudgetReachedError } from "@/lib/gemini.server";

const TIME_BUDGET_MS = 150 * 1000;

export const Route = createFileRoute("/api/public/cron/calls-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;
        // Toutes les 2 heures entre 8h et 20h (heure de Paris), été comme hiver.
        if (new URL(request.url).searchParams.get("force") !== "1") {
          const h = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" }));
          if (h < 8 || h > 20 || h % 2 !== 0) return Response.json({ ok: true, skipped: "hors créneau" });
        }
        const { discoverCalls, processCall } = await import("@/lib/calls.server");
        const admin = await getAdmin();
        const started = Date.now();
        let added = 0;
        let done = 0;
        try {
          added = await discoverCalls();
          // Remet en file les appels restés bloqués « en cours » (tâche interrompue).
          await admin.from("call_recordings").update({ status: "en attente" }).eq("status", "en cours").lt("updated_at", new Date(started - 10 * 60 * 1000).toISOString());
          const { data: todo } = await admin.from("call_recordings").select("id").eq("status", "en attente").order("called_at", { ascending: true }).limit(20);
          for (const t of todo ?? []) {
            if (Date.now() - started > TIME_BUDGET_MS) break;
            try {
              await processCall(t.id);
              done++;
            } catch (e) {
              const code = geminiStatus(e);
              const msg = (e instanceof Error ? e.message : String(e)).slice(0, 400);
              const blocking = e instanceof BudgetReachedError || code === 402 || code === 403 || code === 429 || (code !== null && code >= 500);
              await admin
                .from("call_recordings")
                .update(
                  blocking
                    ? { status: "en attente", error: code === 402 ? "Crédit Google Gemini épuisé : l'appel sera analysé dès la recharge." : msg }
                    : { status: "erreur", error: msg },
                )
                .eq("id", t.id);
              if (blocking) break; // on réessaie au prochain passage, sans insister
            }
          }
          return Response.json({ ok: true, added, done });
        } catch (e) {
          return Response.json({ ok: false, added, done, error: e instanceof Error ? e.message : String(e) });
        }
      },
    },
  },
});
