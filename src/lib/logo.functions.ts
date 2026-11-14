// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";

type SearchInput = { query: string };

/**
 * Recherche un logo via l'API publique gratuite de Clearbit
 * (https://logo.clearbit.com/{domaine}). Retourne un data URL PNG
 * pour intégration directe et sauvegarde dans la bibliothèque.
 *
 * Le `query` peut être un nom d'enseigne (ex: "Grand Frais") ou un
 * domaine complet (ex: "grandfrais.com"). On tente d'abord la valeur
 * telle quelle, puis quelques variantes de domaine plausibles.
 */
export const searchLogo = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: SearchInput) => data)
  .handler(async ({ data }) => {
    const raw = (data.query || "").trim();
    if (!raw) throw new Error("Requête vide");
    const isDomain = /\./.test(raw);
    const slug = raw
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "");
    const candidates = isDomain
      ? [raw]
        : [
          `${slug}.fr`,
          `${slug}.com`,
          `${slug}.eu`,
          `${slug}.net`,
        ];
    const attempts: { domain: string; ok: boolean; status: number }[] = [];
    for (const domain of candidates) {
      const url = `https://logo.clearbit.com/${encodeURIComponent(domain)}?size=512&format=png`;
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Wallsbroker/1.0" } });
        attempts.push({ domain, ok: r.ok, status: r.status });
        if (!r.ok) continue;
        const buf = new Uint8Array(await r.arrayBuffer());
        if (buf.length < 200) continue;
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        return {
          domain,
          name: raw,
          dataUrl: `data:image/png;base64,${btoa(bin)}`,
        };
      } catch {
        attempts.push({ domain, ok: false, status: 0 });
      }
    }
    for (const domain of candidates) {
      const url = `https://www.google.com/s2/favicons?domain=${encodeURIComponent(domain)}&sz=256`;
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Wallsbroker/1.0" } });
        if (!r.ok) continue;
        const buf = new Uint8Array(await r.arrayBuffer());
        if (buf.length < 200) continue;
        let bin = "";
        for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
        return { domain, name: raw, dataUrl: `data:image/png;base64,${btoa(bin)}` };
      } catch {}
    }
    throw new Error(`Aucun logo trouvé pour « ${raw} ». Domaines testés : ${attempts.map((a) => a.domain).join(", ")}`);
  });
