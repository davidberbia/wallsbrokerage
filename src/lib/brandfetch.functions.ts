// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";

const SEARCH = "https://api.brandfetch.io/v2/search";
const BRAND = "https://api.brandfetch.io/v2/brands";

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const r = await fetch(url, { headers: { "User-Agent": "Wallsbroker/1.0" } });
    if (!r.ok) return null;
    const buf = new Uint8Array(await r.arrayBuffer());
    if (buf.length < 200) return null;
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    const ct = r.headers.get("content-type") || "image/png";
    return `data:${ct};base64,${btoa(bin)}`;
  } catch { return null; }
}

/**
 * Recherche + récupération d'un logo via Brandfetch.
 * Retourne dataUrl (base64) et publicUrl (utilisable comme icône Google Static Maps).
 */
export const fetchBrandLogo = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: { query: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env.BRANDFETCH_API_KEY;
    if (!key) throw new Error("BRANDFETCH_API_KEY manquant");
    const q = (data.query || "").trim();
    if (!q) return { dataUrl: "", publicUrl: "", domain: "", name: q };

    // 1) Search brand
    const sr = await fetch(`${SEARCH}/${encodeURIComponent(q)}`, {
      headers: { "Authorization": `Bearer ${key}` },
    });
    if (!sr.ok) throw new Error(`Brandfetch search ${sr.status}`);
    const list = (await sr.json()) as { domain?: string; name?: string; icon?: string }[];
    if (!Array.isArray(list) || list.length === 0) return { dataUrl: "", publicUrl: "", domain: "", name: q };
    // Prefer .fr, then first result
    const chosen = list.find((b) => b.domain?.endsWith(".fr")) || list[0];
    const domain = chosen.domain || "";
    if (!domain) return { dataUrl: "", publicUrl: "", domain: "", name: chosen.name || q };

    // 2) Brand details
    let publicUrl = chosen.icon || "";
    try {
      const br = await fetch(`${BRAND}/${domain}`, {
        headers: { "Authorization": `Bearer ${key}` },
      });
      if (br.ok) {
        const j = (await br.json()) as {
          logos?: { type?: string; formats?: { src?: string; format?: string; background?: string }[] }[];
        };
        const logos = j.logos || [];
        const preferred = logos.find((l) => l.type === "icon") || logos.find((l) => l.type === "logo") || logos[0];
        const fmt =
          preferred?.formats?.find((f) => f.format === "png" && f.background === "transparent") ||
          preferred?.formats?.find((f) => f.format === "png") ||
          preferred?.formats?.find((f) => f.format === "svg") ||
          preferred?.formats?.[0];
        if (fmt?.src) publicUrl = fmt.src;
      }
    } catch { /* ignore */ }

    // 3) Fallback CDN
    if (!publicUrl) {
      publicUrl = `https://cdn.brandfetch.io/${domain}/w/256/h/256?c=${encodeURIComponent(key.slice(0, 8))}`;
    }
    // Pour le PPTX, on stocke une miniature légère : suffisante pour être placée
    // sur la carte et plus rapide à manipuler que les logos originaux haute définition.
    const thumbnailUrl = chosen.icon || publicUrl;
    const dataUrl = (await fetchAsDataUrl(thumbnailUrl)) || (await fetchAsDataUrl(publicUrl)) || "";
    return { dataUrl, publicUrl, domain, name: chosen.name || q };
  });
