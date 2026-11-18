/** Règles pures de l'aspiration NAS : rattachement d'un dossier à une fiche actif et classement des fichiers. */
export const norm = (t: string | null | undefined) =>
  (t ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();

const STOP = new Set(["rue", "avenue", "av", "bd", "boulevard", "place", "de", "du", "des", "la", "le", "les", "l", "d", "et", "chemin", "route", "allee", "quai"]);
const words = (t: string) => norm(t).split(" ").filter((w) => w.length > 1 && !STOP.has(w));

export type AssetLite = { id: string; title: string; city: string | null; address: string | null };
export type Match = { kind: "one"; id: string } | { kind: "none" } | { kind: "many"; ids: string[] };

/** Même ville obligatoire ; le libellé du dossier doit couvrir les mots significatifs de l'adresse ou du titre. */
export function matchAsset(assets: AssetLite[], city: string, label: string): Match {
  const c = norm(city);
  const lw = new Set(words(label));
  const sameCity = assets.filter((a) => norm(a.city) === c);
  const hits = sameCity.filter((a) => {
    for (const src of [a.address, a.title]) {
      const w = words(src ?? "").filter((x) => x !== c);
      if (!w.length) continue;
      const common = w.filter((x) => lw.has(x)).length;
      if (common >= Math.min(2, w.length) && common / w.length >= 0.5) return true;
    }
    return false;
  });
  // Ville sans sous-dossier d'adresse : un seul actif dans la ville suffit.
  if (!hits.length && norm(label) === c && sameCity.length === 1) return { kind: "one", id: sameCity[0]!.id };
  if (hits.length === 1) return { kind: "one", id: hits[0]!.id };
  if (hits.length > 1) return { kind: "many", ids: hits.map((h) => h.id) };
  return sameCity.length && norm(label) === c ? { kind: "many", ids: sameCity.map((a) => a.id) } : { kind: "none" };
}

export function categorize(name: string): "photo" | "plan" | "document" {
  const n = norm(name);
  const img = /\.(jpe?g|png|webp|heic|gif|tiff?)$/i.test(name);
  if (/\bplan|masse|cadastr|coupe|facade plan|niveau\b/.test(n)) return "plan";
  return img ? "photo" : "document";
}

/** Surface pondérée par défaut (65 %) et loyer au m² calculé quand il manque. */
export function completeComparable(r: { surface?: number | null; weighted_surface?: number | null; rent?: number | null; rent_m2?: number | null; price?: number | null; price_m2?: number | null }) {
  const out = { ...r };
  if (out.surface && !out.weighted_surface) out.weighted_surface = Math.round(out.surface * 0.65 * 100) / 100;
  if (out.rent && out.surface && !out.rent_m2) out.rent_m2 = Math.round((out.rent / out.surface) * 100) / 100;
  if (out.price && out.surface && !out.price_m2) out.price_m2 = Math.round((out.price / out.surface) * 100) / 100;
  return out;
}
