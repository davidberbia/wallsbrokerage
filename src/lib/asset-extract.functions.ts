import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ASSET_CLASSES, REGIONS, STRATEGIES } from "@/lib/taxonomy";

export type ExtractedAssetFields = {
  title?: string | null;
  reference?: string | null;
  asset_class?: string | null;
  strategy?: string | null;
  region?: string | null;
  city?: string | null;
  price?: number | null;
  yield_pct?: number | null;
  surface?: number | null;
  description?: string | null;
};

const pick = (value: string | null | undefined, allowed: readonly string[]) =>
  value && allowed.includes(value) ? value : null;

/** Extrait les caractéristiques d'un actif depuis une brochure/teaser (PDF ou image). */
export const extractAssetFields = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: z.string().max(300),
        mimeType: z.string().max(100),
        base64: z.string().max(14_000_000),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    const { callGeminiFileJson } = await import("@/lib/gemini.server");
    const result = await callGeminiFileJson<ExtractedAssetFields>({
      task: "extraction-actif",
      system:
        "Tu extrais les caractéristiques d'un actif immobilier professionnel depuis une brochure, un teaser ou un avis de valeur. Tu réponds uniquement en JSON, sans commentaire.",
      prompt: `Extrais les champs suivants depuis le document joint :
- title : intitulé court de l'actif
- reference : référence éventuelle du mandat
- asset_class : une valeur parmi [${ASSET_CLASSES.join(" | ")}]
- strategy : une valeur parmi [${STRATEGIES.join(" | ")}]
- region : une valeur parmi [${REGIONS.join(" | ")}]
- city : ville
- price : prix en euros, nombre sans espaces ni symbole
- yield_pct : rendement en %, nombre
- surface : surface en m², nombre
- description : résumé en 2 phrases maximum
Si une information est absente du document, mets null.`,
      file: { mimeType: data.mimeType, base64: data.base64 },
    });
    if (!result) return {} as ExtractedAssetFields;
    const cleaned: ExtractedAssetFields = {
      ...result,
      asset_class: pick(result.asset_class, ASSET_CLASSES),
      strategy: pick(result.strategy, STRATEGIES),
      region: pick(result.region, REGIONS),
    };
    return cleaned;
  });
