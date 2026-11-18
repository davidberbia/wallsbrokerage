import { z } from "zod";

export const leadFactSchema = z.object({
  field: z.string().max(80), value: z.union([z.string().max(4000), z.number()]).nullable(),
  // Source : URL https exacte, ou pièce jointe de la fiche (« document: nom du fichier »).
  source: z.string().max(500).refine((s) => /^https:\/\/\S+$/.test(s) || /^document:\s*\S/i.test(s)),
  certainty: z.enum(["confirmé", "à vérifier"]),
});
const relatedSchema = z.object({ name: z.string(), siren: z.string().nullable().optional(), role: z.string().nullable().optional(), source: z.string().max(500) });
export const leadResearchSchema = z.object({
  summary: z.string().transform((t) => t.slice(0, 12000)).nullish().transform((t) => t ?? undefined), suggestion: z.string().transform((t) => t.slice(0, 2000)).nullish().transform((t) => t ?? undefined),
  identified: z.string().max(300).nullish(),
  // Un fait mal formé est écarté seul : il ne doit pas faire échouer toute l'enquête.
  facts: z.preprocess((v) => (Array.isArray(v) ? v.filter((f) => leadFactSchema.safeParse(f).success).slice(0, 50) : []), z.array(leadFactSchema)),
  related_companies: z.preprocess((v) => (Array.isArray(v) ? v.filter((c) => relatedSchema.safeParse(c).success).slice(0, 10) : []), z.array(relatedSchema)),
});
export type LeadResearch = z.infer<typeof leadResearchSchema>;

export function canChangeLeadStage(from: string, to: string, assetClass?: string | null) {
  return from !== "Prospection" || from === to || Boolean(assetClass?.trim());
}

/** Only explicitly sourced confirmed facts are eligible for automatic field writes. */
export function confirmedLeadFacts(facts: LeadResearch["facts"]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const conflicts = new Set<string>();
  const numeric = new Set(["price","rent","surface","parking_count","keys_count","revenue","revenue_n1","revenue_n2","ebe","ebe_n1","ebe_n2"]);
  for (const fact of facts) {
    if (fact.certainty !== "confirmé" || fact.value === null || conflicts.has(fact.field)) continue;
    if (numeric.has(fact.field) && (typeof fact.value !== "number" || !Number.isFinite(fact.value))) continue;
    if (!numeric.has(fact.field) && typeof fact.value !== "string") continue;
    const previous = out[fact.field];
    if (previous !== undefined && previous !== fact.value) { delete out[fact.field]; conflicts.add(fact.field); continue; }
    out[fact.field] = fact.value;
  }
  return out;
}
const FREE_MAIL = /^(gmail|yahoo|hotmail|outlook|live|icloud|orange|free|sfr|wanadoo|laposte|msn|aol|proton(mail)?|gmx|bbox|neuf)\./i;
const normName = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z]+/g, " ").trim();

/** Mail senders (brokers, colleagues) can never become owner contacts: their names, e-mails, domains and phones are stripped. */
export function stripSenderContacts<T extends { contact_name?: string | null; contact_email?: string | null; contact_phone?: string | null }>(
  found: T, senders: { email?: string | null; name?: string | null }[],
): T {
  const emails = new Set(senders.map((s) => String(s.email ?? "").toLowerCase().trim()).filter(Boolean));
  const domains = new Set([...emails].map((e) => e.split("@")[1] ?? "").filter((d) => d && !FREE_MAIL.test(d)));
  const names = senders.map((s) => normName(String(s.name ?? ""))).filter((n) => n.length >= 4);
  const out = { ...found };
  const mail = String(out.contact_email ?? "").toLowerCase().trim();
  const badMail = Boolean(mail) && (emails.has(mail) || domains.has(mail.split("@")[1] ?? ""));
  const cname = normName(String(out.contact_name ?? ""));
  const badName = Boolean(cname) && names.some((n) => cname.includes(n) || n.includes(cname));
  if (badMail) out.contact_email = null;
  if (badName) out.contact_name = null;
  if (badMail || badName) out.contact_phone = null;
  return out;
}

/** "12 bis, Rue de la Paix 75002 Paris" → "12 rue de la paix" (number + street) for duplicate detection. */
export function addressKey(address?: string | null): string | null {
  const m = normName(String(address ?? "").replace(/(\d+)/g, " $1 ")).match(/\b(\d{1,4}) (?:bis |ter )?((?:rue|avenue|av|boulevard|bd|place|chemin|route|allee|quai|impasse|cours|square|parc) [a-z ]{3,}?)(?= \d| paris| cedex|$)/);
  return m ? `${m[1]} ${m[2]!.trim()}` : null;
}
