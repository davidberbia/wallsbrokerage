import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { authorizeCron, getAdmin } from "@/lib/automation.server";
import { graphGet, type GraphAddress } from "@/lib/mailscan.server";
import { extractFromText } from "@/lib/mail-extract";
import { PERSONAL_EMAIL_DOMAINS } from "@/lib/email-domains";
import { runSourcing } from "@/lib/sourcing.server";
import { runDocRequests } from "@/lib/docrequests.server";
import { runAttachments } from "@/lib/attachments.server";
import { runLeadFollowups } from "@/lib/lead-followups.server";
import { runPigeSync } from "@/lib/pige-sync.server";

// Synchronisation continue des emails (reçus + envoyés) depuis le 1er janvier 2026,
// via les requêtes delta de Microsoft Graph. Rattache chaque email à un dossier.
const SINCE = "2026-01-01T00:00:00Z";
const PAGES_PER_FOLDER = 8;
const LEASE_MS = 4 * 60 * 1000;
// Envois synchronisés uniquement pour savoir si un mail a reçu une réponse (récap) :
// jamais rattachés à un dossier, jamais lus ni aspirés (pièces jointes).
const FOLDERS = ["inbox", "sentitems"] as const;

type DeltaMessage = {
  id: string;
  "@removed"?: unknown;
  receivedDateTime?: string;
  subject?: string | null;
  bodyPreview?: string | null;
  webLink?: string | null;
  from?: { emailAddress?: GraphAddress } | null;
  toRecipients?: { emailAddress?: GraphAddress }[] | null;
  ccRecipients?: { emailAddress?: GraphAddress }[] | null;
};
type DeltaPage = { value: DeltaMessage[]; "@odata.nextLink"?: string; "@odata.deltaLink"?: string };

const initialUrl = (folder: string) =>
  `/v1.0/me/mailFolders/${folder}/messages/delta?$filter=${encodeURIComponent(
    `receivedDateTime ge ${SINCE}`,
  )}&$select=id,receivedDateTime,subject,bodyPreview,webLink,from`;

const lower = (a?: string | null) => (a ?? "").trim().toLowerCase();

export const Route = createFileRoute("/api/public/cron/mailsync-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Ancien jeton (planning de jour) ou planning géré (passage de minuit).
        const denied = request.headers.get("x-cron-token") ? await authorizeCron(request) : await authenticateCronRequest(request);
        if (denied) return denied;
        // Toutes les 2 heures de 8h à 20h + une fois à minuit (heure de Paris), été comme hiver.
        if (new URL(request.url).searchParams.get("force") !== "1") {
          const h = Number(new Date().toLocaleString("en-GB", { hour: "2-digit", hour12: false, timeZone: "Europe/Paris" })) % 24;
          if (!(h === 0 || (h >= 8 && h <= 20 && h % 2 === 0))) return Response.json({ ok: true, skipped: "hors créneau" });
        }
        const admin = await getAdmin();

        // Rattachement automatique mails → affaires désactivé (affaires gérées à la main).
        const contacts: { deal_id: string; email: string }[] = [];
        const deals: { id: string; name: string }[] = [];
        const byEmail = new Map<string, string>();
        const byDomain = new Map<string, string>();
        const personal = new Set<string>(PERSONAL_EMAIL_DOMAINS);
        for (const c of contacts ?? []) {
          const em = lower(c.email);
          byEmail.set(em, c.deal_id);
          const dom = em.split("@")[1];
          // Rattachement par domaine : uniquement pour les domaines professionnels,
          // et seulement si un seul dossier utilise ce domaine (sinon ambigu).
          if (dom && !personal.has(dom)) {
            const prev = byDomain.get(dom);
            if (prev === undefined) byDomain.set(dom, c.deal_id);
            else if (prev !== c.deal_id) byDomain.set(dom, "AMBIGU");
          }
        }
        const named = (deals ?? [])
          .filter((d) => d.name.trim().length >= 4)
          .map((d) => ({ id: d.id, key: d.name.trim().toLowerCase() }));

        const report: Record<string, number | string> = {};
        const touched = new Set<string>();

        for (const folder of FOLDERS) {
          const { data: st } = await admin
            .from("mail_sync_state")
            .select("*")
            .eq("folder", folder)
            .maybeSingle();
          if (!st) continue;
          const now = Date.now();
          if (st.lease_until && new Date(st.lease_until).getTime() > now) {
            report[folder] = "occupé";
            continue;
          }
          await admin
            .from("mail_sync_state")
            .update({ lease_until: new Date(now + LEASE_MS).toISOString() })
            .eq("folder", folder);

          let url: string = st.next_link ?? st.delta_link ?? initialUrl(folder);
          let nextLink: string | null = null;
          let deltaLink: string | null = st.delta_link;
          let count = 0;
          let error: string | null = null;
          try {
            for (let i = 0; i < PAGES_PER_FOLDER; i += 1) {
              const page = await graphGet<DeltaPage>(url, { Prefer: "odata.maxpagesize=100" });
              const rows = page.value
                .filter((m) => !m["@removed"])
                .map((m) => {
                  // Rattachement aux dossiers : messages reçus seulement, par l'expéditeur et l'objet.
                  // Les destinataires ne servent qu'à repérer les réponses envoyées.
                  const from = lower(m.from?.emailAddress?.address);
                  const recips = folder === "sentitems"
                    ? [...(m.toRecipients ?? []), ...(m.ccRecipients ?? [])].map((r) => lower(r.emailAddress?.address)).filter(Boolean)
                    : [];
                  const participants = Array.from(new Set([from, ...recips].filter(Boolean)));
                  const linkKeys = folder === "inbox" && from ? [from] : [];
                  let deal: string | null = null;
                  for (const p of linkKeys) {
                    const d = byEmail.get(p);
                    if (d) {
                      deal = d;
                      break;
                    }
                  }
                  if (!deal) {
                    for (const p of linkKeys) {
                      const dom = p.split("@")[1];
                      const d = dom ? byDomain.get(dom) : undefined;
                      if (d && d !== "AMBIGU") {
                        deal = d;
                        break;
                      }
                    }
                  }
                  const subj = (m.subject ?? "").toLowerCase();
                  if (!deal && subj && folder === "inbox") deal = named.find((n) => subj.includes(n.key))?.id ?? null;
                  if (deal) touched.add(deal);
                  const extracted = extractFromText(m.subject ?? null, m.bodyPreview ?? null);
                  return {
                    graph_id: m.id,
                    folder,
                    received_at: m.receivedDateTime ?? null,
                    subject: m.subject ?? null,
                    from_email: from || null,
                    from_name: m.from?.emailAddress?.name ?? null,
                    participants,
                    to_display: null,
                    preview: (m.bodyPreview ?? "").slice(0, 400),
                    web_link: m.webLink ?? null,
                    deal_id: deal,
                    extracted,
                  };
                });
              if (rows.length) {
                // Ne jamais écraser un rattachement manuel existant.
                const ids = rows.map((r) => r.graph_id);
                const { data: existing } = await admin
                  .from("mail_messages")
                  .select("graph_id,deal_id")
                  .in("graph_id", ids);
                const keep = new Map((existing ?? []).map((e) => [e.graph_id, e.deal_id]));
                for (const r of rows) if (folder === "inbox" && keep.get(r.graph_id)) r.deal_id = keep.get(r.graph_id)!;
                const { error: upErr } = await admin
                  .from("mail_messages")
                  .upsert(rows, { onConflict: "graph_id" });
                if (upErr) throw new Error(upErr.message);
                count += rows.length;
              }
              if (page["@odata.nextLink"]) {
                url = page["@odata.nextLink"];
                nextLink = url;
              } else {
                nextLink = null;
                deltaLink = page["@odata.deltaLink"] ?? deltaLink;
                break;
              }
            }
          } catch (e) {
            error = e instanceof Error ? e.message : String(e);
          }
          await admin
            .from("mail_sync_state")
            .update({
              next_link: error ? st.next_link : nextLink,
              delta_link: deltaLink,
              lease_until: null,
              last_error: error,
              last_sync_at: new Date().toISOString(),
              messages_synced: st.messages_synced + count,
            })
            .eq("folder", folder);
          report[folder] = error ? `erreur: ${error.slice(0, 120)}` : count;
        }

        // Reprise progressive : extrait les infos des emails synchronisés avant
        // l'ajout de l'extraction (1 000 par passage, sans coût).
        const { data: backlog } = await admin
          .from("mail_messages")
          .select("id,subject,preview")
          .eq("extracted", "{}")
          .limit(1000);
        let backfilled = 0;
        for (const m of backlog ?? []) {
          const extracted = extractFromText(m.subject ?? null, m.preview ?? null);
          const { error: bErr } = await admin
            .from("mail_messages")
            .update({ extracted })
            .eq("id", m.id);
          if (!bErr) backfilled += 1;
        }
        if (backfilled) report["backfill"] = backfilled;

        for (const id of touched) {
          const { data: last } = await admin
            .from("mail_messages")
            .select("received_at")
            .eq("deal_id", id)
            .order("received_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          if (last?.received_at)
            await admin.from("deals").update({ last_activity_at: last.received_at }).eq("id", id);
        }
        // Sourcing newsletters / PDF (par règles, sans IA), borné par passage.
        try {
          Object.assign(report, await runSourcing());
        } catch (e) {
          report["sourcing_erreur"] = (e instanceof Error ? e.message : String(e)).slice(0, 200);
        }
        // Assistant IA : demandes de documents des investisseurs (brouillons à valider).
        Object.assign(report, await runDocRequests());
        // Pièces jointes → actifs : rangement et pré-remplissage automatiques.
        try {
          Object.assign(report, await runAttachments());
        } catch (e) {
          report["pj_erreur"] = (e instanceof Error ? e.message : String(e)).slice(0, 200);
        }
        try { Object.assign(report, await runLeadFollowups()); }
        catch (e) { report["lead_relance_erreur"] = (e instanceof Error ? e.message : String(e)).slice(0, 200); }
        try { Object.assign(report, await runPigeSync()); }
        catch (e) { report["pige_erreur"] = (e instanceof Error ? e.message : String(e)).slice(0, 200); }
        try { const { syncMandateSignatures } = await import("@/lib/docusign.server"); Object.assign(report, { mandats_maj: (await syncMandateSignatures(await getAdmin())).updated }); }
        catch (e) { report["mandats_erreur"] = (e instanceof Error ? e.message : String(e)).slice(0, 200); }
        try { const { syncAgentContracts } = await import("@/lib/agent-access.server"); const r = await syncAgentContracts(await getAdmin()); Object.assign(report, { agents_maj: r.updated, agents_invites: r.invited }); }
        catch (e) { report["agents_erreur"] = (e instanceof Error ? e.message : String(e)).slice(0, 200); }
        return Response.json({ ok: true, ...report });
      },
    },
  },
});
