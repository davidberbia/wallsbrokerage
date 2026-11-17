// Choix d'une société dans l'annuaire officiel : seulement si le SIREN ou le nom correspond nettement.
export type Company = { siren: string; nom_complet?: string; dirigeants?: { nom?: string; prenoms?: string; denomination?: string; qualite?: string }[] };
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").replace(/\b(sas|sasu|sa|sarl|sci|eurl|snc|scs)\b/g, " ").replace(/\s+/g, " ").trim();
export function pickCompany(list: Company[], siren?: string | null, name?: string | null): Company | null {
  const s = (siren ?? "").replace(/\s/g, "");
  if (/^\d{9}$/.test(s)) return list.find((c) => c.siren === s) ?? null;
  const n = norm(name ?? "");
  if (n.length < 3) return null;
  const hits = list.filter((c) => norm(c.nom_complet ?? "") === n);
  return hits.length === 1 ? hits[0]! : null;
}
