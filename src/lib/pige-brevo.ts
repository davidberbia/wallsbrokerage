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
/** Adresses autorisées comme expéditeur Brevo de la Pige (validées dans Brevo). */
export const PIGE_SENDERS = ["d.berbia@wallsbroker.com", "l.crausaz@wallsbroker.com"];
const slug = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
/** Identité d'expédition : nom du collaborateur + tag Brevo ; null si l'adresse n'est pas autorisée. */
export function pigeSender(email: string, person: string) {
  const address = email.trim().toLowerCase();
  if (!PIGE_SENDERS.includes(address)) return null;
  const name = person.trim() ? `${person.trim()} | Wallsbroker` : "Wallsbroker";
  return { email: address, name, tags: ["pige", slug(person) || slug(address.split("@")[0] ?? "")] };
}

/** Erreurs définitives : l'adresse ne doit plus être sélectionnée. */
export function isHardBounce(type: string) {
  return ["hard_bounce", "invalid", "blocked"].includes(type);
}

/** Un investisseur dont l'e-mail est revenu en erreur ne peut plus être sélectionné. */
export function canSelectInvestor(i: { email?: string | null; email_bounced_at?: string | null }) {
  return Boolean(i.email) && !i.email_bounced_at;
}
