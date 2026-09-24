import { createFileRoute } from "@tanstack/react-router";
import { authorizeCron, getAdmin } from "@/lib/automation.server";
import {
  BudgetReachedError,
  MAX_BYTES,
  MIN_BYTES,
  PAGE_SIZE,
  analyseAttachment,
  analyseBodies,
  geminiStatus,
  graphGet,
  saveExtraction,
  sha256,
} from "@/lib/aiscan.server";

const LEASE_MS = 4 * 60 * 1000;
const TIME_BUDGET_MS = 150 * 1000;
const FOLDERS = ["inbox", "sentitems"] as const;
const TEXT_HEADER = { Prefer: 'outlook.body-content-type="text"' };

type Msg = {
  id: string;
  subject?: string | null;
  receivedDateTime?: string;
  hasAttachments?: boolean;
  from?: { emailAddress?: { address?: string | null; name?: string | null } } | null;
  body?: { content?: string | null } | null;
};
type AttMeta = { id: string; name?: string; contentType?: string; size?: number; isInline?: boolean; "@odata.type"?: string };

const firstPage = (folder: string) =>
  `/v1.0/me/mailFolders/${folder}/messages?$top=${PAGE_SIZE}&$orderby=receivedDateTime asc&$select=id,subject,receivedDateTime,hasAttachments,from,body`;

const cleanBody = (s: string) =>
  s
    .split(/\n(?:De ?:|From ?:|-----Original|Le .{5,80} a écrit)/)[0]!
    .replace(/\s+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .slice(0, 2500);

export const Route = createFileRoute("/api/public/cron/aiscan-tick")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;
        const admin = await getAdmin();
        const { data: st } = await admin.from("ai_scan_state").select("*").eq("id", true).maybeSingle();
        if (!st || st.status !== "en cours") {
          await admin.rpc("aiscan_stop_internal");
          return Response.json({ ok: true, idle: true });
        }
        const started = Date.now();
        if (st.lease_until && new Date(st.lease_until).getTime() > started) {
          return Response.json({ ok: true, busy: true });
        }
        await admin.from("ai_scan_state").update({ lease_until: new Date(started + LEASE_MS).toISOString() }).eq("id", true);

        const s = { ...st };
        const persist = async (extra: Record<string, unknown> = {}) => {
          await admin
            .from("ai_scan_state")
            .update({
              folder: s.folder,
              current_page: s.current_page,
              page_offset: s.page_offset,
              messages_done: s.messages_done,
              attachments_done: s.attachments_done,
              attachments_dup: s.attachments_dup,
              attachments_skipped: s.attachments_skipped,
              contacts_found: s.contacts_found,
              comparables_found: s.comparables_found,
              news_found: s.news_found,
              last_mail_at: s.last_mail_at,
              ...extra,
            })
            .eq("id", true);
        };
        const add = (r: { contacts: number; comparables: number; news: number }) => {
          s.contacts_found += r.contacts;
          s.comparables_found += r.comparables;
          s.news_found += r.news;
        };

        try {
          while (Date.now() - started < TIME_BUDGET_MS) {
            const pageUrl = s.current_page ?? firstPage(s.folder);
            const page = await graphGet<{ value: Msg[]; "@odata.nextLink"?: string }>(pageUrl, TEXT_HEADER);
            const msgs = page.value ?? [];

            // 1) Texte des mails de la page, en un seul appel Gemini.
            if (s.page_offset === 0) {
              const mails = msgs
                .map((m) => ({
                  from: m.from?.emailAddress?.address ?? "",
                  subject: m.subject ?? "",
                  date: m.receivedDateTime ?? "",
                  text: cleanBody(m.body?.content ?? ""),
                }))
                .filter((m) => m.text.trim().length > 60);
              if (mails.length && msgs[0]) {
                const ex = await analyseBodies(mails);
                add(await saveExtraction(admin, ex, msgs[0].id, msgs[0].receivedDateTime ?? new Date().toISOString()));
              }
              s.page_offset = 1;
              await persist();
            }

            // 2) Pièces jointes, mail par mail.
            let outOfTime = false;
            for (let i = s.page_offset - 1; i < msgs.length; i++) {
              const m = msgs[i]!;
              const date = m.receivedDateTime ?? new Date().toISOString();
              if (m.hasAttachments) {
                const atts = await graphGet<{ value: AttMeta[] }>(
                  `/v1.0/me/messages/${m.id}/attachments?$select=id,name,contentType,size,isInline`,
                );
                for (const a of atts.value ?? []) {
                  if (Date.now() - started > TIME_BUDGET_MS) {
                    outOfTime = true;
                    break;
                  }
                  const size = a.size ?? 0;
                  const isFile = (a["@odata.type"] ?? "").includes("fileAttachment");
                  if (!isFile || size < MIN_BYTES || size > MAX_BYTES) {
                    s.attachments_skipped++;
                    continue;
                  }
                  const full = await graphGet<{ contentBytes?: string }>(`/v1.0/me/messages/${m.id}/attachments/${a.id}`);
                  if (!full.contentBytes) {
                    s.attachments_skipped++;
                    continue;
                  }
                  const bytes = Uint8Array.from(atob(full.contentBytes), (c) => c.charCodeAt(0));
                  const hash = await sha256(bytes);
                  const { data: seen } = await admin.from("mail_attachments_seen").select("id").eq("hash", hash).maybeSingle();
                  if (seen) {
                    s.attachments_dup++;
                    continue;
                  }
                  const name = a.name ?? "fichier";
                  const type = (a.contentType ?? "").toLowerCase();
                  let status = "lu";
                  let result: unknown = null;
                  let error: string | null = null;
                  try {
                    const ex = await analyseAttachment(name, type, full.contentBytes);
                    if (ex === "unsupported") status = "ignoré";
                    else {
                      result = ex;
                      add(await saveExtraction(admin, ex, m.id, date));
                    }
                  } catch (e) {
                    const code = geminiStatus(e);
                    if (e instanceof BudgetReachedError || code === 429 || code === 402 || (code !== null && code >= 500) || code === 403) throw e;
                    status = "erreur";
                    error = (e instanceof Error ? e.message : String(e)).slice(0, 400);
                  }
                  await admin.from("mail_attachments_seen").upsert(
                    { hash, name, content_type: type, size, first_graph_id: m.id, status, result: result as never, error },
                    { onConflict: "hash", ignoreDuplicates: true },
                  );
                  if (status === "lu") s.attachments_done++;
                  else s.attachments_skipped++;
                }
              }
              if (outOfTime) break;
              s.messages_done++;
              s.last_mail_at = date;
              s.page_offset = i + 2;
              await persist();
            }
            if (outOfTime) break;

            // 3) Page suivante, dossier suivant, ou fin.
            const next = page["@odata.nextLink"] ?? null;
            s.page_offset = 0;
            if (next) {
              s.current_page = next;
            } else {
              const idx = FOLDERS.indexOf(s.folder as (typeof FOLDERS)[number]);
              if (idx >= 0 && idx < FOLDERS.length - 1) {
                s.folder = FOLDERS[idx + 1]!;
                s.current_page = null;
              } else {
                await persist({ status: "terminé", lease_until: null, last_error: null });
                await admin.rpc("aiscan_stop_internal");
                return Response.json({ ok: true, done: true });
              }
            }
            await persist();
          }
          await persist({ lease_until: null, last_error: null });
          return Response.json({ ok: true, ...s });
        } catch (e) {
          const msg = (e instanceof Error ? e.message : String(e)).slice(0, 400);
          const code = geminiStatus(e);
          const hardStop = e instanceof BudgetReachedError || code === 402 || code === 403;
          await persist({ lease_until: null, last_error: msg, ...(hardStop ? { status: "en pause" } : {}) });
          if (hardStop) await admin.rpc("aiscan_stop_internal");
          return Response.json({ ok: false, error: msg });
        }
      },
    },
  },
});
