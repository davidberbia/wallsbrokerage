const FORMS: Record<string, string> = {
  "5499": "SARL", "5498": "EURL", "5710": "SAS", "5720": "SASU", "6540": "SCI",
  "5599": "SA", "5699": "SA", "5505": "SA", "5202": "SNC", "5306": "SCS", "6599": "Société civile",
};
export const legalForm = (code: string) => FORMS[code] ?? "";

type Dirigeant = { nom?: string; prenoms?: string; qualite?: string; denomination?: string; type_dirigeant?: string };
const RANK = [/^président(?!.*(surveillance|conseil))/i, /^gérant/i, /directeur général/i, /président/i];

// Représentant légal : Président puis Gérant puis DG, sinon le premier dirigeant.
export function pickRepresentative(list: Dirigeant[]): { name: string; role: string } | null {
  if (!list.length) return null;
  const d = RANK.map((re) => list.find((x) => re.test(x.qualite ?? ""))).find(Boolean) ?? list[0]!;
  const name = d.type_dirigeant === "personne morale"
    ? (d.denomination ?? "")
    : [d.prenoms?.split(" ")[0], d.nom].filter(Boolean).join(" ");
  return { name: name.trim(), role: (d.qualite ?? "").trim() };
}

export type OwnerDetails = Partial<Record<"siren" | "company_name" | "legal_form" | "rcs_city" | "address" | "representative" | "representative_role" | "proxy" | "proxy_name" | "civility", string>>;

// Texte « mandant » injecté dans les modèles de mandat.
export function mandantText(kind: string | null | undefined, name: string | null | undefined, d: OwnerDetails): string {
  if (kind === "morale") {
    const head = [d.company_name || name, d.legal_form].filter(Boolean).join(", ");
    const parts = [head];
    if (d.siren) parts.push(`immatriculée au RCS${d.rcs_city ? ` de ${d.rcs_city}` : ""} sous le n° ${d.siren}`);
    if (d.address) parts.push(`dont le siège est situé ${d.address}`);
    const signer = d.proxy_name ? `${d.proxy_name}, agissant par procuration` : [d.representative, d.representative_role].filter(Boolean).join(", en qualité de ");
    if (signer) parts.push(`représentée par ${signer}`);
    return parts.filter(Boolean).join(", ");
  }
  return [d.civility, name].filter(Boolean).join(" ");
}
