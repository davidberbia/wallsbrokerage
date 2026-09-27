// Cibles & honoraires : parcourt les emails 2026 déjà synchronisés (rattrapage puis nouveaux mails),
// sans rescraper la boîte. Pré-filtre par mots-clés pour limiter le coût IA.
import { createFileRoute } from "@tanstack/react-router";
import { authorizeCron, getAdmin } from "@/lib/automation.server";
import { BudgetReachedError, MAX_BYTES, MIN_BYTES, analyseAttachment, geminiStatus, graphGet, sha256 } from "@/lib/aiscan.server";
import { callGeminiJson } from "@/lib/gemini.server";
import { TARGETS_SYSTEM, saveTargets, type RawFee, type RawTarget } from "@/lib/targets.server";

const TIME_BUDGET_MS = 150 * 1000;
const LEASE_MS = 4 * 60 * 1000;
const KEYWORDS =
  /(teaser|avis de valeur|portefeuille|pr[ée]sentation|facture|honoraire|mandat|cession|[àa] vendre|off.?market|opportunit|brochure|[ée]tat locatif|dossier|investissement|murs|locaux|immeuble|commerce|retail|bureaux|entrep[oô]t|logistique|rendement|loyer|enedis|valorisation)/i;
const FILE_RE = /\.(pdf|xlsx|xlsm|xls|csv|pptx|docx)$/i;

type TF = { targets?: RawTarget[]; fees?: RawFee[] };
type AttMeta = { id: string; name?: string; contentType?: string; size?: number; "@odata.type"?: string };

export const Route = createFileRoute("/api/public/cron/targets-catchup")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authorizeCron(request);
        if (denied) return denied;
        const admin = await getAdmin();
        const { data: st } = await admin.from("target_catchup_state").select("*").eq("id", true).maybeSingle();
        if (!st || st.status === "en pause") return Response.json({ ok: true, paused: true });
        const started = Date.now();
        if (st.lease_until && new Date(st.lease_until).getTime() > started) return Response.json({ ok: true, busy: true });
        await admin.from("target_catchup_state").update({ lease_until: new Date(started + LEASE_MS).toISOString() }).eq("id", true);
        const s = { mails: st.mails_done, targets: st.targets_found, fees: st.fees_found };
        const persist = (extra: Record<string, unknown> = {}) =>
          admin
            .from("target_catchup_state")
            .update({ mails_done: s.mails, targets_found: s.targets, fees_found: s.fees, updated_at: new Date().toISOString(), ...extra })
            .eq("id", true);

        try {
          while (Date.now() - started < TIME_BUDGET_MS) {
            const { data: batch } = await admin
              .from("mail_messages")
              .select("id, graph_id, folder, subject, preview, received_at, from_email")
              .gte("received_at", "2026-01-01")
              .is("targets_checked_at", null)
              .order("received_at", { ascending: false })
              .limit(40);
            if (!batch?.length) {
              await persist({ status: "à jour", lease_until: null, last_error: null });
              return Response.json({ ok: true, done: true, ...s });
            }
            const skip = batch.filter((m) => !KEYWORDS.test(`${m.subject ?? ""} ${m.preview ?? ""}`)).map((m) => m.id);
            if (skip.length) await admin.from("mail_messages").update({ targets_checked_at: new Date().toISOString() }).in("id", skip);
            const todo = batch.filter((m) => !skip.includes(m.id));
            for (const m of todo) {
              if (Date.now() - started > TIME_BUDGET_MS) break;
              const date = m.received_at ?? new Date().toISOString();
              const found: TF = { targets: [], fees: [] };
              // Corps du mail.
              let msg: { body?: { content?: string }; hasAttachments?: boolean } = {};
              try {
                msg = await graphGet(`/v1.0/me/messages/${m.graph_id}?$select=body,hasAttachments`, { Prefer: 'outlook.body-content-type="text"' });
              } catch {
                /* mail supprimé côté Outlook */
              }
              const body = (msg.body?.content ?? m.preview ?? "").slice(0, 6000);
              if (body.trim().length > 60) {
                const r = await callGeminiJson<TF>({
                  task: "cibles-mail",
                  system: TARGETS_SYSTEM,
                  prompt: `Mail ${m.folder === "sentitems" ? "ENVOYÉ par Wallsbroker" : "REÇU"} le ${date} — de ${m.from_email ?? "?"} — objet : ${m.subject ?? ""}\n\n${body}`,
                });
                found.targets!.push(...(r?.targets ?? []));
                found.fees!.push(...(r?.fees ?? []));
              }
              // Pièces jointes (chaque fichier lu une seule fois pour les cibles).
              if (msg.hasAttachments) {
                const atts = await graphGet<{ value: AttMeta[] }>(`/v1.0/me/messages/${m.graph_id}/attachments?$select=id,name,contentType,size`);
                for (const a of (atts.value ?? []).slice(0, 6)) {
                  const size = a.size ?? 0;
                  if (!(a["@odata.type"] ?? "").includes("fileAttachment") || size < MIN_BYTES || size > MAX_BYTES || !FILE_RE.test(a.name ?? "")) continue;
                  const full = await graphGet<{ contentBytes?: string }>(`/v1.0/me/messages/${m.graph_id}/attachments/${a.id}`);
                  if (!full.contentBytes) continue;
                  const hash = await sha256(Uint8Array.from(atob(full.contentBytes), (c) => c.charCodeAt(0)));
                  const { data: seen } = await admin.from("mail_attachments_seen").select("id, result").eq("hash", hash).maybeSingle();
                  const prev = (seen?.result ?? null) as (TF & { targets_v?: number }) | null;
                  let r: TF;
                  if (prev?.targets_v) r = prev;
                  else {
                    const ex = await analyseAttachment(a.name ?? "fichier", (a.contentType ?? "").toLowerCase(), full.contentBytes, {
                      system: TARGETS_SYSTEM,
                      task: "cibles-pj",
                      prompt: `Jointe à un mail ${m.folder === "sentitems" ? "ENVOYÉ par Wallsbroker" : "REÇU"} (objet : ${m.subject ?? ""}). Extrait cibles et honoraires.`,
                    });
                    r = ex === "unsupported" ? {} : { targets: ex.targets ?? [], fees: ex.fees ?? [] };
                    const merged = { ...(prev ?? {}), targets: r.targets ?? [], fees: r.fees ?? [], targets_v: 1 };
                    if (seen) await admin.from("mail_attachments_seen").update({ result: merged as never }).eq("id", seen.id);
                    else
                      await admin.from("mail_attachments_seen").insert({ hash, name: a.name ?? null, content_type: a.contentType ?? null, size, first_graph_id: m.graph_id, status: "lu", result: merged as never });
                  }
                  found.targets!.push(...(r.targets ?? []));
                  found.fees!.push(...(r.fees ?? []));
                }
              }
              const saved = await saveTargets(admin, found.targets!, found.fees!, m.folder === "sentitems" ? "email envoyé" : "email", date);
              if (saved.ids.length) await admin.from("mail_messages").update({ deal_id: saved.ids[0] }).eq("id", m.id).is("deal_id", null);
              await admin.from("mail_messages").update({ targets_checked_at: new Date().toISOString() }).eq("id", m.id);
              s.mails++;
              s.targets += saved.targets;
              s.fees += saved.fees;
              await persist();
            }
            s.mails += skip.length;
          }
          await persist({ status: "en cours", lease_until: null, last_error: null });
          return Response.json({ ok: true, ...s });
        } catch (e) {
          const msg = (e instanceof Error ? e.message : String(e)).slice(0, 400);
          const code = geminiStatus(e);
          const hard = e instanceof BudgetReachedError || code === 402 || code === 403;
          await persist({ lease_until: null, last_error: msg, ...(hard ? { status: "en pause" } : {}) });
          return Response.json({ ok: false, error: msg });
        }
      },
    },
  },
});
