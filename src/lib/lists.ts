import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AMOUNT_BANDS, ASSET_CLASSES, COUNTRIES, INVESTOR_PROFILES } from "@/lib/taxonomy";

export type TaxonomyKind = "asset_class" | "investor_profile" | "country" | "amount_band";

export type TaxonomyItem = {
  id: string;
  kind: TaxonomyKind;
  label: string;
  sort_order: number;
  active: boolean;
};

export const TAXONOMY_LABELS: Record<TaxonomyKind, string> = {
  asset_class: "Classes d'actifs",
  investor_profile: "Types d'investisseurs",
  country: "Pays",
  amount_band: "Tranches de prix",
};

export function useTaxonomyItems() {
  return useQuery({
    queryKey: ["taxonomy_items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("taxonomy_items")
        .select("*")
        .order("kind")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as TaxonomyItem[];
    },
    staleTime: 5 * 60 * 1000,
  });
}

const pick = (items: TaxonomyItem[] | undefined, kind: TaxonomyKind, fallback: readonly string[]) => {
  const list = (items ?? []).filter((i) => i.kind === kind && i.active).map((i) => i.label);
  return list.length > 0 ? list : [...fallback];
};

/** Listes paramétrables (repli sur la taxonomie livrée si la base est vide). */
export function useLists() {
  const { data } = useTaxonomyItems();
  return {
    assetClasses: pick(data, "asset_class", ASSET_CLASSES),
    investorProfiles: pick(data, "investor_profile", INVESTOR_PROFILES),
    countries: pick(data, "country", COUNTRIES),
    amountBands: pick(data, "amount_band", AMOUNT_BANDS),
  };
}

/** "5 à 15 M€" → { min: 5000000, max: 15000000 } */
export function parseAmountBand(band: string): { min: number | null; max: number | null } {
  const nums = (band.match(/\d+([.,]\d+)?/g) ?? []).map((n) => Number(n.replace(",", ".")));
  const unit = /m€|m\b/i.test(band) ? 1_000_000 : 1;
  if (nums.length === 0) return { min: null, max: null };
  if (nums.length === 1) return { min: nums[0]! * unit, max: null };
  return { min: nums[0]! * unit, max: nums[1]! * unit };
}

/** Retrouve la tranche correspondant à un couple budget min/max. */
export function matchAmountBand(
  bands: string[],
  min: number | null | undefined,
  max: number | null | undefined,
) {
  return (
    bands.find((b) => {
      const p = parseAmountBand(b);
      return p.min === (min ?? null) && p.max === (max ?? null);
    }) ?? ""
  );
}
