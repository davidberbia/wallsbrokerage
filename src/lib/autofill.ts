import { ASSET_CLASSES } from "@/lib/taxonomy";
// Règles pures du pré-remplissage automatique (testées).
export type AutofillFields = {
  title?: string | null; city?: string | null; address?: string | null; postal_code?: string | null;
  price?: number | null; yield_pct?: number | null; surface?: number | null; rent?: number | null;
  parking_count?: number | null; keys_count?: number | null; revenue?: number | null; property_tax?: number | null; charges?: number | null;
  walb?: number | null; walt?: number | null; leases?: string | null; owner_name?: string | null;
  asset_class?: string | null; strategy?: string | null; region?: string | null;
};
type AssetRow = Record<string, unknown> & { description?: string | null; autofill_sources?: unknown };

const DIRECT = ["city", "address", "postal_code", "price", "yield_pct", "surface", "rent", "parking_count", "keys_count", "revenue", "owner_name", "asset_class", "strategy", "region"] as const;
const empty = (v: unknown) => v == null || v === "";

/** Intitulé d'un plan : « Plan de masse » ou le niveau (« Plan rez-de-chaussée », « Plan 1er étage »…). */
export function planCategory(kind: string | null | undefined, label: string | null | undefined): string {
  if (kind === "plan_masse" || /masse/i.test(label ?? "")) return "Plan de masse";
  const l = (label ?? "").trim();
  if (!l) return "Plan";
  return /^plan\b/i.test(l) ? l.charAt(0).toUpperCase() + l.slice(1) : `Plan ${l}`;
}

/** Ne complète que les champs vides ; WALB, WALT, taxe, charges et état locatif vont dans la description. */
export function mergeAutofill(asset: AssetRow, r: AutofillFields, source: string): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  for (const k of DIRECT) {
    const v = r[k];
    if (k === "asset_class" && !(ASSET_CLASSES as readonly string[]).includes(String(v))) continue;
    if (!empty(v) && empty(asset[k])) patch[k] = v;
  }
  const desc = asset.description ?? "";
  const extra = [
    r.walb != null && !/WALB/.test(desc) && `WALB : ${r.walb} ans`,
    r.walt != null && !/WALT/.test(desc) && `WALT : ${r.walt} ans`,
    r.property_tax != null && !/Taxe foncière/.test(desc) && `Taxe foncière : ${r.property_tax} €/an`,
    r.charges != null && !/Charges :/.test(desc) && `Charges : ${r.charges} €/an`,
    r.leases && !/État locatif/.test(desc) && `État locatif :\n${r.leases}`,
  ].filter(Boolean) as string[];
  if (extra.length) patch["description"] = [desc, ...extra].filter(Boolean).join("\n\n");
  if (Object.keys(patch).length) {
    const prev = Array.isArray(asset.autofill_sources) ? (asset.autofill_sources as string[]) : [];
    if (!prev.includes(source)) patch["autofill_sources"] = [...prev, source].slice(-30);
  }
  return patch;
}

/** Reporte sur la ligne du dossier les infos encore vides (ville/adresse, surface, loyer, prix). */
export function dealPatchFromAsset(deal: Record<string, unknown>, a: Record<string, unknown>): Record<string, unknown> {
  const p: Record<string, unknown> = {};
  const addr = [a["address"], a["postal_code"], a["city"]].filter((v) => !empty(v)).join(" ");
  if (empty(deal["address"]) && addr) p["address"] = addr;
  if (empty(deal["surface"]) && !empty(a["surface"])) p["surface"] = a["surface"];
  if (empty(deal["rent"]) && !empty(a["rent"])) p["rent"] = a["rent"];
  if (empty(deal["amount"]) && !empty(a["price"])) p["amount"] = a["price"];
  return p;
}
