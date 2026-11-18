// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import davidAsset from "../assets/brochure/team/cropped/david.png.asset.json";
import guillaumeAsset from "../assets/brochure/team/cropped/guillaume.jpg.asset.json";
import loreneAsset from "../assets/brochure/team/cropped/lorene.png.asset.json";
import ladislasAsset from "../assets/brochure/team/cropped/ladislas.png.asset.json";
import wilfriedAsset from "../assets/brochure/team/cropped/wilfried.png.asset.json";
import emmanuelAsset from "../assets/brochure/team/cropped/emmanuel.png.asset.json";

export type RentalRow = {
  enseigne: string;
  surface: string;
  loyerAnnuel: string;
  loyerM2: string;
  debutBail: string;
  prochainBreak: string;
  walb: string;
  finBail: string;
  walt: string;
};

export type BrochureMedia = {
  // base64 data URLs
  dataUrl: string;
  name: string;
  /** Titre optionnel affiché sur les slides Plans / Perspectives. */
  title?: string;
  /** Coordonnées géographiques optionnelles (utilisées pour positionner les logos d'enseignes sur la carte de l'environnement commercial). */
  lat?: number;
  lng?: number;
};

export type MapLabel = {
  name: string;
  lat: number;
  lng: number;
  type?: string;
};

export type TeamMember = {
  name: string;
  role: string;
  email: string;
  phone: string;
  photo: BrochureMedia | null;
  /** URL d'une photo par défaut (asset local) à hydrater en base64 au premier chargement. */
  defaultPhotoUrl?: string;
};


/** Libellés éditables des 6 slots de pictos "points clés". */
export const POINT_CLE_PICTO_LABELS_DEFAULT = [
  "Picto Surface",
  "Picto Loyer / m²",
  "Picto Revenu locatif",
  "Picto Rendement AEM",
  "Picto Parking",
  "Picto WALB",
];

export type BrochureSettings = {
  franceMap: BrochureMedia | null;
  pointsClesPictos: (BrochureMedia | null)[]; // 6 slots
  pointsClesPictosLabels: string[]; // libellés éditables
  revenusPictos: (BrochureMedia | null)[]; // 6 slots (célib, couple, monoparentale, 1 enfant, 2 enfants, 3 enfants)
  team: TeamMember[]; // usually 3
  logoLibrary: { name: string; media: BrochureMedia }[];
  fixedConfidentialiteSlide: BrochureMedia | null;
  fixedAProposSlide: BrochureMedia | null;
};

export type Comparable = {
  id: string;
  kind?: "location" | "prix"; // défaut: "location"
  /** Type d'actif : commerce périphérie, commerce centre-ville, bureau, activité, logistique, hôtel */
  typeActif?: string;
  /** Date de la source la plus récente (email) — sert à garder l'info la plus à jour */
  derniereMaj?: string;
  enseigne: string; // pour "prix": liste d'enseignes séparées par des virgules
  ville: string;
  codePostal?: string;
  adresse: string;
  surface: string; // pour "prix": surface totale
  surfacePonderee?: string; // surface pondérée (comparables locatifs)
  loyerAnnuel: string; // pour "prix": loyer annuel total
  loyerM2: string; // pour "prix": recalculé = loyerAnnuel / surface
  loyerM2Pondere?: string; // loyer/m² pondéré (comparables locatifs) : recalculé = loyerAnnuel / surfacePonderee
  prixVente?: string; // uniquement "prix"
  prixM2?: string; // uniquement "prix" : recalculé = prixVente / surface
  rendement?: string; // uniquement "prix" : % (loyerAnnuel / prixVente * 100)
  dateSignature: string; // yyyy-mm-dd
  source: string; // conservé pour compat import ; plus affiché dans les tableaux
  notes: string;
};

export type BrochureData = {
  // Bien
  adresse: string;
  ville: string;
  codePostal: string;
  typeBien: string;
  surface: string;
  typeVente: string;
  prixVente: string;
  /** Si vrai, la slide Conditions de la vente affiche "Nous consulter" au lieu du prix. */
  nousConsulter: boolean;
  honoraires: string;
  loyerAnnuel: string;
  loyerM2: string;
  nomSite: string;
  /** Dossier de stockage des documents du bien. */
  docFolder?: string;
  nbParkings: string;
  /** Description de l’actif reprise de la fiche CRM (page Présentation du PDF). */
  descriptionActif?: string;

  // Réglages carte Google Maps (pin déplaçable + zoom)
  mapsSettings?: {
    localisation?: { lat: number; lng: number; zoom: number };
    environnement?: { lat: number; lng: number; zoom: number };
    accessibilite?: { lat: number; lng: number; zoom: number };
  };

  // Points clés
  pointsCles: string[]; // up to 6, only first row shown centered

  // Localisation
  descriptionVille: string;
  carteRegion: BrochureMedia | null;

  // Environnement commercial
  includeEnvironnement: boolean;
  /** Typologie exclusive de la slide 5 : détermine le seul flux affiché. */
  envType: "peripherie" | "centre-ville";
  envSousTitre: string;
  envTrafic: string;
  envCA: string;
  envNbCommerces: string;
  envProjets: string;
  envMapLabels: MapLabel[];
  envLogos: BrochureMedia[];
  envCarte: BrochureMedia | null;

  // Zone de chalandise + revenus
  modeChalandise: "voiture" | "pieton";
  dureeZone1: number;
  dureeZone2: number;
  populationZone1: string;
  populationZone2: string;
  surfaceZone1: string;
  surfaceZone2: string;
  chalandiseImage: BrochureMedia | null;
  revenus: {
    celibataire: string;
    coupleSansEnfants: string;
    familleMonoparentale: string;
    coupleUnEnfant: string;
    coupleDeuxEnfants: string;
    coupleTroisEnfants: string;
  };

  // Accessibilité
  accessibilite: string[];
  accessibiliteCarte: BrochureMedia | null;

  // État locatif
  nbLocataires: number;
  locataires: RentalRow[];

  // Médias
  photoCouverture: BrochureMedia | null;
  photoCouverturePosition: "left" | "right";
  photos: BrochureMedia[];
  /** Noms des photos exclues du reportage (case décochée dans le générateur). */
  photosExclues?: string[];
  planMasse: BrochureMedia | null;
  plans: BrochureMedia[];
  perspectives: BrochureMedia[];

  // Comparables
  includeComparables: boolean;
  comparables: Comparable[];

  // Réglages / assets réutilisables
  settings: BrochureSettings;

  /** Portefeuille : actifs supplémentaires présentés à la suite du premier. */
  portfolioAssets?: BrochureData[];
};


export const emptyTeamMember = (defaults?: Partial<TeamMember>): TeamMember => ({
  name: "",
  role: "",
  email: "",
  phone: "",
  photo: null,
  ...defaults,
});

export const emptyBrochure = (): BrochureData => ({
  adresse: "",
  ville: "",
  codePostal: "",
  typeBien: "Ensemble commercial",
  surface: "",
  typeVente: "Vente de gré à gré",
  prixVente: "",
  nousConsulter: false,
  honoraires: "",
  loyerAnnuel: "",
  loyerM2: "",
  nomSite: "",
  nbParkings: "",
  pointsCles: ["", "", ""],
  descriptionVille: "",
  carteRegion: null,
  includeEnvironnement: true,
  envType: "peripherie",
  envSousTitre: "",
  envTrafic: "",
  envCA: "",
  envNbCommerces: "",
  envProjets: "",
  envMapLabels: [],
  envLogos: [],
  envCarte: null,
  modeChalandise: "voiture",
  dureeZone1: 15,
  dureeZone2: 30,
  populationZone1: "",
  populationZone2: "",
  surfaceZone1: "",
  surfaceZone2: "",
  chalandiseImage: null,
  revenus: {
    celibataire: "",
    coupleSansEnfants: "",
    familleMonoparentale: "",
    coupleUnEnfant: "",
    coupleDeuxEnfants: "",
    coupleTroisEnfants: "",
  },
  accessibilite: [],
  accessibiliteCarte: null,
  nbLocataires: 1,
  locataires: [
    { enseigne: "", surface: "", loyerAnnuel: "", loyerM2: "", debutBail: "", prochainBreak: "", walb: "", finBail: "", walt: "" },
  ],
  photoCouverture: null,
  photoCouverturePosition: "left",
  photos: [],
  planMasse: null,
  plans: [],
  perspectives: [],
  includeComparables: false,
  comparables: [],
  settings: {
    franceMap: null,
    pointsClesPictos: [null, null, null, null, null, null],
    pointsClesPictosLabels: [...POINT_CLE_PICTO_LABELS_DEFAULT],
    revenusPictos: [null, null, null, null, null, null],
    team: [
      emptyTeamMember({ name: "David BERBIA", role: "Associé — Directeur des investissements", email: "d.berbia@wallsbroker.com", phone: "+33 (0)7 67 67 24 24", defaultPhotoUrl: davidAsset.url }),
      emptyTeamMember({ name: "Guillaume HALEGUA", role: "Associé — Directeur Commercialisation", email: "g.halegua@wallsbroker.com", phone: "+33 (0)6 20 34 54 48", defaultPhotoUrl: guillaumeAsset.url }),
      emptyTeamMember({ name: "Lorene GABBAY", role: "Analyste Investissement", email: "office.manager@wallsbroker.com", phone: "+33 (0)7 81 17 73 33", defaultPhotoUrl: loreneAsset.url }),
      emptyTeamMember({ name: "Ladislas CRAUSAZ", role: "Responsable immeuble en bloc", email: "l.crausaz@wallsbroker.com", phone: "+33 (0)6 19 57 85 40", defaultPhotoUrl: ladislasAsset.url }),
      emptyTeamMember({ name: "Wilfried de RENTY", role: "Partner — Office & Hospitality (Lisbonne)", email: "w.derenty@wallsbroker.com", phone: "+351 937 032 572", defaultPhotoUrl: wilfriedAsset.url }),
      emptyTeamMember({ name: "Emmanuel Fernandes BARREIROS", role: "Partner — Retail & Industrial (Lisbonne)", email: "e.ferbar@wallsbroker.com", phone: "+351 914 552 265", defaultPhotoUrl: emmanuelAsset.url }),
    ],

    logoLibrary: [],
    fixedConfidentialiteSlide: null,
    fixedAProposSlide: null,
  },
});
