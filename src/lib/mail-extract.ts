// Extraction d'informations dans les emails par règles (regex) — aucun appel IA,
// donc aucun coût. Utilisé par la synchronisation Outlook et la fiche dossier.

export type MailExtraction = {
  amounts: number[];
  phones: string[];
  addresses: string[];
};

const AMOUNT_RE =
  /(\d[\d\s.,]*\d|\d)\s*(?:€|euros?|k€|m€|millions?|keur|mio)/gi;
const PHONE_RE =
  /(?:(?:\+|00)33[\s.-]?|0)[1-9](?:[\s.-]?\d{2}){4}/g;
const ADDRESS_RE =
  /\d{1,4}\s+(?:bis|ter|quater\s+)?(?:rue|avenue|av\.?|boulevard|bd\.?|place|pl\.?|quai|chemin|impasse|allée|cours|voie)\s+[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,60}(?:,?\s*\d{5}\s+[A-Za-zÀ-ÖØ-öø-ÿ' -]{2,40})?/gi;

function parseAmount(raw: string): number | null {
  const m = raw.toLowerCase();
  const mult = /m€|mio|millions?/.test(m) ? 1_000_000 : /k€|keur/.test(m) ? 1_000 : 1;
  const numPart = raw.replace(/[^\d\s.,]/g, "").trim();
  if (!numPart) return null;
  // Format français : espaces = milliers, virgule = décimales.
  let n = numPart.replace(/\s/g, "");
  if (n.includes(",") && !n.includes(".")) n = n.replace(",", ".");
  else n = n.replace(/,/g, "");
  const v = Number.parseFloat(n);
  if (!Number.isFinite(v) || v <= 0) return null;
  const total = Math.round(v * mult);
  // Filtre anti-bruit : un montant immobilier crédible est >= 1 000 €.
  return total >= 1_000 && total <= 100_000_000_000 ? total : null;
}

export function extractFromText(subject: string | null, preview: string | null): MailExtraction {
  const text = `${subject ?? ""}\n${preview ?? ""}`;
  const amounts = new Set<number>();
  for (const m of text.matchAll(AMOUNT_RE)) {
    const v = parseAmount(m[0]);
    if (v != null) amounts.add(v);
  }
  const phones = new Set<string>();
  for (const m of text.matchAll(PHONE_RE)) phones.add(m[0].trim());
  const addresses = new Set<string>();
  for (const m of text.matchAll(ADDRESS_RE)) {
    const a = m[0].replace(/\s+/g, " ").trim();
    if (a.length >= 8) addresses.add(a);
  }
  return {
    amounts: [...amounts].slice(0, 5),
    phones: [...phones].slice(0, 5),
    addresses: [...addresses].slice(0, 5),
  };
}

export function isEmptyExtraction(e: MailExtraction): boolean {
  return e.amounts.length === 0 && e.phones.length === 0 && e.addresses.length === 0;
}
