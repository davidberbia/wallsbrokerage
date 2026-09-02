// Taxonomie reprise à l'identique de l'outil Wallsbrokerage (import du 01/09/2026).
export const ASSET_CLASSES = [
  "Immeubles de bureaux",
  "Plateaux ou lots de bureaux",
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
  "Immeubles de logements ou mixtes",
  "Immeubles à restructurer",
  "Activité",
  "Logistique",
  "Terrains à bâtir",
] as const;

export const STRATEGIES = ["CORE", "CORE +", "VALUE ADDED", "OPPORTUNISTE"] as const;

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
