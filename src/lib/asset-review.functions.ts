import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffAuth } from "@/lib/staff-middleware";

/** Relit les pièces jointes d'un actif (ou de l'actif d'un dossier) et complète les champs vides. */
export const reviewAsset = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d) => z.object({ assetId: z.string().uuid().optional(), dealId: z.string().uuid().optional() }).parse(d))
  .handler(async ({ data, context }) => {
    let assetId = data.assetId ?? null;
    if (!assetId && data.dealId) {
      const { data: deal } = await context.supabase.from("deals").select("asset_id").eq("id", data.dealId).maybeSingle();
      assetId = deal?.asset_id ?? null;
    }
    if (!assetId) return { filled: 0, files: 0 };
    // Visibilité vérifiée avec les droits de l'utilisateur avant tout accès privilégié.
    const { data: visible } = await context.supabase.from("assets").select("id").eq("id", assetId).maybeSingle();
    if (!visible) throw new Error("Actif inaccessible");
    const { getAdmin } = await import("@/lib/automation.server");
    const { reviewAssetDocs } = await import("@/lib/asset-review.server");
    return reviewAssetDocs(await getAdmin(), assetId);
  });
