import { getAdmin } from "./automation.server";
import { graphGet } from "./mailscan.server";
import { pigeDue } from "./pige";
type Message = { id: string; subject?: string; conversationId?: string; sentDateTime?: string; receivedDateTime?: string; bodyPreview?: string; toRecipients?: { emailAddress?: { address?: string } }[]; internetMessageHeaders?: { name: string; value: string }[] };
const equal = (a?: string, b?: string) => !!a && !!b && a.trim().toLowerCase() === b.trim().toLowerCase();
async function messages(path: string) {
  const rows: Message[] = [];
  let next: string | undefined = path;
  for (let page = 0; next && page < 10; page++) {
    const result: { value: Message[]; "@odata.nextLink"?: string } = await graphGet(next);
    rows.push(...result.value); next = result["@odata.nextLink"];
  }
  return rows;
}
/** Read-only Outlook inspection: no sends; gated by the existing deployment control. */
export async function runPigeSync() {
  const admin = await getAdmin();
  const control = await admin.from("lead_followup_control").select("enabled").eq("id", true).single();
  if (control.error) throw new Error(control.error.message);
  if (!control.data.enabled) return { pige_sync: "désactivé avant publication" };
  const { data: cycles, error } = await admin.from("lead_piges").select("*,lead_pige_contacts(*)").is("completed_at", null).order("created_at").limit(20);
  if (error) throw new Error(error.message);
  if (!cycles?.length) return { pige_sync: 0 };
  const mailbox = await graphGet<{ mail?: string; userPrincipalName?: string }>("/v1.0/me?$select=mail,userPrincipalName");
  for (const cycle of cycles) {
    const deal = await admin.from("deals").select("stage,lead_status").eq("id", cycle.deal_id).single();
    if (deal.error) throw new Error(deal.error.message);
    if (deal.data.stage !== "Prospection" || deal.data.lead_status === "archived") continue;
    if (equal(cycle.sender_email, mailbox.mail) || equal(cycle.sender_email, mailbox.userPrincipalName)) {
      for (const c of cycle.lead_pige_contacts) {
        try {
          const start = new Date(new Date(c.prepared_at).getTime() - 60000).toISOString();
          const sent = await messages(`/v1.0/me/mailFolders/sentitems/messages?$filter=${encodeURIComponent(`sentDateTime ge ${start}`)}&$select=id,subject,conversationId,toRecipients,sentDateTime&$orderby=sentDateTime&$top=100`);
          const candidates = sent.filter(m => m.subject === c.subject && m.toRecipients?.some(r => equal(r.emailAddress?.address, c.email)));
          const out = c.message_id ? candidates.find(m => m.id === c.message_id) : candidates.length === 1 ? candidates[0] : undefined;
          if (!out?.conversationId || !out.sentDateTime) continue;
          const patch: { sent_at?: string; confirmation?: string; conversation_id: string; message_id: string; replied_at?: string; reply_preview?: string; sync_error: null } = { conversation_id: out.conversationId, message_id: out.id, sync_error: null };
          if (!c.sent_at) { patch.sent_at = out.sentDateTime; patch.confirmation = "outlook"; }
          const filter = `receivedDateTime ge ${out.sentDateTime} and from/emailAddress/address eq '${c.email.replace(/'/g, "''")}'`;
          const incoming = await messages(`/v1.0/me/mailFolders/inbox/messages?$filter=${encodeURIComponent(filter)}&$select=id,subject,conversationId,receivedDateTime,bodyPreview,internetMessageHeaders&$orderby=receivedDateTime&$top=100`);
          const reply = incoming.find(m => m.conversationId === out.conversationId && !/automatic reply|réponse automatique|out of office|absence du bureau/i.test(m.subject || "") && !m.internetMessageHeaders?.some(h => (h.name.toLowerCase() === "auto-submitted" && h.value.toLowerCase() !== "no") || /disposition-notification|delivery-status/i.test(h.value)));
          if (reply?.receivedDateTime && !c.replied_at) { patch.replied_at = reply.receivedDateTime; patch.reply_preview = reply.bodyPreview || ""; }
          const updated = await admin.from("lead_pige_contacts").update(patch).eq("id", c.id);
          if (updated.error) throw new Error(updated.error.message);
          if (!cycle.started_at) {
            const updatedCycle = await admin.from("lead_piges").update({ started_at: out.sentDateTime, due_at: pigeDue(new Date(out.sentDateTime)).toISOString() }).eq("id", cycle.id).is("started_at", null);
            if (updatedCycle.error) throw new Error(updatedCycle.error.message);
          }
        } catch (e) {
          const result = await admin.from("lead_pige_contacts").update({ sync_error: e instanceof Error ? e.message : "Suivi Outlook indisponible" }).eq("id", c.id);
          if (result.error) throw new Error(result.error.message);
        }
      }
    }
    const closed = await admin.from("lead_piges").update({ completed_at: new Date().toISOString() }).eq("id", cycle.id).lte("due_at", new Date().toISOString()).is("completed_at", null);
    if (closed.error) throw new Error(closed.error.message);
  }
  return { pige_sync: cycles.length };
}