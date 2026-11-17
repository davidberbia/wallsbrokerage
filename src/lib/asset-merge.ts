// Fusion de fiches actifs décrivant le même bien : on complète, on ne remplace jamais.
type A = Record<string, unknown> & { id: string };
const SKIP = new Set(["id", "created_at", "updated_at", "owner_id", "description", "portfolio_lots", "is_portfolio"]);
const empty = (v: unknown) =>
  v == null || v === "" || (typeof v === "number" && v === 0) ||
  (Array.isArray(v) && v.length === 0) || (typeof v === "object" && !Array.isArray(v) && Object.keys(v as object).length === 0);

/** Champs à écrire sur la fiche gardée. */
export function mergeAssetFields(keep: A, others: A[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const keys = new Set([keep, ...others].flatMap((a) => Object.keys(a)));
  for (const k of keys) {
    if (SKIP.has(k) || !empty(keep[k])) continue;
    const v = others.find((o) => !empty(o[k]))?.[k];
    if (v !== undefined) out[k] = v;
  }
  const desc = [...new Set([keep, ...others].map((a) => String(a["description"] ?? "").trim()).filter(Boolean))];
  if (desc.join("\n\n") !== String(keep["description"] ?? "").trim()) out["description"] = desc.join("\n\n");
  const lots = [keep, ...others].flatMap((a) => (Array.isArray(a["portfolio_lots"]) ? (a["portfolio_lots"] as unknown[]) : []));
  if (lots.length !== ((keep["portfolio_lots"] as unknown[] | undefined)?.length ?? 0)) out["portfolio_lots"] = lots;
  if (!keep["is_portfolio"] && others.some((o) => o["is_portfolio"])) out["is_portfolio"] = true;
  return out;
}

/** Tables rattachées à un actif, déplacées vers la fiche gardée avant suppression des doublons. */
export const ASSET_CHILD_TABLES = ["asset_documents", "brochure_sends", "campaigns", "document_shares", "deals", "mandates"] as const;
