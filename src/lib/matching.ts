/**
 * Rapprochement tolérant entre la taxonomie affichée dans l'outil et les
 * libellés historiques importés depuis Bubble (accents, variantes de noms,
 * tranches de montant différentes).
 */

export const normalizeText = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[’']/g, "'")
    .replace(/&/g, "et")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();

/** Libellés historiques équivalents pour une classe d'actif de la taxonomie actuelle. */
const ASSET_CLASS_ALIASES: Record<string, string[]> = {
  "City Hôtel (sans fonds)": ["Hôtels", "Hôtel"],
  "City Hôtel (murs et fonds)": ["City Hôtels (murs & fonds)"],
  "Resort Hôtel (sans fonds)": ["Resort Hôtels"],
  "Resort Hôtel (murs et fonds)": ["Resort Hôtels"],
  "Résidence étudiants": ["Résidence de services"],
  EHPAD: ["Résidence de services ou médicalisée"],
  Activité: ["Activité / Logistique"],
  Logistique: ["Activité / Logistique"],
};

/** Liste des libellés à interroger en base pour une classe d'actif donnée. */
export const assetClassCandidates = (assetClass: string): string[] => [
  assetClass,
  ...(ASSET_CLASS_ALIASES[assetClass] ?? []),
];

/** Extrait les bornes numériques d'une tranche « 5 à 15 M€ ». */
const bandRange = (band: string): [number, number] | null => {
  const nums = band.match(/\d+(?:[.,]\d+)?/g);
  if (!nums || nums.length === 0) return null;
  const values = nums.map((n) => Number(n.replace(",", ".")));
  if (values.length === 1) return [values[0]!, Number.POSITIVE_INFINITY];
  return [values[0]!, values[1]!];
};

/** Le prix (en M€) tombe-t-il dans l'une des tranches de l'investisseur ? */
export const priceInBands = (priceMeur: number, bands: string[]): boolean => {
  if (bands.length === 0) return true;
  return bands.some((band) => {
    const range = bandRange(band);
    if (!range) return true;
    return priceMeur >= range[0] && priceMeur <= range[1];
  });
};

export const includesNormalized = (list: string[], value: string) =>
  list.some((item) => normalizeText(item) === normalizeText(value));
