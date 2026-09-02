import { createFileRoute } from "@tanstack/react-router";
import {
  authorizeCron,
  getAdmin,
  getRecapEmail,
  reportHtml,
  type ReportRow,
} from "@/lib/automation.server";
import { MAX_ATTACHMENT_BYTES, sendOutlookMail } from "@/lib/outlook.server";

// Envoie UN seul mail par exécution : la tâche tourne toutes les minutes,
// ce qui donne exactement 1 mail par minute depuis la boîte Outlook du courtier.
export const Route = createFileRoute("/api/public/cron/email-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;

        const admin = await getAdmin();
        const { data: next, error } = await admin
          .from("email_queue")
          .select("*")
          .eq("status", "en attente")
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(1)
          .maybeSingle();

        if (error) {
          console.error("queue read error", error);
          return Response.json({ ok: false }, { status: 500 });
        }
        if (!next) return Response.json({ ok: true, sent: 0 });

        // Verrou simple : on repasse la ligne en "en cours" avant l'appel réseau.
        const { data: locked } = await admin
          .from("email_queue")
          .update({ status: "en cours", attempts: next.attempts + 1 })
          .eq("id", next.id)
          .eq("status", "en attente")
          .select("id")
          .maybeSingle();
        if (!locked) return Response.json({ ok: true, sent: 0 });

        let attachment = null as null | {
          name: string;
          contentType: string;
          bytes: Uint8Array;
        };
        if (next.attachment_path) {
          const file = await admin.storage.from("brochures").download(next.attachment_path);
          if (file.data) {
            const bytes = new Uint8Array(await file.data.arrayBuffer());
            if (bytes.byteLength <= MAX_ATTACHMENT_BYTES) {
              attachment = {
                name: next.attachment_name ?? "brochure.pdf",
                contentType: "application/pdf",
                bytes,
              };
            } else {
              console.warn("brochure trop lourde pour une pièce jointe", next.attachment_path);
            }
          }
        }

        const sentAt = new Date().toISOString();
        try {
          await sendOutlookMail({
            to: next.to_email,
            toName: next.to_name,
            subject: next.subject,
            html: next.body_html,
            attachment,
          });
          await admin
            .from("email_queue")
            .update({ status: "envoyé", sent_at: sentAt, error: null })
            .eq("id", next.id);
          if (next.send_id) {
            await admin
              .from("brochure_sends")
              .update({ status: "envoyé", sent_at: sentAt, delivered_at: sentAt })
              .eq("id", next.send_id);
          }
        } catch (err) {
          const message = err instanceof Error ? err.message : "Erreur inconnue";
          const failed = next.attempts + 1 >= 3;
          await admin
            .from("email_queue")
            .update({ status: failed ? "erreur" : "en attente", error: message })
            .eq("id", next.id);
          if (failed && next.send_id) {
            await admin
              .from("brochure_sends")
              .update({ status: "erreur", error: message })
              .eq("id", next.send_id);
          }
        }

        // File terminée pour cette commercialisation → récapitulatif immédiat.
        if (next.campaign_id) {
          const { count } = await admin
            .from("email_queue")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", next.campaign_id)
            .in("status", ["en attente", "en cours"]);
          if ((count ?? 0) === 0) await sendCampaignRecap(next.campaign_id);
        }

        return Response.json({ ok: true, sent: 1 });
      },
    },
  },
});

async function sendCampaignRecap(campaignId: string) {
  const admin = await getAdmin();
  const { data: campaign } = await admin
    .from("campaigns")
    .select("id, subject, recap_sent_at, assets(title, reference, city)")
    .eq("id", campaignId)
    .maybeSingle();
  if (!campaign || campaign.recap_sent_at) return;

  const { data: sends } = await admin
    .from("brochure_sends")
    .select("sent_at, opened_at, email_to, investors(full_name, company)")
    .eq("campaign_id", campaignId)
    .order("sent_at", { ascending: true });

  const rows: ReportRow[] = (sends ?? []).map((s) => ({
    name: (s.investors as { full_name: string } | null)?.full_name ?? "—",
    company: (s.investors as { company: string | null } | null)?.company ?? null,
    email: s.email_to,
    sent_at: s.sent_at,
    opened_at: s.opened_at,
  }));

  const asset = campaign.assets as { title: string; city: string | null } | null;
  const label = asset ? `${asset.title}${asset.city ? ` — ${asset.city}` : ""}` : "Actif";

  await sendOutlookMail({
    to: await getRecapEmail(),
    subject: `Récapitulatif d'envoi — ${label} (${rows.length} investisseurs)`,
    html: reportHtml({
      title: `Récapitulatif d'envoi — ${label}`,
      intro: `Tous les mails de cette commercialisation ont été envoyés. Voici la liste complète des investisseurs destinataires, avec la date et l'heure d'envoi.`,
      showOpened: false,
      sections: [{ heading: "Investisseurs destinataires", rows }],
    }),
  });

  await admin
    .from("campaigns")
    .update({ recap_sent_at: new Date().toISOString() })
    .eq("id", campaignId);
}
