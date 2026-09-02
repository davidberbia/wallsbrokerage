// Helpers partagés par les tâches planifiées (file d'envoi et rapports).
export const APP_URL = "https://project--b477caa1-d3f8-4736-97d0-bb610961a75f.lovable.app";

export async function getAdmin() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

/** Vérifie le jeton privé utilisé par les tâches planifiées. */
export async function authorizeCron(request: Request): Promise<Response | null> {
  const token = request.headers.get("x-cron-token");
  if (!token) return new Response("Unauthorized", { status: 401 });

  const admin = await getAdmin();
  const { data, error } = await admin
    .from("automation_config")
    .select("cron_token")
    .eq("id", true)
    .maybeSingle();

  if (error || !data || data.cron_token !== token) {
    return new Response("Unauthorized", { status: 401 });
  }
  return null;
}

export async function getRecapEmail(): Promise<string> {
  const admin = await getAdmin();
  const { data } = await admin
    .from("automation_config")
    .select("recap_email")
    .eq("id", true)
    .maybeSingle();
  return data?.recap_email ?? "d.berbia@wallsbroker.com";
}

export const fmtDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "Europe/Paris",
      })
    : "—";

export const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

export type ReportRow = {
  name: string;
  company: string | null;
  email: string | null;
  sent_at: string;
  opened_at: string | null;
};

/** Tableau HTML sobre, utilisable tel quel dans un mail Outlook. */
export function reportHtml(params: {
  title: string;
  intro: string;
  /** Affiche la colonne "Lecture" (false pour le tout premier récapitulatif d'envoi). */
  showOpened?: boolean;
  sections: { heading: string; rows: ReportRow[]; note?: string }[];
}): string {
  const showOpened = params.showOpened !== false;
  const colCount = showOpened ? 3 : 2;
  const sections = params.sections
    .map((section) => {
      const rows = section.rows
        .map(
          (r) => `<tr>
  <td style="padding:8px 10px;border-bottom:1px solid #e6e2db;">${escapeHtml(r.company || r.name)}</td>
  <td style="padding:8px 10px;border-bottom:1px solid #e6e2db;white-space:nowrap;">${fmtDateTime(r.sent_at)}</td>${
    showOpened
      ? `
  <td style="padding:8px 10px;border-bottom:1px solid #e6e2db;white-space:nowrap;color:${
    r.opened_at ? "#1f7a4d" : "#8a8378"
  };">${r.opened_at ? fmtDateTime(r.opened_at) : "non ouvert"}</td>`
      : ""
  }
</tr>`,
        )
        .join("");

      return `<h3 style="font-size:15px;margin:26px 0 8px;color:#16212f;">${escapeHtml(section.heading)}</h3>
${section.note ? `<p style="margin:0 0 8px;color:#8a8378;font-size:13px;">${escapeHtml(section.note)}</p>` : ""}
<table style="border-collapse:collapse;width:100%;font-size:13px;color:#16212f;">
  <thead>
    <tr style="text-align:left;background:#f6f3ee;">
      <th style="padding:8px 10px;">Société</th>
      <th style="padding:8px 10px;">Envoi</th>${showOpened ? `
      <th style="padding:8px 10px;">Lecture</th>` : ""}
    </tr>
  </thead>
  <tbody>${rows || `<tr><td colspan="${colCount}" style="padding:12px 10px;color:#8a8378;">Aucun envoi.</td></tr>`}</tbody>
</table>`;
    })
    .join("");

  return `<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:24px;max-width:760px;">
  <p style="letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#a4763c;margin:0;">Walls Brokerage</p>
  <h2 style="margin:6px 0 10px;font-size:20px;color:#16212f;">${escapeHtml(params.title)}</h2>
  <p style="margin:0;color:#5d574e;font-size:14px;">${escapeHtml(params.intro)}</p>
  ${sections}
  <p style="margin-top:28px;color:#8a8378;font-size:12px;">Rapport généré automatiquement par le CRM Walls Brokerage. Les heures sont en heure de Paris.</p>
</div>`;
}
