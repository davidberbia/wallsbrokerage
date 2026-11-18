import { getAdmin, escapeHtml } from "./automation.server";
import { graphGet } from "./mailscan.server";
import { sendNew } from "./graph-send.server";
import { canRemind, documentMail, mailParts, parisWeekend } from "./lead-documents";

type Message = { id: string; subject?: string; conversationId?: string; receivedDateTime?: string; toRecipients?: { emailAddress?: { address?: string } }[]; internetMessageHeaders?: { name: string; value: string }[] };
const sameEmail = (a?: string, b?: string) => a?.trim().toLowerCase() === b?.trim().toLowerCase();
const subjectKey = (s: string) => s.replace(/^(?:(?:re|fw|fwd|tr)\s*:\s*)+/i, "").trim().toLowerCase();

/** Disabled until deployment approval. Claims are atomic; ambiguous provider failures never cause a blind resend. */
export async function runLeadFollowups() {
  const admin = await getAdmin();
  const { data: control, error: controlError } = await admin.from("lead_followup_control").select("enabled").eq("id", true).maybeSingle();
  if (controlError) throw new Error(controlError.message);
  if (!control?.enabled) return { lead_followups: "désactivées avant publication" };
  const now = new Date();
  const { data: requests, error } = await admin.from("lead_document_requests").select("*").in("status", ["waiting", "reminded"]).order("sent_at").limit(20);
  if (error) throw new Error(error.message);
  if (!requests?.length) return { lead_reminders: 0 };
  const mailbox = await graphGet<{ mail?: string; userPrincipalName?: string }>("/v1.0/me?$select=mail,userPrincipalName");
  let sent = 0; let received = 0;
  for (const r of requests) {
    if (!r.sent_at) continue;
    const { data: deal, error: dealError } = await admin.from("deals").select("name,stage,lead_status").eq("id", r.deal_id).single();
    if (dealError) throw new Error(dealError.message);
    if (deal.stage !== "Prospection" || deal.lead_status === "archived") {
      const { error: e } = await admin.from("lead_document_requests").update({ status: "cancelled" }).eq("id", r.id).eq("status", r.status);
      if (e) throw new Error(e.message);
      continue;
    }
    if (!sameEmail(r.sender_email, mailbox.mail) && !sameEmail(r.sender_email, mailbox.userPrincipalName)) {
      const { error: e } = await admin.from("lead_document_requests").update({ status: "error", error: "La boîte Outlook connectée ne correspond pas à l’auteur : aucune relance envoyée." }).eq("id", r.id).eq("status", r.status);
      if (e) throw new Error(e.message);
      continue;
    }
    // Only a sent message addressed to this contact with the exact requested subject can establish the thread.
    const start = new Date(new Date(r.sent_at).getTime() - 24 * 3600_000).toISOString();
    const outgoing = await graphGet<{ value: Message[]; "@odata.nextLink"?: string }>(`/v1.0/me/mailFolders/sentitems/messages?$filter=${encodeURIComponent(`sentDateTime ge ${start}`)}&$select=id,subject,conversationId,toRecipients&$orderby=sentDateTime desc&$top=100`);
    const confirmed = outgoing.value.find(m => subjectKey(m.subject ?? "") === subjectKey(r.subject) && m.toRecipients?.some(to => sameEmail(to.emailAddress?.address, r.to_email)));
    if (!confirmed?.conversationId) continue; // No proof of actual sending: no automatic follow-up.
    const filter = `receivedDateTime ge ${r.sent_at} and from/emailAddress/address eq '${r.to_email.replace(/'/g, "''")}'`;
    const incoming = await graphGet<{ value: Message[]; "@odata.nextLink"?: string }>(`/v1.0/me/mailFolders/inbox/messages?$filter=${encodeURIComponent(filter)}&$select=id,subject,conversationId,receivedDateTime,internetMessageHeaders&$top=100&$orderby=receivedDateTime desc`);
    const reply = incoming.value.find(m => (m.conversationId === confirmed.conversationId || subjectKey(m.subject ?? "") === subjectKey(r.subject) || subjectKey(m.subject ?? "") === subjectKey(`Votre dossier : ${deal.name}`)) && !/automatic reply|réponse automatique|absence du bureau|out of office/i.test(m.subject ?? "") && !m.internetMessageHeaders?.some(h => h.name.toLowerCase() === "auto-submitted" && h.value.toLowerCase() !== "no"));
    if (reply) {
      const { error: e } = await admin.from("lead_document_requests").update({ status: "received", received_at: reply.receivedDateTime ?? now.toISOString(), conversation_id: confirmed.conversationId }).eq("id", r.id).eq("status", r.status);
      if (e) throw new Error(e.message);
      received++; continue;
    }
    // An incomplete inbox read cannot establish that nothing was received: fail closed.
    if (incoming["@odata.nextLink"] || !canRemind(r, now, true) || parisWeekend(new Date())) continue;
    const { data: claimed, error: claimError } = await admin.rpc("claim_lead_document_reminder", { _id: r.id });
    if (claimError) throw new Error(claimError.message);
    if (!claimed) continue;
    try {
      const items = Array.isArray(r.missing_items) ? r.missing_items.filter((i): i is string => typeof i === "string") : [];
      const parts = mailParts(r.body_text ?? "");
      const mail = documentMail(deal.name, items, true, null, parts.firstName, parts.signature);
      mail.subject = `[Relancé auto] ${r.subject.replace(/^\[Relancé auto\]\s*/i, "")}`;
      await sendNew(r.to_email, mail.subject, `<p style="color:#b42318">Relancé auto</p><p>${escapeHtml(mail.body).replace(/\n/g, "<br>")}</p>`);
      const { error: e } = await admin.from("lead_document_requests").update({ status: "reminded", reminded_at: new Date().toISOString(), conversation_id: confirmed.conversationId, error: null }).eq("id", r.id).eq("status", "sending");
      if (e) throw new Error(e.message);
      sent++;
    } catch (e) {
      await admin.from("lead_document_requests").update({ status: "error", error: e instanceof Error ? e.message : "Relance à vérifier dans Outlook avant tout nouvel envoi" }).eq("id", r.id).eq("status", "sending");
    }
  }
  return { lead_reminders: sent, lead_replies: received };
}