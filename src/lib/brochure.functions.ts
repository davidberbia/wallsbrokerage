import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";
import type { BrochureData } from "./brochure-types";

function hasAnyPicto(settings: BrochureData["settings"] | undefined): boolean {
  return Boolean(
    settings?.pointsClesPictos?.some((p) => p?.dataUrl) ||
    settings?.revenusPictos?.some((p) => p?.dataUrl),
  );
}

export const generateBrochure = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: BrochureData) => data)
  .handler(async ({ data }) => {
    const { generateBrochurePptx } = await import("./pptx-generator");
    const { appendSlidesFromPptx, isPptxMedia, mediaToPptxBuffer } = await import("./pptx-merge.server");
    let exportData = data;

    if (!hasAnyPicto(exportData.settings)) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: row } = await supabaseAdmin
        .from("brochure_settings")
        .select("value")
        .eq("key", "pictos")
        .maybeSingle();
      const pictos = row?.value as unknown as Partial<BrochureData["settings"]> | undefined;
      if (pictos) {
        exportData = {
          ...exportData,
          settings: {
            ...exportData.settings,
            pointsClesPictos: pictos.pointsClesPictos || exportData.settings.pointsClesPictos,
            revenusPictos: pictos.revenusPictos || exportData.settings.revenusPictos,
            pointsClesPictosLabels: pictos.pointsClesPictosLabels || exportData.settings.pointsClesPictosLabels,
          },
        };
      }
    }

    let buffer = await generateBrochurePptx(exportData);

    // Append fixed pptx slides (Confidentialité + À propos) if provided as .pptx.
    const toAppend: Buffer[] = [];
    const conf = exportData.settings?.fixedConfidentialiteSlide;
    const apr = exportData.settings?.fixedAProposSlide;
    if (isPptxMedia(conf)) toAppend.push(mediaToPptxBuffer(conf!));
    if (isPptxMedia(apr)) toAppend.push(mediaToPptxBuffer(apr!));
    if (toAppend.length) {
      buffer = await appendSlidesFromPptx(buffer, toAppend);
    }

    const base64 = buffer.toString("base64");
    const filename = `Brochure_${(exportData.nomSite || exportData.ville || "WALLSBROKER").replace(/[^a-zA-Z0-9_-]/g, "_")}.pptx`;
    return { base64, filename };
  });
