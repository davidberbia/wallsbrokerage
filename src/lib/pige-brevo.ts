export function brevoEventPatch(type: string, at: string) {
  if (type === "delivered") return { delivered_at: at };
  if (type === "opened" || type === "unique_opened") return { opened_at: at };
  if (["hard_bounce", "soft_bounce", "blocked", "spam", "invalid", "error"].includes(type)) return { bounced_at: at, send_error: `Brevo : ${type}` };
  return null;
}
export function canSendPige(state: string, sent: string | null) { return state === "prepared" && !sent; }
export function replyReferences(headers: { name: string; value: string }[], id: string) {
  const expected = id.replace(/[<>]/g, "").trim();
  return headers.some(h => ["in-reply-to", "references"].includes(h.name.toLowerCase()) && h.value.split(/\s+/).some(token => token.replace(/[<>]/g, "").trim() === expected));
}