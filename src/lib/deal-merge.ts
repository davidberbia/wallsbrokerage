// Fusion d'affaires « À relancer » décrivant le même actif.
type D = Record<string, unknown> & { id: string };
const empty = (v: unknown) => v == null || v === "" || (typeof v === "number" && v === 0);
const TEXT = ["company", "contact_name", "seller", "buyer", "operation_nature", "suggestion", "enrichment"];
const NUM = ["amount", "surface", "rent", "fee_amount", "fee_pct", "probability"];

/** Champs à écrire sur la ligne gardée : on complète, on ne remplace jamais. */
export function mergeDealFields(keep: D, others: D[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const all = [keep, ...others];
  for (const k of [...TEXT, ...NUM]) {
    if (!empty(keep[k])) continue;
    const v = others.find((o) => !empty(o[k]))?.[k];
    if (v !== undefined) out[k] = v;
  }
  // Adresse la plus précise = la plus longue.
  const addr = all.map((d) => String(d["address"] ?? "").trim()).sort((a, b) => b.length - a.length)[0];
  if (addr && addr !== String(keep["address"] ?? "").trim()) out["address"] = addr;
  const join = (k: string) => {
    const parts = [...new Set(all.map((d) => String(d[k] ?? "").trim()).filter(Boolean))];
    return parts.join(k === "notes" ? "\n\n" : ", ");
  };
  for (const k of ["notes", "source"]) {
    const v = join(k);
    if (v && v !== String(keep[k] ?? "")) out[k] = v;
  }
  return out;
}

/** Ville d'une adresse (dernier segment), normalisée pour comparer. */
export function cityKey(address: unknown): string {
  const last = String(address ?? "").split(",").pop() ?? "";
  return last.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\d{5}/g, "").replace(/[^a-z]+/g, " ").trim();
}
