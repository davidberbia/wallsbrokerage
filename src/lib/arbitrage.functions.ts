import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const searchSchema = z.object({
  asset_class: z.string().min(1),
  region: z.string().min(1),
  occupancy: z.string().nullable().optional(),
  strategy: z.string().nullable().optional(),
  city_scope: z.string().nullable().optional(),
  periphery_scope: z.string().nullable().optional(),
  price_meur: z.number().positive(),
});

const bandFor = (priceMeur: number): string | null => {
  if (priceMeur < 1) return null;
  if (priceMeur <= 5) return "1 à 5 M€";
  if (priceMeur <= 10) return "5 à 10 M€";
  if (priceMeur <= 20) return "10 à 20 M€";
  return "20 à 50 M€";
};

/** Retourne uniquement le NOMBRE d'investisseurs potentiellement intéressés (résultat public). */
export const countInterestedInvestors = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => searchSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("investor_criteria")
      .select("investor_id, regions, amount_bands, strategies, city_scope, periphery_scope")
      .eq("asset_class", data.asset_class);
    if (error) throw new Error(error.message);

    const band = bandFor(data.price_meur);
    const ids = new Set<string>();
    for (const row of rows ?? []) {
      const regions = (row.regions ?? []) as string[];
      const bands = (row.amount_bands ?? []) as string[];
      const strategies = (row.strategies ?? []) as string[];
      if (regions.length > 0 && !regions.includes(data.region)) continue;
      if (band && bands.length > 0 && !bands.includes(band)) continue;
      if (data.strategy && strategies.length > 0 && !strategies.includes(data.strategy)) continue;
      if (data.city_scope && row.city_scope && row.city_scope !== data.city_scope) continue;
      if (data.periphery_scope && row.periphery_scope && row.periphery_scope !== data.periphery_scope)
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
