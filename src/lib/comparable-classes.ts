/**
 * Classes d'actifs de la base Comparables : liste fermée, ordre alphabétique.
 * Toute valeur importée ou saisie passe par normalizeAssetClass.
 */
export const COMPARABLE_CLASSES = [
  "Activité",
  "Bureaux",
  "Commerce centre-ville",
  "Commerce périphérie",
  "Habitation",
  "Logistique",
] as const;

export type ComparableClass = (typeof COMPARABLE_CLASSES)[number];

const strip = (t: string) =>
  t
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();

/** Ramène n'importe quelle typologie libre vers l'une des 6 classes, ou null. */
export function normalizeAssetClass(raw: string | null | undefined): ComparableClass | null {
  const t = strip(raw ?? "");
  if (!t) return null;
  if (/logist|entrepot|warehouse/.test(t)) return "Logistique";
  if (/^acti|activite|industri/.test(t)) return "Activité";
  if (/bureau|office|centre d.affaire/.test(t)) return "Bureaux";
  if (/habitat|logement|appart|coliving|chalet|villa|studio|maison|detached|residen|immeuble de rapport|copropriete|loft/.test(t))
    return "Habitation";
  if (/periph|retail|supermarche|hypermarch|supermarket|moyenne surface|grande surface|club de sport|salle de sport|borne de recharge|galerie marchande|loisir/.test(t))
    return "Commerce périphérie";
  if (/commerce|boulangerie|cabinet|clini|medical|hotel|local|laverie|showroom|restaurant|boutique|coiffure|mixte|mixed/.test(t))
    return "Commerce centre-ville";
  return null;
}
