import { createFileRoute } from "@tanstack/react-router";
import {
  authorizeCron,
  getAdmin,
  getRecapEmail,
  reportHtml,
  type ReportRow,
} from "@/lib/automation.server";
import { sendBrevoMail } from "@/lib/brevo.server";

// La file est vidée par Brevo : aucune limitation artificielle de volume,
// on traite simplement un lot raisonnable à chaque passage (toutes les minutes).
const BATCH_SIZE = 25;
// Durée de validité du lien de pièce jointe téléchargé côté serveur.
const ATTACHMENT_URL_TTL_SECONDS = 60 * 60 * 24 * 7;

export const Route = createFileRoute("/api/public/cron/email-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;

        const admin = await getAdmin();
        const { data: batch, error } = await admin
          .from("email_queue")
          .select("*")
          .eq("status", "en attente")
          .lte("scheduled_at", new Date().toISOString())
          .order("scheduled_at", { ascending: true })
          .limit(BATCH_SIZE);

        if (error) {
          console.error("queue read error", error);
          return Response.json({ ok: false }, { status: 500 });
        }
        if (!batch || batch.length === 0) return Response.json({ ok: true, sent: 0 });

        const campaignIds = new Set<string>();
        let sent = 0;

        for (const next of batch) {
          // Verrou simple : on repasse la ligne en "en cours" avant l'appel réseau.
          const { data: locked } = await admin
            .from("email_queue")
            .update({ status: "en cours", attempts: next.attempts + 1 })
            .eq("id", next.id)
            .eq("status", "en attente")
            .select("id")
            .maybeSingle();
          if (!locked) continue;

          let attachment: { name: string; url: string } | null = null;
          if (next.attachment_path) {
            const signed = await admin.storage
              .from("brochures")
              .createSignedUrl(next.attachment_path, ATTACHMENT_URL_TTL_SECONDS);
            if (signed.data?.signedUrl) {
              attachment = {
                name: next.attachment_name ?? "brochure.pdf",
                url: signed.data.signedUrl,
              };
            } else {
              console.warn("lien de brochure indisponible", next.attachment_path);
            }
          }

          const sentAt = new Date().toISOString();
          try {
            const result = await sendBrevoMail({
              to: next.to_email,
              toName: next.to_name,
              subject: next.subject,
              html: next.body_html,
              attachment,
            });
            sent += 1;
            await admin
              .from("email_queue")
              .update({ status: "envoyé", sent_at: sentAt, error: null })
              .eq("id", next.id);
            if (next.send_id) {
              await admin
                .from("brochure_sends")
                .update({
                  status: "envoyé",
                  sent_at: sentAt,
                  delivered_at: sentAt,
                  provider: "brevo",
                  provider_message_id: result.messageId,
                  provider_status: "envoyé",
                })
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
                .update({ status: "erreur", error: message, provider: "brevo" })
                .eq("id", next.send_id);
            }
          }

          if (next.campaign_id) campaignIds.add(next.campaign_id);
        }

        // File terminée pour une commercialisation → récapitulatif immédiat.
        for (const campaignId of campaignIds) {
          const { count } = await admin
            .from("email_queue")
            .select("id", { count: "exact", head: true })
            .eq("campaign_id", campaignId)
            .in("status", ["en attente", "en cours"]);
          if ((count ?? 0) === 0) await sendCampaignRecap(campaignId);
        }

        return Response.json({ ok: true, sent });
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
    .select("sent_at, opened_at, email_to, investors(full_name, company), prospect_contacts(full_name, prospect_companies(name))")
    .eq("campaign_id", campaignId)
    .order("sent_at", { ascending: true });

  const rows: ReportRow[] = (sends ?? []).map((s) => ({
    name:
      (s.investors as { full_name: string } | null)?.full_name ??
      (s.prospect_contacts as { full_name: string } | null)?.full_name ??
      s.email_to ??
      "—",
    company:
      (s.investors as { company: string | null } | null)?.company ??
      (s.prospect_contacts as { prospect_companies: { name: string } | null } | null)
        ?.prospect_companies?.name ??
      null,
    email: s.email_to,
    sent_at: s.sent_at,
    opened_at: s.opened_at,
  }));

  const asset = campaign.assets as { title: string; city: string | null } | null;
  const label = asset ? `${asset.title}${asset.city ? ` — ${asset.city}` : ""}` : "Actif";

  await sendBrevoMail({
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
