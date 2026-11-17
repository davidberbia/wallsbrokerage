// Statuts des affaires et pondération du CA sur les honoraires.
export const TARGET_STAGE = "Prospection";

export const PIPELINE_STAGES = [
  { stage: "Avis de valeur", weight: 0.1 },
  { stage: "Disponible", weight: 0.2 },
  { stage: "Offre", weight: 0.3 },
  { stage: "LOI acceptée", weight: 0.5 },
  { stage: "Promesse", weight: 0.75 },
  { stage: "Vendu", weight: 1 },
  { stage: "Perdu", weight: 0 },
] as const;

export const STAGE_NAMES = PIPELINE_STAGES.map((s) => s.stage) as string[];
/** Étapes dont l'affaire vit dans l'onglet Actifs (fiche créée automatiquement, sans mandat). */
export const ASSET_STAGES = ["Avis de valeur", "Disponible"];
export const CLOSED_STAGES = ["Vendu", "Perdu"];

export function stageWeight(stage: string): number {
  return PIPELINE_STAGES.find((s) => s.stage === stage)?.weight ?? 0;
}

type FeeLike = { fee_amount?: number | string | null; fee_pct?: number | string | null; amount?: number | string | null };

/** Honoraires : montant saisi, sinon prix × % d'honoraires. */
export function dealFee(d: FeeLike): number {
  if (d.fee_amount != null && d.fee_amount !== "") return Number(d.fee_amount) || 0;
  if (d.fee_pct && d.amount) return (Number(d.amount) * Number(d.fee_pct)) / 100;
  return 0;
}

export function weightedFee(d: FeeLike & { stage: string }): number {
  return dealFee(d) * stageWeight(d.stage);
}

/** Une ligne de l'année Y : créée en Y, ou d'une année antérieure et non soldée (report automatique). */
export function inVintage(
  d: { vintage: number; stage: string; carry_over?: boolean | null },
  year: number,
): boolean {
  if (d.vintage === year) return true;
  return d.carry_over !== false && d.vintage < year && !CLOSED_STAGES.includes(d.stage);
}

/** Clé de dédoublonnage d'un nom de dossier. */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(le|la|les|de|du|des|d|l|a|au|aux|en|et|sur|portefeuille|dossier|actif|projet)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
}

const GENERIC = new Set(
  "murs local locaux batiment commercial commerciale commerce commerces hotel hotels immeuble magasin ensemble cellule cellules produit mandat boutique bureaux bureau entrepot activite retail park clos couvert avenue rue boulevard place ville paris".split(" "),
);

/** Mots distinctifs d'un nom (villes, enseignes, adresses) pour rapprocher deux dossiers. */
export function nameTokens(name: string): string[] {
  return [
    ...new Set(
      name
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .split(/[^a-z0-9]+/)
        .filter((t) => (t.length >= 4 || /^\d{2,}$/.test(t)) && !GENERIC.has(t)),
    ),
  ];
}

/** Deux noms désignent-ils le même dossier ? (≥ 2/3 des mots distinctifs du plus court en commun) */
export function sameDeal(a: string, b: string): boolean {
  const ta = nameTokens(a);
  const tb = nameTokens(b);
  if (!ta.length || !tb.length) return false;
  const [small, big] = ta.length <= tb.length ? [ta, new Set(tb)] : [tb, new Set(ta)];
  const common = small.filter((t) => big.has(t)).length;
  return common >= Math.max(1, Math.ceil((small.length * 2) / 3));
}

/** Colonne du tableau « Suivi des affaires » où tombent les honoraires d'une ligne. */
export type SuiviColumn = "encaisse" | "facture" | "encours" | "annule";
export function suiviColumn(d: { stage: string; paid_at?: string | null }): SuiviColumn {
  if (d.stage === "Perdu") return "annule";
  if (d.stage === "Vendu") return d.paid_at ? "encaisse" : "facture";
  return "encours";
}

type SuiviLike = FeeLike & { stage: string; paid_at?: string | null };
/** Totaux : réel = tout sauf annulé ; pondéré = honoraires × pondération du statut. */
export function suiviTotals(rows: SuiviLike[]) {
  const t = { encaisse: 0, facture: 0, encours: 0, annule: 0, reel: 0, pondere: 0 };
  for (const d of rows) {
    const fee = dealFee(d);
    t[suiviColumn(d)] += fee;
    if (d.stage !== "Perdu") t.reel += fee;
    t.pondere += weightedFee(d);
  }
  return t;
}
