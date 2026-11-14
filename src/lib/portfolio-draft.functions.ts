// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { createServerFn } from "@tanstack/react-start";
import { requireStaffAuth } from "@/lib/staff-middleware";
import type { Json } from "@/integrations/supabase/types";
import type { BrochureData } from "./brochure-types";

const DRAFT_KEY = "portfolio_draft";

export type CloudPortfolioDraft = {
  version: 1;
  assets: BrochureData[];
  active: number;
  updatedAt: number;
};

/** Sauvegarde cloud du portefeuille en cours de saisie (survit au navigateur). */
export const getCloudPortfolioDraft = createServerFn({ method: "GET" })
  .middleware([requireStaffAuth])
  .handler(async (): Promise<CloudPortfolioDraft | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("brochure_settings")
      .select("value")
      .eq("key", DRAFT_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    const value = data?.value as unknown as CloudPortfolioDraft | undefined;
    if (!value || !Array.isArray(value.assets) || value.assets.length === 0) return null;
    return { version: 1, assets: value.assets, active: value.active ?? 0, updatedAt: value.updatedAt ?? 0 };
  });

export const saveCloudPortfolioDraft = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((input: unknown) => input as CloudPortfolioDraft)
  .handler(async ({ data }): Promise<{ ok: true; count: number }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const assets = Array.isArray(data?.assets) ? data.assets : [];
    if (assets.length === 0) return { ok: true, count: 0 };
    const payload: CloudPortfolioDraft = {
      version: 1,
      assets,
      active: data?.active ?? 0,
      updatedAt: data?.updatedAt || Date.now(),
    };
    const { error } = await supabaseAdmin
      .from("brochure_settings")
      .upsert({ key: DRAFT_KEY, value: payload as unknown as Json }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true, count: assets.length };
  });
