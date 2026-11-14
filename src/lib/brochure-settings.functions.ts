import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";
import type { Json } from "@/integrations/supabase/types";
import type { BrochureMedia } from "./brochure-types";

const PICTOS_KEY = "pictos";

export type BrochurePictosSettings = {
  pointsClesPictos: (BrochureMedia | null)[];
  revenusPictos: (BrochureMedia | null)[];
  pointsClesPictosLabels: string[];
};

export const getBrochurePictosSettings = createServerFn({ method: "GET" })
  .middleware([requireStaffAuth])
  .handler(async (): Promise<BrochurePictosSettings | null> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("brochure_settings")
      .select("value")
      .eq("key", PICTOS_KEY)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.value as unknown as BrochurePictosSettings | undefined) ?? null;
  });

export const saveBrochurePictosSettings = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((input: unknown) => input as BrochurePictosSettings)
  .handler(async ({ data }): Promise<{ ok: true }> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("brochure_settings")
      .upsert({ key: PICTOS_KEY, value: data as unknown as Json }, { onConflict: "key" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });