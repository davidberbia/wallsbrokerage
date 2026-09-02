import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import {
  assetClassCandidates,
  includesNormalized,
  normalizeText,
  priceInBands,
} from "@/lib/matching";

const searchSchema = z.object({
  asset_class: z.string().min(1),
  region: z.string().min(1),
  occupancy: z.string().nullable().optional(),
  strategy: z.string().nullable().optional(),
  city_scope: z.string().nullable().optional(),
  periphery_scope: z.string().nullable().optional(),
  price_meur: z.number().positive(),
});

/** Retourne uniquement le NOMBRE d'investisseurs potentiellement intéressés (résultat public). */
export const countInterestedInvestors = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("investor_criteria")
      .select("investor_id, asset_class, regions, amount_bands, strategies, city_scope, periphery_scope");
    if (error) throw new Error(error.message);

    const candidates = assetClassCandidates(data.asset_class);
    const ids = new Set<string>();
    for (const row of rows ?? []) {
      if (!includesNormalized(candidates, (row.asset_class ?? "") as string)) continue;
      const regions = (row.regions ?? []) as string[];
      const bands = (row.amount_bands ?? []) as string[];
      const strategies = (row.strategies ?? []) as string[];
      if (regions.length > 0 && !includesNormalized(regions, data.region)) continue;
      if (!priceInBands(data.price_meur, bands)) continue;
      if (data.strategy && strategies.length > 0 && !includesNormalized(strategies, data.strategy))
        continue;
      if (
        data.city_scope &&
        row.city_scope &&
        normalizeText(row.city_scope as string) !== normalizeText(data.city_scope)
      )
        continue;
      if (
        data.periphery_scope &&
        row.periphery_scope &&
        normalizeText(row.periphery_scope as string) !== normalizeText(data.periphery_scope)
      )
        continue;
      ids.add(row.investor_id as string);
    }
    return { count: ids.size };
  });


const requestSchema = searchSchema.extend({
  surface: z.number().nullable().optional(),
  address: z.string().nullable().optional(),
  rent_annual: z.number().nullable().optional(),
  first_name: z.string().min(1),
  last_name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().nullable().optional(),
  comment: z.string().nullable().optional(),
  match_count: z.number().nullable().optional(),
});

export const submitArbitrageRequest = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => requestSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("arbitrage_requests").insert({
      asset_class: data.asset_class,
      occupancy: data.occupancy ?? null,
      strategy: data.strategy ?? null,
      city_scope: data.city_scope ?? null,
      periphery_scope: data.periphery_scope ?? null,
      price_meur: data.price_meur,
      region: data.region,
      surface: data.surface ?? null,
      address: data.address ?? null,
      rent_annual: data.rent_annual ?? null,
      first_name: data.first_name,
      last_name: data.last_name,
      email: data.email,
      phone: data.phone ?? null,
      comment: data.comment ?? null,
      match_count: data.match_count ?? null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
