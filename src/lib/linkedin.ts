// Règles pures du module Notoriété LinkedIn (testées).
export type PostKind = "actifs" | "specialite" | "marche";
export const KIND_LABEL: Record<PostKind, string> = {
  actifs: "3 actifs à vendre (lundi)",
  specialite: "Article spécialité (mercredi)",
  marche: "Évolution du marché (mensuel)",
};

export function formatPrice(p: number): string {
  if (p >= 1_000_000) {
    const m = Math.round((p / 1_000_000) * 10) / 10;
    return `${String(m).replace(".", ",")} M€`;
  }
  return `${Math.round(p / 1000)} k€`;
}

export type AnonAsset = { asset_class: string | null; asset_subclass: string | null; surface: number | null; postal_code: string | null; city: string | null; price: number | null };

/** « Hôtel particulier de 450 m² à vendre dans le 17e à 6,5 M€ NV » — jamais d'adresse, enseigne ni propriétaire. */
export function anonymizeAsset(a: AnonAsset): string | null {
  const type = (a.asset_subclass || a.asset_class || "").trim();
  if (!type || !a.price) return null;
  const cp = (a.postal_code ?? "").trim();
  let where = "";
  if (/^750\d\d$/.test(cp)) {
    const n = Number(cp.slice(3));
    where = ` dans le ${n}${n === 1 ? "er" : "e"}`;
  } else if (a.city) where = ` à ${a.city.trim()}`;
  const surf = a.surface ? ` de ${Math.round(a.surface).toLocaleString("fr-FR")} m²` : "";
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}${surf} à vendre${where} à ${formatPrice(a.price)} NV`;
}

/** Type de post prévu pour une date : jour mensuel choisi > lundi > mercredi. */
export function kindForDate(d: Date, marketDay: number): PostKind | null {
  if (d.getDate() === marketDay) return "marche";
  if (d.getDay() === 1) return "actifs";
  if (d.getDay() === 3) return "specialite";
  return null;
}

/** File d'invitations : du contact le plus récent au plus ancien, déjà invités exclus, plafond quotidien. */
export function inviteQueue<T extends { id: string; created_at: string }>(contacts: T[], done: Set<string>, perDay: number): T[] {
  return contacts
    .filter((c) => !done.has(c.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, perDay);
}
