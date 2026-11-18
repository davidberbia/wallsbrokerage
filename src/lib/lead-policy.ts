import { z } from "zod";

export const leadFactSchema = z.object({
  field: z.string().max(80), value: z.union([z.string().max(4000), z.number()]).nullable(),
  source: z.string().url().refine((s) => s.startsWith("https://")),
  certainty: z.enum(["confirmé", "à vérifier"]),
});
export const leadResearchSchema = z.object({
  summary: z.string().max(12000).optional(), suggestion: z.string().max(2000).optional(),
  facts: z.array(leadFactSchema).max(50).default([]),
  related_companies: z.array(z.object({ name: z.string(), siren: z.string().nullable().optional(), role: z.string().nullable().optional(), source: z.string().url() })).max(10).default([]),
});
export type LeadResearch = z.infer<typeof leadResearchSchema>;

export function canChangeLeadStage(from: string, to: string, assetClass?: string | null) {
  return from !== "Prospection" || from === to || Boolean(assetClass?.trim());
}

/** Only explicitly sourced confirmed facts are eligible for automatic field writes. */
export function confirmedLeadFacts(facts: LeadResearch["facts"]): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  const conflicts = new Set<string>();
  const numeric = new Set(["price","rent","surface","parking_count","keys_count","revenue","revenue_n1","revenue_n2","ebe","ebe_n1","ebe_n2"]);
  for (const fact of facts) {
    if (fact.certainty !== "confirmé" || fact.value === null || conflicts.has(fact.field)) continue;
    if (numeric.has(fact.field) && (typeof fact.value !== "number" || !Number.isFinite(fact.value))) continue;
    if (!numeric.has(fact.field) && typeof fact.value !== "string") continue;
    const previous = out[fact.field];
    if (previous !== undefined && previous !== fact.value) { delete out[fact.field]; conflicts.add(fact.field); continue; }
    out[fact.field] = fact.value;
  }
  return out;
}