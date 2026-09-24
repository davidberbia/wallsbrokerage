import { createFileRoute } from "@tanstack/react-router";
import { authorizeCron, getAdmin } from "@/lib/automation.server";
import { graphGet, type GraphAddress } from "@/lib/mailscan.server";

// Synchronisation continue des emails (reçus + envoyés) depuis le 1er janvier 2026,
// via les requêtes delta de Microsoft Graph. Rattache chaque email à un dossier.
const SINCE = "2026-01-01T00:00:00Z";
const PAGES_PER_FOLDER = 8;
const LEASE_MS = 4 * 60 * 1000;
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
  )}&$select=id,receivedDateTime,subject,bodyPreview,webLink,from,toRecipients,ccRecipients`;

const lower = (a?: string | null) => (a ?? "").trim().toLowerCase();

export const Route = createFileRoute("/api/public/cron/mailsync-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;
        const admin = await getAdmin();

        const [{ data: contacts }, { data: deals }] = await Promise.all([
          admin.from("deal_contacts").select("deal_id,email"),
          admin.from("deals").select("id,name"),
        ]);
        const byEmail = new Map<string, string>();
        for (const c of contacts ?? []) byEmail.set(lower(c.email), c.deal_id);
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
                  const recips = [...(m.toRecipients ?? []), ...(m.ccRecipients ?? [])]
                    .map((r) => r.emailAddress)
                    .filter(Boolean) as GraphAddress[];
                  const from = lower(m.from?.emailAddress?.address);
                  const participants = Array.from(
                    new Set([from, ...recips.map((r) => lower(r.address))].filter(Boolean)),
                  );
                  let deal: string | null = null;
                  for (const p of participants) {
                    const d = byEmail.get(p);
                    if (d) {
                      deal = d;
                      break;
                    }
                  }
                  const subj = (m.subject ?? "").toLowerCase();
                  if (!deal && subj) deal = named.find((n) => subj.includes(n.key))?.id ?? null;
                  if (deal) touched.add(deal);
                  return {
                    graph_id: m.id,
                    folder,
                    received_at: m.receivedDateTime ?? null,
                    subject: m.subject ?? null,
                    from_email: from || null,
                    from_name: m.from?.emailAddress?.name ?? null,
                    participants,
                    to_display: recips
                      .map((r) => r.name || r.address)
                      .filter(Boolean)
                      .join(", ")
                      .slice(0, 500),
                    preview: (m.bodyPreview ?? "").slice(0, 400),
                    web_link: m.webLink ?? null,
                    deal_id: deal,
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
                for (const r of rows) if (keep.get(r.graph_id)) r.deal_id = keep.get(r.graph_id)!;
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
        return Response.json({ ok: true, ...report });
      },
    },
  },
});
