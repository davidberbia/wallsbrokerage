import { createServerFn } from "@tanstack/react-start";
import { requireStaffAuth } from "@/lib/staff-middleware";
import type { Comparable } from "./brochure-types";

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Comparables de la brochure = liste unique de l'onglet Comparables du CRM. */
export const getSharedComparables = createServerFn({ method: "GET" })
  .middleware([requireStaffAuth])
  .handler(async ({ context }): Promise<Comparable[]> => {
    const { data, error } = await context.supabase
      .from("comparables")
      .select("*")
      .order("deal_date", { ascending: false, nullsFirst: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => ({
      id: r.id,
      kind: r.kind === "vente" ? "prix" : "location",
      typeActif: s(r.asset_class),
      derniereMaj: r.updated_at,
      enseigne: s(r.enseigne),
      ville: s(r.city),
      codePostal: s(r.postal_code),
      adresse: s(r.address),
      surface: s(r.surface),
      surfacePonderee: s(r.weighted_surface),
      loyerAnnuel: s(r.rent),
      loyerM2: s(r.rent_m2),
      loyerM2Pondere: s(r.rent_m2_weighted),
      prixVente: s(r.price),
      prixM2: s(r.price_m2),
      rendement: s(r.yield_pct),
      dateSignature: r.deal_date ? r.deal_date.slice(0, 10) : "",
      source: s(r.source),
      notes: s(r.notes),
    }));
  });

/** Les comparables se gèrent dans l'onglet Comparables du CRM : rien n'est réécrit depuis la brochure. */
export const saveSharedComparables = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((input: unknown) => input as { items: Comparable[] })
  .handler(async ({ data }): Promise<{ ok: true; count: number }> => ({ ok: true, count: data?.items?.length ?? 0 }));
