import { createFileRoute } from "@tanstack/react-router";
import { APP_URL, authorizeCron, getAdmin, getRecapEmail } from "@/lib/automation.server";
import { buildDigest } from "@/lib/digest.server";
import { sendBrevoMail } from "@/lib/brevo.server";

// Synthèse quotidienne à 9h05 (heure de Paris). Le cron appelle à 7h05 et 8h05 UTC ;
// seul l'appel qui tombe à 9h à Paris envoie (gère l'heure d'été / d'hiver).
export const Route = createFileRoute("/api/public/cron/daily-digest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;
        const force = new URL(request.url).searchParams.get("force") === "1";
        const parisHour = Number(
          new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" }),
        );
        if (!force && parisHour !== 9) return Response.json({ ok: true, skipped: "hors créneau" });

        const admin = await getAdmin();
        const day = new Date().toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
        const { data: existing } = await admin.from("digest_reports").select("id").eq("day", day).maybeSingle();
        if (existing && !force) return Response.json({ ok: true, skipped: "déjà envoyé" });

        const token = crypto.randomUUID();
        const digest = await buildDigest(`${APP_URL}/synthese/${token}`);
        await admin
          .from("digest_reports")
          .upsert({ day, token, html: digest.html, speech: digest.speech }, { onConflict: "day" });

        // Expéditeur distinct de la boîte de David : Outlook n'affiche plus « Note pour vous-même ».
        await sendBrevoMail({
          to: await getRecapEmail(),
          sender: { email: "synthese@wallsbroker.com", name: "RESUME JOURNALIER D'ACTIVITE" },
          subject: `🟢 RESUME JOURNALIER D'ACTIVITE — ${digest.counts.unanswered} sans réponse, ${digest.counts.relaunch} relances, ${digest.counts.calls} appels`,
          html: digest.html,
        });
        if (digest.reminders.length)
          await admin.from("followup_reminders").upsert(digest.reminders, { onConflict: "mail_id,tier", ignoreDuplicates: true });

        return Response.json({ ok: true, ...digest.counts });
      },
    },
  },
});
