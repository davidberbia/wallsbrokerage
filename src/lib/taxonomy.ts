// Taxonomie reprise à l'identique de l'outil Wallsbrokerage (import du 01/09/2026).
export const ASSET_CLASSES = [
  "Appartement",
  "Maison",
  "Bureaux",
  "Murs de commerces de pied d'immeuble",
  "Locaux commerciaux de périphérie",
  "Ensemble commercial de périphérie",
  "Retail Park complet",
  "Galeries commerciales",
  "Centres commerciaux",
  "City Hôtel (sans fonds)",
  "City Hôtel (murs et fonds)",
  "Resort Hôtel (sans fonds)",
  "Resort Hôtel (murs et fonds)",
  "Résidence étudiants",
  "EHPAD",
  "Santé",
  "Salle de sport",
  "Buffets à volonté",
  "Loisirs",
  "Murs de restaurants",
  "Immeubles de logements ou mixtes",
  "Immeubles à restructurer",
  "Activité",
  "Logistique",
  "Terrains à bâtir",
] as const;

/** Sous-classes proposées pour certaines classes. */
export const ASSET_SUBCLASSES: Record<string, readonly string[]> = {
  Bureaux: ["Immeuble(s)", "Plateau(x)", "Lot(s)"],
};

/** Rubriques du menu déroulant (simple aide au choix : chaque classe reste distincte). */
export const ASSET_CLASS_GROUPS: [string, readonly string[]][] = [
  ["Bureaux", ["Bureaux"]],
  ["Commerces", ["Murs de commerces de pied d'immeuble", "Locaux commerciaux de périphérie", "Ensemble commercial de périphérie", "Retail Park complet", "Galeries commerciales", "Centres commerciaux", "Murs de restaurants", "Buffets à volonté"]],
  ["Hôtellerie", ["City Hôtel (sans fonds)", "City Hôtel (murs et fonds)", "Resort Hôtel (sans fonds)", "Resort Hôtel (murs et fonds)"]],
  ["Résidentiel", ["Appartement", "Maison", "Immeubles de logements ou mixtes", "Résidence étudiants"]],
  ["Santé", ["EHPAD", "Santé"]],
  ["Sport et loisirs", ["Salle de sport", "Loisirs"]],
  ["Industriel", ["Activité", "Logistique"]],
  ["Foncier", ["Terrains à bâtir", "Immeubles à restructurer"]],
];

/** Libellé lisible d'un actif : "Bureaux – Immeuble(s)" → "immeuble de bureaux". */
export function assetKindLabel(cls?: string | null, sub?: string | null): string {
  if (cls === "Bureaux") {
    if (sub === "Immeuble(s)") return "immeuble de bureaux";
    if (sub === "Plateau(x)") return "plateau(x) de bureaux";
    if (sub === "Lot(s)") return "lot(s) de bureaux";
    return "bureaux";
  }
  return (cls ?? "").trim();
}

export const STRATEGIES = ["CORE", "CORE +", "VALUE ADDED", "OPPORTUNISTE", "MULTICASE"] as const;

export const REGIONS = [
  "Île-de-France",
  "Auvergne-Rhône-Alpes",
  "Bourgogne-Franche-Comté",
  "Bretagne",
  "Centre-Val de Loire",
  "Corse",
  "Grand Est",
  "Hauts-de-France",
  "Normandie",
  "Nouvelle-Aquitaine",
  "Occitanie",
  "Pays de la Loire",
  "Provence-Alpes-Côte d’Azur",
] as const;

export const COUNTRIES = [
  "Espagne",
  "Portugal",
  "Angleterre",
  "Italie",
  "Grèce",
  "Belgique",
  "Suisse",
  "Luxembourg",
] as const;

export const INVESTOR_PROFILES = [
  "Investisseur privé",
  "Marchand de biens",
  "Promoteur",
  "Foncière familiale ou privée",
  "Family Office",
  "Foncière immobilière",
  "SCPI / OPCI",
  "Structure d'Asset Management",
  "Investisseur institutionnel",
  "Fonds d'investissement étranger",
] as const;

export const AMOUNT_BANDS = ["1 à 5 M€", "5 à 15 M€", "15 à 50 M€", "50 à 500 M€"] as const;

export const JOB_TITLES = [
  "Président",
  "Gérant",
  "Directeur immobilier",
  "Directeur des investissements",
  "Directeur du patrimoine",
  "Asset Manager",
  "Analyste",
  "Autre",
] as const;

export const STRATEGY_DEFINITIONS: Record<(typeof STRATEGIES)[number], string> = {
  CORE: "Actif sécurisé, loué à des locataires solides, avec des revenus stables et un risque limité.",
  "CORE +": "Actif de qualité offrant un rendement régulier, avec un potentiel modéré d’amélioration ou de valorisation.",
  "VALUE ADDED": "Actif nécessitant une gestion active, des travaux ou une relocation pour créer une plus-value.",
  OPPORTUNISTE: "Opération à fort potentiel de création de valeur, avec un niveau de risque et de rendement plus élevé.",
  MULTICASE: "Stratégie multi-actifs : l'investisseur est ouvert à plusieurs classes d'actifs ou à un portefeuille diversifié.",
};

export const CITY_SCOPES = [
  "Villes > 200k hab.",
  "Villes > 100k hab.",
  "Villes > 50k hab.",
  "Paris et 1ère couronne",
] as const;

export const PERIPHERY_SCOPES = [
  "Zone de chalandise > 200k hab.",
  "Zone de chalandise > 100k hab.",
  "Zone de chalandise > 50k hab.",
  "Périphéries de grandes villes",
  "Chalandise 30 min > 200k hab.",
  "Chalandise 30 min > 100k hab.",
] as const;

export const HORIZONS = ["< 3 ans", "3 à 7 ans", "7 à 12 ans", "> 12 ans"] as const;

export const FINANCINGS = ["Fonds propres", "Crédit bancaire", "Mixte", "Club deal / SCPI"] as const;

export const INVESTOR_STATUS = ["actif", "à qualifier", "en veille", "inactif", "black listé"] as const;

export const ASSET_STATUS = ["disponible", "sous offre", "vendu", "retiré"] as const;

export const formatEUR = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value);

/** Classes résidentielles : l'adresse s'affiche avant la ville. */
const RESIDENTIAL = new Set(["Appartement", "Maison", "Immeubles de logements ou mixtes", "Résidence étudiants"]);
export const isResidentialClass = (cls?: string | null) => !!cls && RESIDENTIAL.has(cls);

/** Commercial : « Ville · Adresse » ; résidentiel : « Adresse · Ville ». */
export function locationLabel(cls: string | null | undefined, city: string | null | undefined, address: string | null | undefined): string {
  const c = (city ?? "").trim();
  let a = (address ?? "").trim();
  if (c && a.toLowerCase().endsWith(c.toLowerCase())) a = a.slice(0, -c.length).replace(/[\s,·-]+$/, "").replace(/\s*\d{5}$/, "").trim();
  const parts = isResidentialClass(cls) ? [a, c] : [c, a];
  return parts.filter(Boolean).join(" · ");
}

/** Classe déduite du nom du dossier quand elle n'est pas encore renseignée. */
export function guessClassFromName(name?: string | null): string | null {
  const n = (name ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const rules: [RegExp, string][] = [
    [/\bhotel|resort/, "City Hôtel (sans fonds)"],
    [/bureau/, "Bureaux"],
    [/logistiq|entrepot/, "Logistique"],
    [/activite/, "Activité"],
    [/retail park/, "Retail Park complet"],
    [/centre commercial/, "Centres commerciaux"],
    [/commerce|boutique|local commercial|locaux commerciaux/, "Murs de commerces de pied d'immeuble"],
    [/restaurant/, "Murs de restaurants"],
    [/ehpad/, "EHPAD"],
    [/etudiant/, "Résidence étudiants"],
    [/appartement/, "Appartement"],
    [/maison|villa/, "Maison"],
    [/terrain/, "Terrains à bâtir"],
    [/logement|residentiel|mixte/, "Immeubles de logements ou mixtes"],
  ];
  return rules.find(([r]) => r.test(n))?.[1] ?? null;
}

/** Libellé court pour les listes (place limitée sur téléphone). */
export function shortClassLabel(cls?: string | null, sub?: string | null): string {
  if (!cls) return "";
  if (cls === "Bureaux") return assetKindLabel(cls, sub).replace(/^./, (c) => c.toUpperCase());
  if (/Hôtel/.test(cls)) return "Hôtel";
  if (cls === "Immeubles de logements ou mixtes") return "Logements";
  const SHORT: Record<string, string> = { "Murs de commerces de pied d'immeuble": "Commerce", "Locaux commerciaux de périphérie": "Commerce périphérie", "Ensemble commercial de périphérie": "Ensemble commercial", "Résidence étudiants": "Résid. étudiants", "Immeubles à restructurer": "À restructurer", "Terrains à bâtir": "Terrain" };
  return SHORT[cls] ?? cls;
}
