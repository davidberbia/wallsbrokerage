import { createServerFn } from "@tanstack/react-start";
import { requireStaffAuth } from "@/lib/staff-middleware";
import type { Comparable } from "./brochure-types";

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));

/** Comparables de la brochure = liste unique de l'onglet Comparables du CRM. */
type Target = { adresse?: string; ville?: string; codePostal?: string; typeBien?: string; envType?: string };

/** Villes de plus de 100 000 habitants (Insee). */
const BIG_CITIES = new Set(
  "paris marseille lyon toulouse nice nantes montpellier strasbourg bordeaux lille rennes toulon reims saint-etienne le havre villeurbanne dijon grenoble angers saint-denis nimes aix-en-provence clermont-ferrand le mans brest tours amiens annecy limoges boulogne-billancourt metz perpignan besancon orleans rouen saint-denis montreuil caen argenteuil mulhouse nancy saint-paul tourcoing roubaix nanterre vitry-sur-seine creteil avignon poitiers".split(" "),
);
const norm = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim().replace(/\s+/g, "-");

/** Typologie de recherche à partir du type de bien de la brochure. */
export function searchClass(typeBien: string, envType?: string): string {
  const t = norm(typeBien || "");
  if (/habitat|logement|appart|maison|residen/.test(t)) return "Habitation";
  if (/bureau|office/.test(t)) return "Bureaux";
  if (/activit|logist|entrep|industri/.test(t)) return "Activité / Logistique";
  if (/hotel/.test(t)) return "Hôtel";
  if (/periph/.test(t) || envType === "peripherie") return "Commerce périphérie";
  return "Commerce centre-ville";
}
export const isBigCity = (ville: string) => BIG_CITIES.has(norm(ville).replace(/-\d+(e|er)?(-arrondissement)?$/, ""));

async function nearby(context: { supabase: any }, t: Target): Promise<any[] | null> {
  const q = [t.adresse, t.codePostal, t.ville].filter(Boolean).join(" ");
  if (!q.trim()) return null;
  const geo = await fetch(`https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(q)}`).then((r) => r.json()).catch(() => null);
  const f = geo?.features?.[0];
  if (!f) return null;
  const p = f.properties ?? {};
  const [lon, lat] = f.geometry.coordinates as [number, number];
  const cls = searchClass(t.typeBien ?? "", t.envType);
  if (cls === "Habitation") {
    const y = new Date().getFullYear() - 5;
    const r = await fetch(`https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee=${p.citycode}&anneemut_min=${y}&page_size=200`).then((x) => x.json()).catch(() => null);
    return (r?.results ?? [])
      .filter((m: any) => /MAISON|APPARTEMENT/.test(m.libtypbien ?? "") && Number(m.sbati) > 0)
      .slice(0, 30)
      .map((m: any) => ({
        id: `dvf-${m.idmutation}`, kind: "vente", asset_class: "Habitation", updated_at: m.datemut,
        enseigne: m.libtypbien, city: p.city, postal_code: p.postcode, address: p.city,
        surface: Number(m.sbati), price: Number(m.valeurfonc), price_m2: Math.round(Number(m.valeurfonc) / Number(m.sbati)),
        deal_date: m.datemut, source: "DVF (Etalab)",
      }));
  }
  const { data, error } = await context.supabase.rpc("find_comparables", {
    _class: cls, _lat: lat, _lon: lon, _street: p.street ?? p.name ?? "", _citycode: p.citycode ?? "",
    _postal: p.postcode ?? t.codePostal ?? "", _big_city: isBigCity(p.city ?? t.ville ?? ""), _limit: 50,
  });
  if (error) throw new Error(error.message);
  return data ?? [];
}

export const getSharedComparables = createServerFn({ method: "GET" })
  .middleware([requireStaffAuth])
  .inputValidator((input: unknown) => (input ?? {}) as Target)
  .handler(async ({ context, data: target }): Promise<Comparable[]> => {
    const near = target?.adresse || target?.ville ? await nearby(context, target) : null;
    const { data, error } = near ? { data: near, error: null } : await context.supabase
      .from("comparables")
      .select("*")
      .order("deal_date", { ascending: false, nullsFirst: false })
      .limit(5000);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({
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
