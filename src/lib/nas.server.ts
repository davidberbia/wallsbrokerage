import { matchAsset, categorize, completeComparable, norm, type AssetLite } from "./nas-match";
import { normalizeAssetClass } from "./comparable-classes";

type Admin = (typeof import("@/integrations/supabase/client.server"))["supabaseAdmin"];
const admin = async (): Promise<Admin> => (await import("@/integrations/supabase/client.server")).supabaseAdmin;

export async function sha256Hex(text: string) {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Vérifie la clé privée du NAS (seul son empreinte est stockée). */
export async function verifyKey(request: Request): Promise<boolean> {
  const key = request.headers.get("x-nas-key") ?? "";
  if (key.length < 32) return false;
  const db = await admin();
  const { data } = await db.from("nas_ingest_keys").select("id").eq("key_hash", await sha256Hex(key)).eq("revoked", false).maybeSingle();
  if (!data) return false;
  await db.from("nas_ingest_keys").update({ last_used_at: new Date().toISOString() }).eq("id", data.id);
  return true;
}

const safe = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);

/** Retourne les empreintes déjà reçues (reprise sans doublon). */
async function check(hashes: string[]) {
  const db = await admin();
  const known: string[] = [];
  for (let i = 0; i < hashes.length; i += 500) {
    const { data } = await db.from("nas_files").select("sha256").in("sha256", hashes.slice(i, i + 500));
    known.push(...(data ?? []).map((r) => r.sha256));
  }
  return { known };
}

/** Résout (ou crée) le dossier d'actif : fiche existante, nouvelle fiche, ou « À rattacher » en cas de doute. */
/** Typologie détaillée déduite de la famille seulement quand elle est sans ambiguïté. */
const FAMILY_CLASS: Record<string, string> = { "Bureaux": "Bureaux", "Centres commerciaux": "Centres commerciaux", "Coliving": "Coliving", "Habitation": "Habitation", "Portefeuilles": "Portefeuille d'actifs", "Santé": "Santé", "Terrains": "Terrains à bâtir" };

async function resolveFolder(f: { folder_path: string; year?: string; city: string; label: string; family?: string; country?: string }) {
  const db = await admin();
  const { data: existing } = await db.from("nas_folders").select("id, asset_id, status").eq("folder_path", f.folder_path).maybeSingle();
  if (existing) {
    if (f.year && /^[12][0-9]{3}$/.test(f.year)) {
      const { error } = await db.from("nas_folders").update({ year: f.year }).eq("id", existing.id);
      if (error) throw new Error(error.message);
    }
    return existing;
  }
  const { data: assets } = await db.from("assets").select("id, title, city, address").ilike("city", f.city.trim());
  const m = matchAsset((assets ?? []) as AssetLite[], f.city, f.label);
  let asset_id: string | null = null;
  let status = "matched";
  let candidates: string[] = [];
  if (m.kind === "one") asset_id = m.id;
  else if (m.kind === "many") { status = "pending"; candidates = m.ids; }
  else {
    const isCityOnly = norm(f.label) === norm(f.city);
    const { data: created, error } = await db.from("assets").insert({
      title: isCityOnly ? f.city : `${f.label}`,
      city: f.city,
      address: isCityOnly ? null : f.label,
      owner_id: null,
      family: f.family ?? null,
      asset_class: f.family ? FAMILY_CLASS[f.family] ?? null : null,
      region: f.country && norm(f.country) !== "france" ? f.country : null,
    } as never).select("id").single();
    if (error) throw new Error(error.message);
    asset_id = created.id;
    status = "created";
  }
  const { data, error } = await db.from("nas_folders")
    .insert({ folder_path: f.folder_path, year: f.year ?? null, city: f.city, label: f.label, asset_id, status, candidates })
    .select("id, asset_id, status").single();
  if (error) throw new Error(error.message);
  return data;
}

async function uploadUrl(b: { folder_path: string; year?: string; city: string; label: string; name: string; sha256: string; family?: string; country?: string }) {
  const folder = await resolveFolder(b);
  const cat = categorize(b.name);
  const base = folder.asset_id ? `actifs/${folder.asset_id}` : `nas/a-rattacher/${folder.id}`;
  const path = `${base}/nas/${cat}s/${b.sha256.slice(0, 12)}-${safe(b.name)}`;
  const db = await admin();
  const { data, error } = await db.storage.from("brochures").createSignedUploadUrl(path, { upsert: true });
  if (error) throw new Error(error.message);
  return { path, token: data.token, signedUrl: data.signedUrl, folder_id: folder.id, asset_id: folder.asset_id, category: cat };
}

/** Pose le document dans la fiche actif ; photo principale seulement si la fiche n'en a pas. */
export async function attachDocument(db: Admin, assetId: string, path: string, name: string, category: string, hash: string) {
  const { data: dup } = await db.from("asset_documents").select("id").eq("asset_id", assetId).eq("source_hash", hash).limit(1);
  if (dup?.length) return;
  let docName = name;
  if (category === "photo") {
    const { count } = await db.from("asset_documents").select("id", { count: "exact", head: true }).eq("asset_id", assetId).like("name", "Photo principale%");
    docName = `${count ? "Autre" : "Photo principale"} — ${name}`;
  }
  const { count: order } = await db.from("asset_documents").select("id", { count: "exact", head: true }).eq("asset_id", assetId);
  await db.from("asset_documents").insert({ asset_id: assetId, path, name: docName, category, sort_order: order ?? 0, source_hash: hash });
}

async function commit(b: { sha256: string; rel_path: string; path: string; name: string; folder_id: string; asset_id: string | null; category: string; size?: number }) {
  const db = await admin();
  if (b.asset_id) await attachDocument(db, b.asset_id, b.path, b.name, b.category, b.sha256);
  await db.from("nas_files").upsert({
    sha256: b.sha256, rel_path: b.rel_path, mode: "actifs", asset_id: b.asset_id, folder_id: b.folder_id,
    category: b.category, storage_path: b.path, size_bytes: b.size ?? null, status: b.asset_id ? "done" : "pending",
  }, { onConflict: "sha256" });
  return { ok: true };
}

type Row = { kind?: string; asset_class?: string; enseigne?: string; address?: string; postal_code?: string; city?: string; surface?: number; weighted_surface?: number; rent?: number; rent_m2?: number; price?: number; price_m2?: number; yield_pct?: number; deal_date?: string; notes?: string; source?: string };

/** Comparables : classe normalisée, 65 % par défaut, doublon = même adresse + même surface. */
async function comparables(b: { rows: Row[]; sha256?: string; rel_path?: string }) {
  const db = await admin();
  const rows = (b.rows ?? []).slice(0, 1000).filter((r) => r.address || r.city);
  const addrs = [...new Set(rows.map((r) => r.address).filter(Boolean))] as string[];
  const seen = new Set<string>();
  for (let i = 0; i < addrs.length; i += 200) {
    const { data } = await db.from("comparables").select("address, surface").in("address", addrs.slice(i, i + 200));
    (data ?? []).forEach((d) => seen.add(`${norm(d.address)}|${d.surface ?? ""}`));
  }
  const toInsert = [];
  for (const r of rows) {
    const k = `${norm(r.address)}|${r.surface ?? ""}`;
    if (r.address && seen.has(k)) continue;
    seen.add(k);
    const c = completeComparable(r);
    toInsert.push({
      kind: r.kind === "vente" || r.kind === "prix" ? "vente" : "location",
      asset_class: normalizeAssetClass(r.asset_class),
      enseigne: r.enseigne ?? null, address: r.address ?? null, postal_code: r.postal_code ?? null, city: r.city ?? null,
      surface: c.surface ?? null, weighted_surface: c.weighted_surface ?? null, rent: c.rent ?? null, rent_m2: c.rent_m2 ?? null,
      price: c.price ?? null, price_m2: c.price_m2 ?? null, yield_pct: r.yield_pct ?? null, deal_date: r.deal_date ?? null,
      notes: r.notes ?? null, source: r.source ?? "Serveur NAS",
    });
  }
  for (let i = 0; i < toInsert.length; i += 500) {
    const { error } = await db.from("comparables").insert(toInsert.slice(i, i + 500));
    if (error) throw new Error(error.message);
  }
  if (b.sha256 && b.rel_path) await db.from("nas_files").upsert({ sha256: b.sha256, rel_path: b.rel_path, mode: "comparables", status: "done" }, { onConflict: "sha256" });
  return { inserted: toInsert.length, skipped: rows.length - toInsert.length };
}

export async function handleNas(action: string, body: any) {
  switch (action) {
    case "ping": return { ok: true };
    case "check": return check((body.hashes ?? []).slice(0, 5000));
    case "upload-url": return uploadUrl(body);
    case "commit": return commit(body);
    case "comparables": return comparables(body);
    default: throw new Error("Action inconnue");
  }
}
