// Statuts des affaires et pondération du CA sur les honoraires.
export const TARGET_STAGE = "Cible";

export const PIPELINE_STAGES = [
  { stage: "Avis de valeur", weight: 0.1 },
  { stage: "Commercialisation", weight: 0.2 },
  { stage: "Offre", weight: 0.3 },
  { stage: "LOI acceptée", weight: 0.5 },
  { stage: "Promesse", weight: 0.75 },
  { stage: "Acte", weight: 1 },
  { stage: "Perdu", weight: 0 },
] as const;

export const STAGE_NAMES = PIPELINE_STAGES.map((s) => s.stage) as string[];
export const CLOSED_STAGES = ["Acte", "Perdu"];

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
export function inVintage(d: { vintage: number; stage: string }, year: number): boolean {
  if (d.vintage === year) return true;
  return d.vintage < year && !CLOSED_STAGES.includes(d.stage);
}

/** Clé de dédoublonnage d'un nom de dossier. */
export function nameKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(le|la|les|de|du|des|d|l|portefeuille|dossier|actif|projet)\b/g, " ")
    .replace(/[^a-z0-9]/g, "");
}
