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
  "Hôtels",
  "City Hôtels (murs & fonds)",
  "Resort Hôtels",
  "Résidence de services",
  "Résidence de services ou médicalisée",
  "Immeubles de logements ou mixtes",
  "Immeubles à restructurer",
  "Activité / Logistique",
  "Terrains à bâtir",
] as const;

export const STRATEGIES = ["CORE", "CORE +", "VALUE ADDED", "OPPORTUNISTE"] as const;

export const REGIONS = [
  "Ile-de-France",
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
  "Espagne",
  "Portugal",
] as const;

export const INVESTOR_PROFILES = [
  "Un investisseur privé",
  "Marchand de biens / Promoteur",
  "Une Foncière familiale ou privée",
  "Une Foncière immobilière côtée",
  "Une SCPI / OPCI",
  "Une Structure d'Asset Management",
  "Un investisseur Institutionnel",
  "Fonds d'investissement étranger",
] as const;

export const AMOUNT_BANDS = ["1 à 5 M€", "5 à 10 M€", "10 à 20 M€", "20 à 50 M€"] as const;

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

export const INVESTOR_STATUS = ["actif", "à qualifier", "en veille", "inactif"] as const;

export const ASSET_STATUS = ["disponible", "sous offre", "vendu", "retiré"] as const;

export const formatEUR = (value: number | null | undefined) =>
  value == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value);
