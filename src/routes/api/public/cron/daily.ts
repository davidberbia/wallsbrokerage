import { createFileRoute } from "@tanstack/react-router";
import {
  APP_URL,
  authorizeCron,
  getAdmin,
  getRecapEmail,
  reportHtml,
  type ReportRow,
} from "@/lib/automation.server";
import { sendBrevoMail } from "@/lib/brevo.server";

type SendRow = {
  sent_at: string;
  opened_at: string | null;
  email_to: string | null;
  investors: { full_name: string; company: string | null } | null;
  prospect_contacts: {
    full_name: string;
    prospect_companies: { name: string } | null;
  } | null;
};

const SEND_SELECT =
  "sent_at, opened_at, email_to, investors(full_name, company), prospect_contacts(full_name, prospect_companies(name))";

const toRows = (sends: SendRow[]): ReportRow[] =>
  sends.map((s) => ({
    name: s.investors?.full_name ?? s.prospect_contacts?.full_name ?? s.email_to ?? "—",
    company:
      s.investors?.company ?? s.prospect_contacts?.prospect_companies?.name ?? null,
    email: s.email_to,
    sent_at: s.sent_at,
    opened_at: s.opened_at,
  }));

// Passage quotidien : rapport marketing à J+7, récap du lundi,
// clôture des commercialisations à 2 mois et relance des profils à 6 mois.
export const Route = createFileRoute("/api/public/cron/daily")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;

        const admin = await getAdmin();
        const now = new Date();
        const recapEmail = await getRecapEmail();
        const isMonday = now.getUTCDay() === 1;

        // 1. Clôture automatique au bout de 2 mois.
        await admin
          .from("campaigns")
          .update({ status: "terminée" })
          .eq("status", "active")
          .lt("ends_at", now.toISOString());

        const { data: campaigns } = await admin
          .from("campaigns")
          .select(
            "id, started_at, ends_at, status, report_j7_sent_at, assets(title, reference, city)",
          )
          .eq("status", "active");

        const active = campaigns ?? [];

        // 2. Rapport marketing à J+7, transférable au vendeur.
        for (const campaign of active) {
          const age = now.getTime() - new Date(campaign.started_at).getTime();
          if (campaign.report_j7_sent_at || age < 7 * 24 * 3600 * 1000) continue;

          const { data: sends } = await admin
            .from("brochure_sends")
            .select(SEND_SELECT)
            .eq("campaign_id", campaign.id)
            .order("sent_at", { ascending: true });

          const rows = toRows((sends ?? []) as unknown as SendRow[]);
          const opened = rows.filter((r) => r.opened_at);
          const asset = campaign.assets as { title: string; city: string | null } | null;
          const label = asset ? `${asset.title}${asset.city ? ` — ${asset.city}` : ""}` : "Actif";

          await sendBrevoMail({
            to: recapEmail,
            subject: `Marketing Report J+7 — ${label}`,
            html: reportHtml({
              title: `Marketing Report — ${label}`,
              intro: `Bilan à 7 jours de la commercialisation : ${rows.length} investisseurs ciblés, ${opened.length} ouverture(s) de la brochure. Ce rapport peut être transféré tel quel au vendeur.`,
              sections: [
                {
                  heading: "Brochures ouvertes",
                  rows: opened,
                  note: "Investisseurs ayant ouvert la brochure, avec la date et l'heure de lecture.",
                },
                {
                  heading: "Diffusion complète",
                  rows,
                  note: "Ensemble des investisseurs destinataires de la brochure.",
                },
              ],
            }),
          });

          await admin
            .from("campaigns")
            .update({ report_j7_sent_at: now.toISOString() })
            .eq("id", campaign.id);
        }

        // 3. Récap du lundi : toutes les commercialisations en cours.
        if (isMonday && active.length > 0) {
          const sections = [] as { heading: string; rows: ReportRow[]; note?: string }[];
          for (const campaign of active) {
            const { data: sends } = await admin
              .from("brochure_sends")
              .select(SEND_SELECT)
              .eq("campaign_id", campaign.id)
              .order("sent_at", { ascending: true });
            const rows = toRows((sends ?? []) as unknown as SendRow[]);
            const opened = rows
              .filter((r) => r.opened_at)
              .sort(
                (a, b) =>
                  new Date(b.opened_at as string).getTime() -
                  new Date(a.opened_at as string).getTime(),
              );
            const asset = campaign.assets as { title: string; city: string | null } | null;
            const label = asset ? `${asset.title}${asset.city ? ` — ${asset.city}` : ""}` : "Actif";
            sections.push({
              heading: `${label} — qui a ouvert la brochure`,
              rows: opened,
              note: `${opened.length} ouverture(s) sur ${rows.length} envoi(s) — investisseurs ayant ouvert la brochure, avec la date et l'heure de lecture.`,
            });
            sections.push({
              heading: `${label} — diffusion complète`,
              rows,
              note: `Ensemble des destinataires — commercialisation clôturée le ${new Date(
                campaign.ends_at,
              ).toLocaleDateString("fr-FR")}.`,
            });
          }

          await sendBrevoMail({
            to: recapEmail,
            subject: `Récap hebdomadaire — ${active.length} commercialisation(s) en cours`,
            html: reportHtml({
              title: "Récap hebdomadaire des commercialisations",
              intro:
                "Mise à jour des confirmations de lecture pour toutes les commercialisations en cours, avec date et heure d'envoi et d'ouverture.",
              sections,
            }),
          });

          await admin
            .from("campaigns")
            .update({ last_weekly_report_at: now.toISOString() })
            .in(
              "id",
              active.map((c) => c.id),
            );
        }

        // 4. Relance de mise à jour de profil à 6 mois (mise en file, 1 mail/minute).
        const { data: due } = await admin
          .from("investors")
          .select("id, full_name, first_name, email, next_review_at")
          .not("email", "is", null)
          .lte("next_review_at", now.toISOString())
          .limit(50);

        for (const investor of due ?? []) {
          if (!investor.email) continue;
          const prenom = investor.first_name || investor.full_name.split(" ")[0] || "";
          await admin.from("email_queue").insert({
            kind: "relance-profil",
            to_email: investor.email,
            to_name: investor.full_name,
            subject: "Vos critères d'investissement sont-ils toujours d'actualité ?",
            body_html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#16212f;font-size:14px;line-height:1.6;">
  <p>Bonjour ${prenom},</p>
  <p>Cela fait six mois que nous n'avons pas actualisé votre profil investisseur. Pour continuer à ne recevoir que des opportunités réellement pertinentes, pouvez-vous vérifier vos critères (budget, classe d'actif, stratégie, région, rendement) ?</p>
  <p><a href="${APP_URL}/mon-profil" style="background:#16212f;color:#ffffff;padding:11px 18px;border-radius:6px;text-decoration:none;display:inline-block;">Mettre à jour mon profil</a></p>
  <p>Bien à vous,<br>David Berbia — Walls Brokerage</p>
</div>`,
          });
          await admin
            .from("investors")
            .update({
              next_review_at: new Date(now.getTime() + 182 * 24 * 3600 * 1000).toISOString(),
            })
            .eq("id", investor.id);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
