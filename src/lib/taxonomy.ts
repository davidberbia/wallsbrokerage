export const ASSET_CLASSES = [
  "Bureaux",
  "Commerces",
  "Logistique / Entrepôts",
  "Résidentiel",
  "Résidences gérées",
  "Hôtellerie",
  "Santé / Médico-social",
  "Locaux d'activité",
  "Terrains / Foncier",
  "Parkings",
] as const;

export const STRATEGIES = [
  "Core",
  "Core+",
  "Value-add",
  "Opportuniste",
  "Marchand de biens",
  "Promotion / Développement",
  "Sale & lease-back",
] as const;

export const REGIONS = [
  "Paris",
  "Île-de-France",
  "Auvergne-Rhône-Alpes",
  "Provence-Alpes-Côte d'Azur",
  "Occitanie",
  "Nouvelle-Aquitaine",
  "Pays de la Loire",
  "Bretagne",
  "Hauts-de-France",
  "Grand Est",
  "Normandie",
  "Bourgogne-Franche-Comté",
  "Centre-Val de Loire",
  "Corse",
  "DOM-TOM",
  "International",
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
