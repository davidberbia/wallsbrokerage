// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { Button } from "@/components/ui/button";
import { Power } from "lucide-react";
import { useRouter } from "@tanstack/react-router";
import { useState, useCallback, useEffect, useRef, type ChangeEvent, type Dispatch, type SetStateAction } from "react";
import { useServerFn } from "@tanstack/react-start";
import { generateBrochure } from "@/lib/brochure.functions";
import { fetchIsochrones } from "@/lib/isochrones.functions";
import { fetchGoogleMap, fetchNearbyEnseignes } from "@/lib/googlemaps.functions";
import { InteractiveGoogleMap, type InteractiveMapValue } from "@/components/InteractiveGoogleMap";
import { supabase } from "@/integrations/supabase/client";
import { shouldBypassAuthInPreview } from "@/lib/auth-access";
import { useQueryClient } from "@tanstack/react-query";
import { DEFAULT_ZOOM, DEFAULT_MAP_TYPE, getPreferredZoom, rememberPreferredZoom, type MapKind } from "@/lib/gmap-style";
import { enrichContent, fetchRevenus } from "@/lib/ai-enrich.functions";
import { AddressAutocomplete, type SelectedAddress } from "@/components/AddressAutocomplete";
import { importBrochure } from "@/lib/brochure-import.functions";
import { importEtatLocatif } from "@/lib/etat-locatif-import.functions";
import { listAllMailFolders } from "@/lib/brochure-mail-stubs";
import { listFolderMessages, scanMessage, extractRecordsFromText, type ScanRecord } from "@/lib/brochure-mail-stubs";
import { extractAny, extractPptxText, extractDocxText, type ImportedMedia } from "@/lib/import-client";
import { emptyBrochure, emptyTeamMember, POINT_CLE_PICTO_LABELS_DEFAULT, type BrochureData, type BrochureMedia, type BrochureSettings, type Comparable, type RentalRow, type TeamMember } from "@/lib/brochure-types";
import { listAllowedUsers, addAllowedUser, deleteAllowedUser, type AllowedUser } from "@/lib/brochure-mail-stubs";
import { getBrochurePictosSettings, saveBrochurePictosSettings, type BrochurePictosSettings } from "@/lib/brochure-settings.functions";
import { getSharedComparables, saveSharedComparables } from "@/lib/comparables.functions";
import { runMailIngest } from "@/lib/brochure-mail-stubs";
import { getCloudPortfolioDraft, saveCloudPortfolioDraft } from "@/lib/portfolio-draft.functions";
import { fillLocatairesDurations, computeAutoPointsCles, computeRowDurations, formatFrThousandsStr, parseAmt } from "@/lib/brochure-compute";
import pictoSurfaceAsset from "@/assets/brochure/pictos/surface.png.asset.json";
import pictoLoyerAsset from "@/assets/brochure/pictos/loyer_m2.png.asset.json";
import pictoRevenuAsset from "@/assets/brochure/pictos/revenu_locatif.png.asset.json";
import franceMapAsset from "@/assets/brochure/maps/france_navy.png.asset.json";
import aProposPptxAsset from "@/assets/brochure/slides/a_propos.pptx.asset.json";
import confidentialitePptxAsset from "@/assets/brochure/slides/confidentialite.pptx.asset.json";

/** Les fonctions serveur protégées exigent un jeton : sans session on ne les appelle pas. */
async function hasSupabaseSession(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  try {
    const { supabase } = await import("@/integrations/supabase/client");
    const { data } = await supabase.auth.getSession();
    return Boolean(data.session?.access_token);
  } catch {
    return false;
  }
}




async function fileToMedia(file: File): Promise<BrochureMedia> {
  const buf = await file.arrayBuffer();
  let binary = "";
  const bytes = new Uint8Array(buf);
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  const base64 = btoa(binary);
  const mime = file.type || "image/jpeg";
  return { dataUrl: `data:${mime};base64,${base64}`, name: file.name };
}

function downloadBase64(base64: string, filename: string) {
  const bin = atob(base64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = bin.charCodeAt(i);
  const blob = new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function Section({ title, children, open = true }: { title: string; children: React.ReactNode; open?: boolean }) {
  return (
    <details open={open} className="group rounded-lg border border-border bg-card overflow-hidden">
      <summary className="cursor-pointer px-5 py-3 bg-muted text-sm font-semibold uppercase tracking-wide text-primary list-none flex items-center justify-between">
        <span>{title}</span>
        <span className="text-muted-foreground group-open:rotate-180 transition">▾</span>
      </summary>
      <div className="p-5 space-y-3">{children}</div>
    </details>
  );
}

function Field({ label, bold, children }: { label: React.ReactNode; bold?: boolean; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className={`block text-xs ${bold ? "font-bold" : "font-medium"} text-muted-foreground mb-1`}>{label}</span>
      {children}
    </label>
  );
}

function InlinePicto({ media, alt }: { media: BrochureMedia | null | undefined; alt: string }) {
  if (!media?.dataUrl) return null;
  return (
    <img
      src={media.dataUrl}
      alt={alt}
      className="inline-flex h-7 w-7 shrink-0 rounded bg-background border border-border object-contain p-1 align-middle"
    />
  );
}

function UploadedMediaPreview({
  media, alt, className, onRemove,
}: {
  media: BrochureMedia;
  alt: string;
  className?: string;
  onRemove: () => void;
}) {
  return (
    <div className="relative inline-block group">
      <img src={media.dataUrl} alt={alt} className={className || "max-h-40 rounded border border-border bg-card object-contain"} />
      <Button
        type="button"
        aria-label="Supprimer l'image"
        title="Supprimer l'image"
        onClick={onRemove}
        className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-sm font-bold leading-none text-primary-foreground shadow hover:bg-destructive"
      >
        ×
      </Button>
    </div>
  );
}


const inputCls =
  "w-full px-3 py-2 rounded-md bg-background border border-border text-foreground text-sm focus:outline-none focus:border-border";

const btnSecondary =
  "text-xs px-3 py-1.5 rounded bg-muted hover:bg-card border border-border text-foreground";

const btnPrimary =
  "text-xs px-3 py-1.5 rounded bg-primary hover:bg-primary border border-border text-primary-foreground font-semibold disabled:opacity-50 disabled:cursor-not-allowed";

const REVENU_LABELS: Array<[keyof BrochureData["revenus"], string]> = [
  ["celibataire", "Célibataire"],
  ["coupleSansEnfants", "Couple sans enfants"],
  ["familleMonoparentale", "Famille monoparentale"],
  ["coupleUnEnfant", "Couple avec 1 enfant"],
  ["coupleDeuxEnfants", "Couple avec 2 enfants"],
  ["coupleTroisEnfants", "Couple avec 3 enfants"],
];

function isGoogleStaticErrorMedia(media: BrochureMedia | null | undefined): boolean {
  // Les cartes de secours OSM/ArcGIS sont des SVG valides : on les conserve,
  // sinon les blocs rouges réapparaissent dès que Google Static Maps refuse la clé.
  void media;
  return false;
}

function googleMapPreview(media: BrochureMedia | null | undefined): BrochureMedia | null {
  return isGoogleStaticErrorMedia(media) ? null : media ?? null;
}

const SETTINGS_DB = "wb_brochure_assets";
const SETTINGS_STORE = "media";
const PICTOS_STORAGE_KEY = "wb_brochure_pictos";
const PORTFOLIO_DRAFT_KEY = "portfolioDraft.v1";
const PORTFOLIO_FALLBACK_KEY = "wb_portfolio_text_backup_v1";
type PortfolioDraft = {
  version: 1;
  assets: BrochureData[];
  active: number;
  updatedAt: number;
};
const settingsMediaKeys = [
  "franceMap",
  "fixedConfidentialiteSlide",
  "fixedAProposSlide",
  ...Array.from({ length: 6 }, (_, i) => `pointsClesPictos.${i}`),
  ...Array.from({ length: 6 }, (_, i) => `revenusPictos.${i}`),
] as const;

function mediaSlots(values: (BrochureMedia | null)[] | undefined, length = 6): (BrochureMedia | null)[] {
  return Array.from({ length }, (_, i) => values?.[i] ?? null);
}

function labelSlots(values: string[] | undefined, length = 6): string[] {
  return Array.from({ length }, (_, i) => values?.[i] ?? POINT_CLE_PICTO_LABELS_DEFAULT[i] ?? "");
}

function pictosPayload(settings: BrochureSettings): BrochurePictosSettings {
  return {
    pointsClesPictos: mediaSlots(settings.pointsClesPictos),
    revenusPictos: mediaSlots(settings.revenusPictos),
    pointsClesPictosLabels: labelSlots(settings.pointsClesPictosLabels),
  };
}

function mergePictosSettings(settings: BrochureSettings, pictos: Partial<BrochurePictosSettings> | null | undefined): BrochureSettings {
  if (!pictos) return settings;
  return {
    ...settings,
    pointsClesPictos: mediaSlots(pictos.pointsClesPictos || settings.pointsClesPictos),
    revenusPictos: mediaSlots(pictos.revenusPictos || settings.revenusPictos),
    pointsClesPictosLabels: labelSlots(pictos.pointsClesPictosLabels || settings.pointsClesPictosLabels),
  };
}

function settingsForLocalStorage(settings: BrochureSettings): BrochureSettings {
  return {
    ...settings,
    franceMap: null,
    // Les pictos sont légers et doivent rester aussi en localStorage : IndexedDB
    // sert de coffre-fort, mais ces deux tableaux évitent toute disparition si
    // IndexedDB est vidé/bloqué entre deux chargements.
    pointsClesPictos: mediaSlots(settings.pointsClesPictos),
    pointsClesPictosLabels: labelSlots(settings.pointsClesPictosLabels),
    revenusPictos: mediaSlots(settings.revenusPictos),
    fixedConfidentialiteSlide: null,
    fixedAProposSlide: null,
    team: settings.team.map((member) => ({ ...member, photo: null })),
    logoLibrary: [],
  };
}

function openSettingsDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(SETTINGS_DB, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(SETTINGS_STORE)) db.createObjectStore(SETTINGS_STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function idbPut(key: string, value: BrochureMedia | null) {
  const db = await openSettingsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, "readwrite");
    const store = tx.objectStore(SETTINGS_STORE);
    if (value) store.put(value, key);
    else store.delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}

async function idbGet(key: string): Promise<BrochureMedia | null> {
  const db = await openSettingsDb();
  const value = await new Promise<BrochureMedia | null>((resolve, reject) => {
    const req = db.transaction(SETTINGS_STORE, "readonly").objectStore(SETTINGS_STORE).get(key);
    req.onsuccess = () => resolve((req.result as BrochureMedia | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

async function idbPutValue<T>(key: string, value: T): Promise<void> {
  const db = await openSettingsDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(SETTINGS_STORE, "readwrite");
    tx.objectStore(SETTINGS_STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
  db.close();
}

async function idbGetValue<T>(key: string): Promise<T | null> {
  const db = await openSettingsDb();
  const value = await new Promise<T | null>((resolve, reject) => {
    const req = db.transaction(SETTINGS_STORE, "readonly").objectStore(SETTINGS_STORE).get(key);
    req.onsuccess = () => resolve((req.result as T | undefined) ?? null);
    req.onerror = () => reject(req.error);
  });
  db.close();
  return value;
}

function portfolioTextBackup(draft: PortfolioDraft): PortfolioDraft {
  const removeMedia = (_key: string, value: unknown) => {
    if (value && typeof value === "object" && "dataUrl" in value && "name" in value) return null;
    return value;
  };
  return JSON.parse(JSON.stringify(draft, removeMedia)) as PortfolioDraft;
}

async function persistSettingsMedia(settings: BrochureSettings) {
  if (typeof indexedDB === "undefined") return;
  const pointPictos = mediaSlots(settings.pointsClesPictos);
  const revenuPictos = mediaSlots(settings.revenusPictos);
  await Promise.all([
    idbPut("franceMap", settings.franceMap),
    idbPut("fixedConfidentialiteSlide", settings.fixedConfidentialiteSlide),
    idbPut("fixedAProposSlide", settings.fixedAProposSlide),
    ...pointPictos.map((media, i) => idbPut(`pointsClesPictos.${i}`, media)),
    ...revenuPictos.map((media, i) => idbPut(`revenusPictos.${i}`, media)),
  ]);
}

async function hydratePersistedSettingsMedia(settings: BrochureSettings): Promise<BrochureSettings> {
  if (typeof indexedDB === "undefined") return settings;
  const entries = await Promise.all(settingsMediaKeys.map(async (key) => [key, await idbGet(key)] as const));
  const next: BrochureSettings = { ...settings, pointsClesPictos: mediaSlots(settings.pointsClesPictos), revenusPictos: mediaSlots(settings.revenusPictos) };
  for (const [key, media] of entries) {
    if (!media) continue;
    if (key === "franceMap") next.franceMap = media;
    else if (key === "fixedConfidentialiteSlide") next.fixedConfidentialiteSlide = media;
    else if (key === "fixedAProposSlide") next.fixedAProposSlide = media;
    else if (key.startsWith("pointsClesPictos.")) next.pointsClesPictos[Number(key.split(".")[1])] = media;
    else if (key.startsWith("revenusPictos.")) next.revenusPictos[Number(key.split(".")[1])] = media;
  }
  return next;
}

function mergeSavedBrochure(parsed: Partial<BrochureData>): BrochureData {
  const base = emptyBrochure();
  return {
    ...base,
    ...parsed,
    carteRegion: googleMapPreview(parsed.carteRegion) ?? base.carteRegion,
    envCarte: googleMapPreview(parsed.envCarte) ?? base.envCarte,
    accessibiliteCarte: googleMapPreview(parsed.accessibiliteCarte) ?? base.accessibiliteCarte,
    settings: { ...base.settings, ...(parsed.settings || {}), logoLibrary: [] },
    revenus: { ...base.revenus, ...(parsed.revenus || {}) },
  };
}

function mergeSavedSettings(
  fullRaw: string | null,
  settingsRaw: string | null,
  pictosRaw: string | null,
): BrochureData | null {
  const base = emptyBrochure();
  const full = fullRaw ? mergeSavedBrochure(JSON.parse(fullRaw) as Partial<BrochureData>) : null;
  const settingsOnly = settingsRaw ? (JSON.parse(settingsRaw) as Partial<BrochureData>) : null;
  const pictosOnly = pictosRaw ? (JSON.parse(pictosRaw) as Partial<BrochureSettings>) : null;
  if (!full && !settingsOnly && !pictosOnly) return null;

  const latestSettings = settingsOnly?.settings || full?.settings || base.settings;
  const legacyPointLabels = ["Picto Surface", "Picto Loyer / m²", "Picto Revenu locatif", "Picto Prix / Rendement", "Picto Trafic", "Picto Nombre de baux"];
  const pointLabels = labelSlots(pictosOnly?.pointsClesPictosLabels || latestSettings.pointsClesPictosLabels);
  if (legacyPointLabels.every((label, i) => (pointLabels[i] || "") === label)) {
    pointLabels.splice(0, pointLabels.length, ...POINT_CLE_PICTO_LABELS_DEFAULT);
  }
  const mergedSettings: BrochureSettings = {
    ...base.settings,
    ...latestSettings,
    pointsClesPictos: mediaSlots(pictosOnly?.pointsClesPictos || latestSettings.pointsClesPictos),
    revenusPictos: mediaSlots(pictosOnly?.revenusPictos || latestSettings.revenusPictos),
    pointsClesPictosLabels: pointLabels,
    logoLibrary: [],
  };
  return {
    ...(full || base),
    settings: mergedSettings,
    comparables: settingsOnly?.comparables || full?.comparables || [],
  };
}

function persistReusableSettings(data: BrochureData) {
  void persistSettingsMedia(data.settings).catch((e) => console.warn("Failed to persist settings media", e));
  try {
    localStorage.setItem(
      PICTOS_STORAGE_KEY,
      JSON.stringify({
        pointsClesPictos: mediaSlots(data.settings.pointsClesPictos),
        revenusPictos: mediaSlots(data.settings.revenusPictos),
        pointsClesPictosLabels: labelSlots(data.settings.pointsClesPictosLabels),
      }),
    );
  } catch (e) {
    console.warn("Failed to persist pictos to localStorage", e);
  }
  try {
    localStorage.setItem(
      "wb_brochure_settings",
      JSON.stringify({ settings: settingsForLocalStorage(data.settings), comparables: data.comparables }),
    );
  } catch (e) {
    console.warn("Failed to persist settings to localStorage (likely size limit)", e);
  }
}

function persistBrochureState(data: BrochureData) {
  // Les Paramètres doivent survivre même quand le brouillon complet devient trop lourd
  // pour le quota localStorage (photos/PPTX/slides fixes en base64).
  persistReusableSettings(data);
  try {
    // setItem remplace la valeur de façon atomique. Ne jamais supprimer l'ancienne
    // sauvegarde avant : si le quota est dépassé, elle reste ainsi récupérable.
    localStorage.setItem("wb_brochure_full", JSON.stringify(data));
  } catch { /* le brouillon complet IndexedDB reste la source fiable */ }
}

// Champs texte à écraser lors d'un import (jamais les médias).
const IMPORT_STRING_FIELDS: Array<keyof BrochureData> = [
  "nomSite", "adresse", "codePostal", "ville", "typeBien", "surface",
  "typeVente", "prixVente", "honoraires", "loyerAnnuel", "loyerM2",
  "descriptionVille", "envSousTitre", "envTrafic", "envCA", "envNbCommerces", "envProjets",
  "populationZone1", "populationZone2", "surfaceZone1", "surfaceZone2",
];

// Champs numériques : on force la mise en forme française (séparateurs d'espaces
// pour les milliers) à l'import pour éviter les valeurs comme "219.429€".
const IMPORT_NUMERIC_FIELDS: Array<keyof BrochureData> = [
  "surface", "prixVente", "honoraires", "loyerAnnuel", "loyerM2",
  "envTrafic", "envCA", "envNbCommerces",
  "populationZone1", "populationZone2", "surfaceZone1", "surfaceZone2",
];

function pickStringFields(src: Partial<BrochureData>): Partial<BrochureData> {
  const out: Record<string, unknown> = {};
  const numeric = new Set<string>(IMPORT_NUMERIC_FIELDS as string[]);
  for (const k of IMPORT_STRING_FIELDS) {
    const v = (src as Record<string, unknown>)[k];
    if (typeof v === "string" && v.trim()) {
      out[k as string] = numeric.has(k as string) ? formatFrThousandsStr(v) : v;
    }
  }
  if (typeof src.dureeZone1 === "number") out.dureeZone1 = src.dureeZone1;
  if (typeof src.dureeZone2 === "number") out.dureeZone2 = src.dureeZone2;
  if (src.modeChalandise === "voiture" || src.modeChalandise === "pieton") out.modeChalandise = src.modeChalandise;
  return out as Partial<BrochureData>;
}

function normalizeLocataireNumbers(rows: RentalRow[]): RentalRow[] {
  return rows.map((r) => ({
    ...r,
    surface: r.surface ? formatFrThousandsStr(r.surface) : r.surface,
    loyerAnnuel: r.loyerAnnuel ? formatFrThousandsStr(r.loyerAnnuel) : r.loyerAnnuel,
    loyerM2: r.loyerM2 ? formatFrThousandsStr(r.loyerM2) : r.loyerM2,
  }));
}

function normalizeRentalRowsForCalculations(rows: RentalRow[]): RentalRow[] {
  return fillLocatairesDurations(normalizeLocataireNumbers(rows)).map((row) => {
    const surf = parseAmt(row.surface);
    const loy = parseAmt(row.loyerAnnuel);
    const loyerM2 = Number.isFinite(surf) && surf > 0 && Number.isFinite(loy) && loy > 0
      ? `${formatFrThousandsStr(String(Math.round(loy / surf)))} €`
      : row.loyerM2;
    return { ...row, loyerM2 };
  });
}



export function BrochureBuilder({ seed, onGenerated }: { seed?: Partial<BrochureData>; onGenerated?: (base64: string, filename: string) => Promise<void> | void }) {
  void useRouter();
  const [data, setDataState] = useState<BrochureData>(() => emptyBrochure());
  const latestDataRef = useRef<BrochureData>(data);
  const setData: Dispatch<SetStateAction<BrochureData>> = useCallback((updater) => {
    const next = typeof updater === "function"
      ? (updater as (value: BrochureData) => BrochureData)(latestDataRef.current)
      : updater;
    latestDataRef.current = next;
    setDataState(next);
  }, []);
  const [storageReady, setStorageReady] = useState(false);
  const [draftStatus, setDraftStatus] = useState<"loading" | "saving" | "saved" | "error">("loading");
  const [cloudDraftStatus, setCloudDraftStatus] = useState<string>("");
  const [tab, setTab] = useState<"generator" | "comparables" | "settings">("generator");
  const [isAdmin, setIsAdmin] = useState(shouldBypassAuthInPreview());
  useEffect(() => {
    if (shouldBypassAuthInPreview()) { setIsAdmin(true); return; }
    supabase.auth.getUser().then(({ data }) => {
      const email = data.user?.email?.toLowerCase() || "";
      setIsAdmin(email === "d.berbia@wallsbroker.com");
    });
  }, []);
  useEffect(() => {
    if (!isAdmin && tab === "settings") setTab("generator");
  }, [isAdmin, tab]);
  const [busy, setBusy] = useState(false);
  const seedKey = seed ? JSON.stringify(seed) : "";
  const seedAppliedRef = useRef("");
  /** Autres actifs du portefeuille (l'actif en cours d'édition est dans `data`). */
  const [otherAssets, setOtherAssets] = useState<BrochureData[]>([]);
  /** Position de l'actif en cours d'édition dans le portefeuille complet. */
  const [activeAsset, setActiveAsset] = useState(0);
  const otherAssetsRef = useRef<BrochureData[]>([]);
  const activeAssetRef = useRef(0);
  const draftPendingRef = useRef<PortfolioDraft | null>(null);
  const draftWritingRef = useRef(false);
  useEffect(() => { otherAssetsRef.current = otherAssets; }, [otherAssets]);
  useEffect(() => { activeAssetRef.current = activeAsset; }, [activeAsset]);
  /** Portefeuille complet, dans l'ordre, actif en cours inclus. */
  const buildFullAssets = useCallback((): BrochureData[] => {
    const arr = [...otherAssetsRef.current];
    const idx = Math.min(Math.max(activeAssetRef.current, 0), arr.length);
    arr.splice(idx, 0, latestDataRef.current);
    return arr;
  }, []);

  // Brouillon propre à chaque actif du CRM : changer d'actif ne perd jamais la saisie en cours.
  useEffect(() => {
    if (!storageReady || !seed || seedAppliedRef.current === seedKey) return;
    seedAppliedRef.current = seedKey;
    const cur = latestDataRef.current;
    const keyOf = (n: string) => `wb_brochure_asset_draft_${n}`;
    const target = seed.nomSite || "";
    if ((cur.nomSite || "") === target) {
      const patch: Partial<BrochureData> = {};
      for (const [k, v] of Object.entries(seed)) {
        const ck = k as keyof BrochureData;
        const empty = !cur[ck] || (Array.isArray(cur[ck]) && (cur[ck] as unknown[]).length === 0);
        if (empty && v) (patch as Record<string, unknown>)[k] = v;
      }
      setData((d) => ({ ...d, ...patch }));
      return;
    }
    try {
      if (cur.nomSite) localStorage.setItem(keyOf(cur.nomSite), JSON.stringify({ ...cur, settings: undefined, comparables: undefined }));
    } catch { /* stockage plein : on continue */ }
    let saved: Partial<BrochureData> | null = null;
    try { const raw = localStorage.getItem(keyOf(target)); saved = raw ? JSON.parse(raw) : null; } catch { saved = null; }
    if (saved && !saved.plans?.length && seed.plans?.length) saved.plans = seed.plans;
    setData((d) => ({ ...emptyBrochure(), ...(saved || seed), settings: d.settings, comparables: d.comparables }));
  }, [storageReady, seedKey]);

  const [autoBusy, setAutoBusy] = useState<string | null>(null);
  const gen = useServerFn(generateBrochure);
  const iso = useServerFn(fetchIsochrones);
  const gmap = useServerFn(fetchGoogleMap);
  const gnearby = useServerFn(fetchNearbyEnseignes);
  const aiEnrich = useServerFn(enrichContent);
  const aiRevenus = useServerFn(fetchRevenus);
  const doImport = useServerFn(importBrochure);
  const doImportEtat = useServerFn(importEtatLocatif);
  const [etatBusy, setEtatBusy] = useState(false);
  const doListFolders = useServerFn(listAllMailFolders);
  const doListMessages = useServerFn(listFolderMessages);
  const doScanMessage = useServerFn(scanMessage);
  const doExtractText = useServerFn(extractRecordsFromText);
  const getPictosSettings = useServerFn(getBrochurePictosSettings);
  const loadSharedComparables = useServerFn(getSharedComparables);
  const pushSharedComparables = useServerFn(saveSharedComparables);
  const doMailIngest = useServerFn(runMailIngest);
  const savePictosSettings = useServerFn(saveBrochurePictosSettings);
  const loadCloudDraft = useServerFn(getCloudPortfolioDraft);
  const pushCloudDraft = useServerFn(saveCloudPortfolioDraft);
  const hadLocalDraftRef = useRef(false);
  const cloudTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cloudWritingRef = useRef(false);
  const autoMapHydrationRef = useRef("");
  const [pipelineStatus, setPipelineStatus] = useState<string>("");
  const [pipelineBusy, setPipelineBusy] = useState(false);
  const [mapErrors, setMapErrors] = useState<Partial<Record<MapKind, string>>>({});
  const [addPointOpen, setAddPointOpen] = useState(false);
  const [newPointTitle, setNewPointTitle] = useState("");
  const [newPointPicto, setNewPointPicto] = useState<BrochureMedia | null>(null);

  useEffect(() => {
    let cancelled = false;
    const finish = async (value: BrochureData, restoredAssets?: BrochureData[], restoredActive = 0) => {
      try {
        const settings = await hydratePersistedSettingsMedia(value.settings);
        if (!cancelled) {
          const hydrated = { ...value, settings };
          latestDataRef.current = hydrated;
          setData(hydrated);
          if (restoredAssets) {
            const rest = restoredAssets.filter((_, i) => i !== restoredActive);
            otherAssetsRef.current = rest;
            activeAssetRef.current = restoredActive;
            setOtherAssets(rest);
            setActiveAsset(restoredActive);
          }
        }
      } catch {
        if (!cancelled) {
          latestDataRef.current = value;
          setData(value);
        }
      } finally {
        if (!cancelled) {
          setStorageReady(true);
          setDraftStatus("saved");
        }
      }
    };
    void (async () => {
      try {
        await navigator.storage?.persist?.();
        let draft = await idbGetValue<PortfolioDraft>(PORTFOLIO_DRAFT_KEY);
        if (!draft) {
          const fallbackRaw = localStorage.getItem(PORTFOLIO_FALLBACK_KEY);
          if (fallbackRaw) draft = JSON.parse(fallbackRaw) as PortfolioDraft;
        }
        if (draft?.version === 1 && Array.isArray(draft.assets) && draft.assets.length) {
          hadLocalDraftRef.current = true;
          const assets = draft.assets.map((asset) => mergeSavedBrochure(asset));
          const active = Math.min(Math.max(draft.active || 0, 0), assets.length - 1);
          await finish(assets[active], assets, active);
          return;
        }
        const savedFull = localStorage.getItem("wb_brochure_full");
        const savedSettings = localStorage.getItem("wb_brochure_settings");
        const savedPictos = localStorage.getItem(PICTOS_STORAGE_KEY);
        const saved = mergeSavedSettings(savedFull, savedSettings, savedPictos);
        const legacyAssetsRaw = localStorage.getItem("wb_brochure_assets");
        if (saved && legacyAssetsRaw) {
          const legacy = JSON.parse(legacyAssetsRaw) as { others?: BrochureData[]; active?: number };
          const others = Array.isArray(legacy.others) ? legacy.others.map(mergeSavedBrochure) : [];
          const active = Math.min(Math.max(legacy.active ?? 0, 0), others.length);
          const assets = [...others];
          assets.splice(active, 0, saved);
          await finish(saved, assets, active);
          return;
        }
        await finish(saved || emptyBrochure());
      } catch (error) {
        console.error("Impossible de restaurer le brouillon du portefeuille", error);
        if (!cancelled) {
          setDraftStatus("error");
          await finish(emptyBrochure());
        }
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!storageReady || shouldBypassAuthInPreview()) return;
    let cancelled = false;
    (async () => {
      let { data: { session } } = await supabase.auth.getSession();
      for (let i = 0; i < 30 && !session?.access_token; i++) {
        await new Promise((r) => setTimeout(r, 150));
        ({ data: { session } } = await supabase.auth.getSession());
      }
      if (!session?.access_token || cancelled) return;
      try {
        const cloudPictos = await getPictosSettings();
        if (cancelled) return;
        if (cloudPictos) {
          commitData((d) => ({ ...d, settings: mergePictosSettings(d.settings, cloudPictos) }));
        } else {
          await savePictosSettings({ data: pictosPayload(latestDataRef.current.settings) });
        }
      } catch (e) {
        console.warn("Failed to sync brochure pictos settings", e);
      }
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageReady]);

  // Hydratation des photos équipe par défaut (asset URL → base64) au premier chargement
  const teamHydratedRef = useRef(false);
  useEffect(() => {
    if (teamHydratedRef.current) return;
    const targets = data.settings.team
      .map((m, i) => ({ i, url: m.defaultPhotoUrl }))
      .filter((x) => x.url && !data.settings.team[x.i].photo);
    if (targets.length === 0) { teamHydratedRef.current = true; return; }
    teamHydratedRef.current = true;
    (async () => {
      for (const { i, url } of targets) {
        try {
          const r = await fetch(url!);
          if (!r.ok) continue;
          const blob = await r.blob();
          const dataUrl: string = await new Promise((resolve) => {
            const fr = new FileReader();
            fr.onload = () => resolve(fr.result as string);
            fr.readAsDataURL(blob);
          });
          setData((d) => {
            const team = [...d.settings.team];
            if (team[i] && !team[i].photo) team[i] = { ...team[i], photo: { dataUrl, name: `team-${i}.png` } };
            return { ...d, settings: { ...d.settings, team } };
          });
        } catch { /* ignore */ }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hydratation des pictos points-clés + carte France par défaut au premier chargement
  const assetsHydratedRef = useRef(false);
  useEffect(() => {
    if (assetsHydratedRef.current) return;
    assetsHydratedRef.current = true;
    const urlToDataUrl = async (url: string): Promise<string | null> => {
      try {
        const r = await fetch(url);
        if (!r.ok) return null;
        const blob = await r.blob();
        return await new Promise<string>((res) => {
          const fr = new FileReader();
          fr.onload = () => res(fr.result as string);
          fr.readAsDataURL(blob);
        });
      } catch { return null; }
    };
    (async () => {
      const targets: Array<{ slot: 0 | 1 | 2; url: string }> = [
        { slot: 0, url: pictoSurfaceAsset.url },
        { slot: 1, url: pictoLoyerAsset.url },
        { slot: 2, url: pictoRevenuAsset.url },
      ];
      for (const t of targets) {
        if (data.settings.pointsClesPictos[t.slot]) continue;
        const dataUrl = await urlToDataUrl(t.url);
        if (!dataUrl) continue;
        setData((d) => {
          const arr = [...d.settings.pointsClesPictos];
          if (!arr[t.slot]) arr[t.slot] = { dataUrl, name: `picto-${t.slot}.png` };
          return { ...d, settings: { ...d.settings, pointsClesPictos: arr } };
        });
      }
      if (!data.settings.franceMap || data.settings.franceMap.name === "carte_france.png") {
        const dataUrl = await urlToDataUrl(franceMapAsset.url);
        if (dataUrl) {
          setData((d) => ({ ...d, settings: { ...d.settings, franceMap: { dataUrl, name: "carte_france_navy.png" } } }));
        }
      }
      if (!data.settings.fixedAProposSlide) {
        const dataUrl = await urlToDataUrl(aProposPptxAsset.url);
        if (dataUrl) {
          setData((d) => d.settings.fixedAProposSlide ? d : ({ ...d, settings: { ...d.settings, fixedAProposSlide: { dataUrl, name: "A_propos.pptx" } } }));
        }
      }
      if (!data.settings.fixedConfidentialiteSlide) {
        const dataUrl = await urlToDataUrl(confidentialitePptxAsset.url);
        if (dataUrl) {
          setData((d) => d.settings.fixedConfidentialiteSlide ? d : ({ ...d, settings: { ...d.settings, fixedConfidentialiteSlide: { dataUrl, name: "Confidentialite.pptx" } } }));
        }
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!storageReady) return;
    latestDataRef.current = data;
    try {
      persistBrochureState(data);
    } catch {}
  }, [data, storageReady]);

  // Brouillon unifié du portefeuille dans IndexedDB : les photos et plans ne sont
  // plus soumis à la petite limite de localStorage. Les écritures sont sérialisées
  // afin qu'une sauvegarde lente ne puisse jamais écraser une version plus récente.
  useEffect(() => {
    if (!storageReady) return;
    const assets = buildFullAssets();
    const draft: PortfolioDraft = { version: 1, assets, active: activeAssetRef.current, updatedAt: Date.now() };
    setDraftStatus("saving");
    try {
      localStorage.setItem(PORTFOLIO_FALLBACK_KEY, JSON.stringify(portfolioTextBackup(draft)));
    } catch (error) {
      console.warn("Impossible d'enregistrer la sauvegarde texte du portefeuille", error);
    }
    draftPendingRef.current = draft;
    if (draftWritingRef.current) return;
    draftWritingRef.current = true;
    void (async () => {
      try {
        // Une seule écriture à la fois, en sautant les versions intermédiaires :
        // une saisie rapide avec de grosses photos ne crée jamais une longue file obsolète.
        while (draftPendingRef.current) {
          const latest = draftPendingRef.current;
          draftPendingRef.current = null;
          await idbPutValue(PORTFOLIO_DRAFT_KEY, latest);
        }
        setDraftStatus("saved");
      } catch (error) {
        console.error("Impossible d'enregistrer le brouillon du portefeuille", error);
        setDraftStatus("error");
      } finally {
        draftWritingRef.current = false;
      }
    })();
  }, [data, otherAssets, activeAsset, storageReady, buildFullAssets]);

  /** Applique un portefeuille restauré (cloud ou local) dans l'éditeur. */
  const applyRestoredAssets = useCallback(async (assets: BrochureData[], active: number) => {
    if (!assets.length) return;
    const idx = Math.min(Math.max(active || 0, 0), assets.length - 1);
    const rest = assets.filter((_, i) => i !== idx);
    otherAssetsRef.current = rest;
    activeAssetRef.current = idx;
    setOtherAssets(rest);
    setActiveAsset(idx);
    setData(assets[idx]);
    await Promise.resolve();
  }, [setData]);

  /** Sauvegarde du portefeuille sur le serveur : les saisies survivent même si le navigateur est vidé. */
  const saveDraftToCloud = useCallback(async (silent = true) => {
    if (cloudWritingRef.current) return;
    if (!(await hasSupabaseSession())) {
      if (!silent) setCloudDraftStatus("Connexion requise pour la sauvegarde serveur");
      return;
    }
    const assets = buildFullAssets();
    if (!assets.length) return;
    cloudWritingRef.current = true;
    if (!silent) setCloudDraftStatus("Sauvegarde serveur…");
    try {
      const res = await pushCloudDraft({
        data: { version: 1, assets, active: activeAssetRef.current, updatedAt: Date.now() },
      });
      setCloudDraftStatus(`✓ ${res.count} actif${res.count > 1 ? "s" : ""} sauvegardé${res.count > 1 ? "s" : ""} sur le serveur`);
    } catch (error) {
      console.warn("Sauvegarde serveur du portefeuille impossible", error);
      setCloudDraftStatus("Sauvegarde serveur indisponible");
    } finally {
      cloudWritingRef.current = false;
    }
  }, [buildFullAssets, pushCloudDraft]);

  const restoreDraftFromCloud = useCallback(async () => {
    if (!(await hasSupabaseSession())) {
      setCloudDraftStatus("Connexion requise pour la restauration serveur");
      return;
    }
    setCloudDraftStatus("Restauration depuis le serveur…");
    try {
      const draft = await loadCloudDraft();
      if (!draft?.assets?.length) {
        setCloudDraftStatus("Aucune sauvegarde serveur disponible");
        return;
      }
      await applyRestoredAssets(draft.assets, draft.active);
      setCloudDraftStatus(`✓ ${draft.assets.length} actif${draft.assets.length > 1 ? "s" : ""} restauré${draft.assets.length > 1 ? "s" : ""} depuis le serveur`);
    } catch (error) {
      console.warn("Restauration serveur impossible", error);
      setCloudDraftStatus("Restauration serveur impossible");
    }
  }, [applyRestoredAssets, loadCloudDraft]);

  // Sauvegarde serveur automatique (différée) de tout le portefeuille.
  useEffect(() => {
    if (!storageReady) return;
    if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current);
    cloudTimerRef.current = setTimeout(() => { void saveDraftToCloud(true); }, 8000);
    return () => { if (cloudTimerRef.current) clearTimeout(cloudTimerRef.current); };
  }, [data, otherAssets, activeAsset, storageReady, saveDraftToCloud]);

  // Si le navigateur n'a plus rien en local, on récupère automatiquement la sauvegarde serveur.
  const cloudRestoreTriedRef = useRef(false);
  useEffect(() => {
    if (!storageReady || cloudRestoreTriedRef.current) return;
    cloudRestoreTriedRef.current = true;
    if (hadLocalDraftRef.current || seed) return; // actif du CRM : la fiche de l'actif prime sur le brouillon serveur
    void (async () => {
      try {
        if (!(await hasSupabaseSession())) return;
        const draft = await loadCloudDraft();
        if (draft?.assets?.length) {
          await applyRestoredAssets(draft.assets, draft.active);
          setCloudDraftStatus(`✓ ${draft.assets.length} actif${draft.assets.length > 1 ? "s" : ""} restauré${draft.assets.length > 1 ? "s" : ""} depuis le serveur`);
        }
      } catch { /* pas de session ou pas de sauvegarde : on ignore */ }
    })();
  }, [storageReady, loadCloudDraft, applyRestoredAssets]);

  // Auto-recalcule les points clés (chiffres uniquement) dès que l'état locatif, le prix,
  // les honoraires, le code postal ou le nombre de parkings changent — uniquement si
  // l'utilisateur n'a pas customisé les libellés de pictos.
  useEffect(() => {
    if (!storageReady) return;
    const currentLabels = data.settings.pointsClesPictosLabels || [];
    const auto = computeAutoPointsCles(data);
    // On ne remplace que si les libellés actuels sont exactement ceux calculés
    // (donc jamais après un ajout manuel via le pop-up "+ Ajouter").
    const sameLabels = auto.labels.every((l, i) => (currentLabels[i] || "") === l);
    if (!sameLabels) return;
    const sameValues = auto.values.every((v, i) => (data.pointsCles[i] || "") === v);
    if (sameValues) return;
    setData((d) => ({ ...d, pointsCles: auto.values }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.locataires, data.prixVente, data.honoraires, data.codePostal, data.nbParkings, storageReady]);

  const commitData = (updater: BrochureData | ((current: BrochureData) => BrochureData)) => {
    setData((current) => {
      const next = typeof updater === "function" ? updater(current) : updater;
      latestDataRef.current = next;
      return next;
    });
  };

  const resetAll = () => {
    if (confirm("Effacer TOUTES les données saisies (le contenu des Paramètres et Comparables reste) ?")) {
      const base = emptyBrochure();
      commitData((d) => ({ ...base, settings: d.settings, comparables: d.comparables }));
    }
  };

  const restoreDefaultTeam = () => {
    if (!confirm("Restaurer l'équipe Wallsbroker par défaut (6 membres avec photos) ? Vos ajouts personnalisés seront écrasés.")) return;
    const base = emptyBrochure();
    setData((d) => ({ ...d, settings: { ...d.settings, team: base.settings.team } }));
    teamHydratedRef.current = false;
  };

  // ─── IMPORT multi-documents (baux, plans, brochure…) ─────
  // Plusieurs fichiers peuvent être importés à la suite : chaque document
  // COMPLÈTE la brochure (les champs déjà remplis ne sont jamais écrasés),
  // les photos/plans détectés sont ajoutés, jusqu'à validation puis génération.
  const [importBusy, setImportBusy] = useState(false);
  const [importProgress, setImportProgress] = useState("");

  /** Fusionne les données extraites d'un document dans la brochure courante (complétion progressive). */
  const mergeImportedData = (
    current: BrochureData,
    parsed: Partial<BrochureData>,
    comps: Comparable[],
    images: ImportedMedia[],
  ): BrochureData => {
    const { merged: comparables, added } = comps.length
      ? mergeUniqueComparables(current.comparables, comps)
      : { merged: current.comparables, added: 0 };
    if (comps.length) console.info(`[import] ${added} comparable(s) ajouté(s) automatiquement`);

    // Champs texte : on ne remplit QUE les champs encore vides.
    const strs = pickStringFields(parsed);
    const filled: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(strs)) {
      const cur = (current as unknown as Record<string, unknown>)[k];
      if (cur === "" || cur === undefined || cur === null) filled[k] = v;
    }
    const nbParkings = current.nbParkings
      ? current.nbParkings
      : typeof (parsed as { nbParkings?: string }).nbParkings === "string"
        ? formatFrThousandsStr((parsed as { nbParkings: string }).nbParkings)
        : current.nbParkings;

    // Locataires : fusion sans doublon (enseigne + surface).
    const incoming = (parsed.locataires || []).filter((r) => r && (r.enseigne || r.surface || r.loyerAnnuel));
    let locataires = current.locataires;
    if (incoming.length) {
      const existing = current.locataires.filter((r) => r.enseigne || r.surface || r.loyerAnnuel);
      const keys = new Set(existing.map((r) => `${r.enseigne}|${r.surface}`.toLowerCase()));
      const toAdd = incoming.filter((r) => !keys.has(`${r.enseigne}|${r.surface}`.toLowerCase()));
      locataires = normalizeRentalRowsForCalculations([...existing, ...toAdd] as RentalRow[]);
    }

    // Revenus : remplit uniquement les cases vides.
    const revenus = { ...current.revenus };
    if (parsed.revenus) {
      for (const [k, v] of Object.entries(parsed.revenus)) {
        const key = k as keyof typeof revenus;
        if (!revenus[key] && typeof v === "string" && v.trim()) revenus[key] = v;
      }
    }

    // Photos / plans détectés dans le document : ajoutés sans doublon (par nom).
    const seenMedia = new Set(
      [...current.photos, ...current.plans, ...(current.planMasse ? [current.planMasse] : [])].map((m) => m.name),
    );
    const newPhotos = images
      .filter((i) => i.category === "photos" && !seenMedia.has(i.name))
      .map((i) => ({ dataUrl: i.dataUrl, name: i.name }));
    const newPlans = images
      .filter((i) => i.category === "plans" && !seenMedia.has(i.name))
      .map((i) => ({ dataUrl: i.dataUrl, name: i.name }));
    const photos = [...current.photos, ...newPhotos];
    const plans = [...current.plans, ...newPlans];
    const photoCouverture = current.photoCouverture || newPhotos[0] || null;
    let planMasse = current.planMasse;
    if (!planMasse) {
      const masse = plans.find((p) => /masse/i.test(p.name));
      if (masse) planMasse = masse;
    }

    const next: BrochureData = {
      ...current,
      ...filled,
      nbParkings,
      revenus,
      locataires,
      nbLocataires: locataires.length || current.nbLocataires,
      comparables,
      photos,
      plans,
      photoCouverture,
      planMasse,
    };
    // Points clés auto : uniquement des chiffres, calculés depuis état locatif + prix.
    const auto = computeAutoPointsCles(next);
    next.pointsCles = auto.values;
    next.settings = {
      ...next.settings,
      pointsClesPictosLabels: auto.labels,
    };
    return next;
  };

  const onImportFile = async (file: File, mode: "full" | "comparablesOnly") => {
    const extracted = await extractAny(file);
    const res = await doImport({
      data: extracted.kind === "pdf"
        ? { filename: extracted.filename, pdfBase64: extracted.base64 }
        : { filename: extracted.filename, text: extracted.text },
    });
    if (res.error) throw new Error(res.error);
    const parsed = JSON.parse(res.json) as Partial<BrochureData> & { comparables?: Array<Omit<Comparable, "id" | "source">> };
    // Toujours exploiter les comparables présents dans le fichier importé
    const comps: Comparable[] = (parsed.comparables || []).map((c) => ({
      id: crypto.randomUUID(),
      kind: (c as { kind?: "location" | "prix" }).kind || (((c as { prixVente?: string }).prixVente) ? "prix" : "location"),
      enseigne: c.enseigne || "",
      ville: (parsed as { ville?: string }).ville || "",
      codePostal: (parsed as { codePostal?: string }).codePostal || (c as { codePostal?: string }).codePostal || "",
      adresse: (parsed as { adresse?: string }).adresse || "",
      surface: c.surface || "",
      loyerAnnuel: c.loyerAnnuel || "",
      loyerM2: c.loyerM2 || "",
      prixVente: (c as { prixVente?: string }).prixVente || "",
      dateSignature: c.dateSignature || "",
      source: `Import ${file.name}`,
      notes: c.notes || "",
    }));
    if (mode === "comparablesOnly") {
      const addedComps = comps.length ? addComparablesBulk(comps) : 0;
      alert(`${addedComps} comparable(s) importé(s) depuis ${file.name}${addedComps < comps.length ? ` (${comps.length - addedComps} doublon(s) ignoré(s))` : ""}.`);
      return;
    }
    setData((current) => mergeImportedData(current, parsed, comps, extracted.images));
  };

  /** Importe plusieurs documents à la suite ; la brochure se complète au fur et à mesure. */
  const onImportFiles = async (files: File[]) => {
    if (!files.length) return;
    setImportBusy(true);
    const errors: string[] = [];
    try {
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setImportProgress(files.length > 1 ? `Import ${i + 1}/${files.length} — ${f.name}` : `Import — ${f.name}`);
        try {
          await onImportFile(f, "full");
        } catch (e) {
          errors.push(`${f.name} : ${(e as Error).message}`);
        }
      }
    } finally {
      setImportBusy(false);
      setImportProgress("");
    }
    if (errors.length) {
      alert("Certains fichiers n'ont pas pu être importés :\n" + errors.join("\n"));
    }
  };

  // ─── OUTLOOK : scan des emails pour comparables ─────────
  const [mailBusy, setMailBusy] = useState<string | null>(null);
  const [mailList, setMailList] = useState<Array<{ id: string; subject: string; from: string; date: string }>>([]);
  const [mailKeyword, setMailKeyword] = useState("");
  const [mailError, setMailError] = useState("");

  /** Récupère le texte d'une pièce PPTX/DOCX renvoyée en base64 par le serveur. */
  const docTextFromBase64 = async (name: string, contentType: string, base64: string): Promise<string> => {
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const file = new File([new Blob([bytes], { type: contentType })], name, { type: contentType });
    return /\.pptx$/i.test(name) ? await extractPptxText(file) : await extractDocxText(file);
  };

  /** Analyse un email complet (corps + PDF + PPTX/DOCX) et enregistre les fiches. */
  const processMessage = async (
    msgId: string,
    subject: string,
  ): Promise<{ added: number; updated: number; errors: string[] }> => {
    const res = await doScanMessage({ data: { messageId: msgId } });
    const records = [...res.records];
    const errors = [...res.errors];
    for (const doc of res.pendingDocs) {
      try {
        const text = await docTextFromBase64(doc.name, doc.contentType, doc.base64);
        const ex = await doExtractText({
          data: { source: `${subject} — ${doc.name}`, emailDate: res.emailDate, text },
        });
        records.push(...ex.records);
      } catch (e) {
        errors.push(`${doc.name}: ${(e as Error).message}`);
      }
    }
    if (!records.length) return { added: 0, updated: 0, errors };
    const { added, updated } = upsertScanRecords(records, res.emailDate, `Email — ${subject}`);
    return { added, updated, errors };
  };

  const onScanOutlook = async () => {
    setMailBusy("list");
    setMailError("");
    try {
      const kw = mailKeyword.trim().toLowerCase();
      const collected: Array<{ id: string; subject: string; from: string; date: string }> = [];
      let skip = 0;
      for (let page = 0; page < 8 && collected.length < 40; page++) {
        const r = await doListMessages({ data: { skip, pageSize: 50 } });
        for (const m of r.messages) {
          if (kw && !`${m.subject} ${m.from}`.toLowerCase().includes(kw)) continue;
          collected.push({ id: m.id, subject: m.subject, from: m.from, date: m.date });
        }
        if (r.done) break;
        skip = r.nextSkip;
      }
      setMailList(collected.slice(0, 40));
      if (!collected.length) setMailError("Aucun email trouvé pour ce mot-clé.");
    } catch (e) {
      setMailError((e as Error).message);
    } finally { setMailBusy(null); }
  };

  const onExtractFromMail = async (msgId: string, subject: string) => {
    setMailBusy(msgId);
    setMailError("");
    try {
      const { added, updated, errors } = await processMessage(msgId, subject);
      if (errors.length) setMailError(errors.join(" · "));
      alert(`« ${subject} » : ${added} fiche(s) ajoutée(s), ${updated} mise(s) à jour.`);
    } catch (e) {
      setMailError((e as Error).message);
      alert("Erreur : " + (e as Error).message);
    } finally { setMailBusy(null); }
  };

  // ─── SCAN COMPLET DE LA BOÎTE (arrière-plan, inclut Archive) ─────────
  const [fullScan, setFullScan] = useState<{
    running: boolean;
    stop: boolean;
    folder: string;
    foldersDone: number;
    foldersTotal: number;
    mailsDone: number;
    added: number;
    updated: number;
    lastError: string;
  } | null>(null);
  const fullScanStopRef = useRef(false);

  const startFullMailboxScan = async () => {
    if (fullScan?.running) return;
    fullScanStopRef.current = false;
    setFullScan({ running: true, stop: false, folder: "…", foldersDone: 0, foldersTotal: 0, mailsDone: 0, added: 0, updated: 0, lastError: "" });
    try {
      const { folders } = await doListFolders({ data: {} });
      const useful = folders.filter((f) => !/brouillon|draft|indésirable|junk|supprim|deleted/i.test(f.name));
      setFullScan((s) => (s ? { ...s, foldersTotal: useful.length } : s));
      let mailsDone = 0;
      let added = 0;
      let updated = 0;
      for (let fi = 0; fi < useful.length; fi++) {
        if (fullScanStopRef.current) break;
        const f = useful[fi];
        setFullScan((s) => (s ? { ...s, folder: f.name, foldersDone: fi } : s));
        let skip = 0;
        for (;;) {
          if (fullScanStopRef.current) break;
          let page: { messages: Array<{ id: string; subject: string }>; nextSkip: number; done: boolean };
          try {
            page = await doListMessages({ data: { folderId: f.id, skip, pageSize: 25 } });
          } catch (e) {
            setFullScan((s) => (s ? { ...s, lastError: (e as Error).message } : s));
            break;
          }
          for (const m of page.messages) {
            if (fullScanStopRef.current) break;
            mailsDone += 1;
            try {
              const r = await processMessage(m.id, m.subject || "(sans objet)");
              added += r.added;
              updated += r.updated;
              setFullScan((s) => (s ? { ...s, mailsDone, added, updated, lastError: r.errors[0] || s.lastError } : s));
            } catch (e) {
              setFullScan((s) => (s ? { ...s, mailsDone, lastError: (e as Error).message } : s));
            }
            await new Promise((r) => setTimeout(r, 0));
          }
          if (page.done) break;
          skip = page.nextSkip;
        }
      }
    } catch (e) {
      console.error("full scan error", e);
      setFullScan((s) => (s ? { ...s, lastError: (e as Error).message } : s));
    } finally {
      setFullScan((s) => (s ? { ...s, running: false } : null));
    }
  };

  const stopFullMailboxScan = () => {
    fullScanStopRef.current = true;
    setFullScan((s) => (s ? { ...s, stop: true } : s));
  };



  const update = <K extends keyof BrochureData>(key: K, value: BrochureData[K]) =>
    commitData((d) => ({ ...d, [key]: value }));

  const persistPictosToCloud = (settings: BrochureSettings) => {
    if (shouldBypassAuthInPreview()) return;
    void supabase.auth.getSession().then(async ({ data: { session } }) => {
      for (let i = 0; i < 10 && !session?.access_token; i++) {
        await new Promise((r) => setTimeout(r, 150));
        ({ data: { session } } = await supabase.auth.getSession());
      }
      if (!session?.access_token) return;
      return savePictosSettings({ data: pictosPayload(settings) });
    }).catch((e) => console.warn("Failed to save pictos settings", e));
  };

  const updateSettings = <K extends keyof BrochureData["settings"]>(key: K, value: BrochureData["settings"][K]) =>
    commitData((d) => {
      const next = { ...d, settings: { ...d.settings, [key]: value } };
      if (key === "pointsClesPictosLabels") {
        persistPictosToCloud(next.settings);
      }
      return next;
    });

  const onGenerateIsochrone = async () => {
    const address = [data.adresse, data.codePostal, data.ville].filter(Boolean).join(", ");
    if (!address) {
      alert("Renseignez d'abord l'adresse, le code postal et la ville.");
      return;
    }
    setAutoBusy("iso");
    try {
      const res = await iso({
        data: {
          address, mode: data.modeChalandise,
          minutes1: data.dureeZone1, minutes2: data.dureeZone2,
        },
      });
      update("chalandiseImage", { dataUrl: res.dataUrl, name: "isochrone.png" });
      if (res.population1) update("populationZone1", formatFrThousandsStr(String(res.population1)));
      if (res.population2) update("populationZone2", formatFrThousandsStr(String(res.population2)));
    } catch (e) {
      alert("Erreur isochrone : " + (e as Error).message);
    } finally {
      setAutoBusy(null);
    }
  };

  const composedAddress = () => [data.adresse, data.codePostal, data.ville].filter(Boolean).join(", ");

  const onFetchMap = async (kind: MapKind) => {
    const address = composedAddress();
    if (!address) { alert("Renseignez l'adresse."); return; }
    setAutoBusy("map-" + kind);
    try {
      setMapErrors((e) => ({ ...e, [kind]: undefined }));
      const s = data.mapsSettings?.[kind];
      const res = await gmap({ data: { address, kind, lat: s?.lat, lng: s?.lng, zoom: s?.zoom } });
      const media: BrochureMedia | null = res.dataUrl ? { dataUrl: res.dataUrl, name: `map-${kind}.png` } : null;
      if (kind === "localisation") update("carteRegion", media);
      else if (kind === "environnement") update("envCarte", media);
      else update("accessibiliteCarte", media);
      if (res.error) setMapErrors((prev) => ({ ...prev, [kind]: res.error }));
      // Mémorise le centre géocodé si le pin n'était pas encore placé.
      if (!s) {
        setData((d) => ({
          ...d,
          mapsSettings: {
            ...(d.mapsSettings || {}),
            [kind]: { lat: res.center.lat, lng: res.center.lng, zoom: getPreferredZoom(kind) },
          },
        }));
      }
    } catch (e) {
      const message = (e as Error).message;
      setMapErrors((prev) => ({ ...prev, [kind]: message }));
      if (kind === "localisation") update("carteRegion", null);
      else if (kind === "environnement") update("envCarte", null);
      else update("accessibiliteCarte", null);
      alert("Erreur carte Google Maps : " + (e as Error).message);
    } finally {
      setAutoBusy(null);
    }
  };

  // Met à jour la Static Map exportée à partir des réglages actuels du pin/zoom.
  const refreshMapMedia = async (kind: MapKind, v: InteractiveMapValue) => {
    const address = composedAddress();
    try {
      setMapErrors((e) => ({ ...e, [kind]: undefined }));
      const res = await gmap({ data: { address, kind, lat: v.lat, lng: v.lng, zoom: v.zoom } });
      const media: BrochureMedia | null = res.dataUrl ? { dataUrl: res.dataUrl, name: `map-${kind}.png` } : null;
      if (kind === "localisation") update("carteRegion", media);
      else if (kind === "environnement") update("envCarte", media);
      else update("accessibiliteCarte", media);
      if (res.error) setMapErrors((prev) => ({ ...prev, [kind]: res.error }));
    } catch (e) {
      setMapErrors((prev) => ({ ...prev, [kind]: (e as Error).message }));
      console.warn("refresh map", e);
    }
  };

  const setMapSettings = (kind: MapKind, v: InteractiveMapValue) => {
    if (typeof v.zoom === "number") rememberPreferredZoom(kind, v.zoom);
    setData((d) => ({
      ...d,
      mapsSettings: { ...(d.mapsSettings || {}), [kind]: v },
    }));
  };

  // Répare aussi les anciens brouillons sauvegardés sans coordonnées : dès qu'une
  // adresse existe, les 3 cartes se relancent une fois et apparaissent dans le générateur.
  useEffect(() => {
    if (!storageReady || pipelineBusy) return;
    const address = [data.adresse, data.codePostal, data.ville].filter(Boolean).join(", ");
    if (!address || !data.ville) return;
    const missingKinds = (["localisation", "environnement", "accessibilite"] as MapKind[])
      .filter((kind) => !data.mapsSettings?.[kind]);
    if (!missingKinds.length) return;
    const key = `${address}|${missingKinds.join(",")}`;
    if (autoMapHydrationRef.current === key) return;
    autoMapHydrationRef.current = key;
    let cancelled = false;
    (async () => {
      const results = await Promise.allSettled(
        missingKinds.map((kind) => gmap({ data: { address, kind, zoom: getPreferredZoom(kind) } }).then((res) => ({ kind, res }))),
      );
      if (cancelled) return;
      setData((d) => {
        const next: BrochureData = { ...d, mapsSettings: { ...(d.mapsSettings || {}) } };
        for (const [index, result] of results.entries()) {
          if (result.status !== "fulfilled") {
            const kind = missingKinds[index];
            if (kind === "localisation") next.carteRegion = null;
            else if (kind === "environnement") next.envCarte = null;
            else if (kind === "accessibilite") next.accessibiliteCarte = null;
            continue;
          }
          const { kind, res } = result.value;
          const media: BrochureMedia | null = res.dataUrl ? { dataUrl: res.dataUrl, name: `map-${kind}.png` } : null;
          if (kind === "localisation") next.carteRegion = media;
          else if (kind === "environnement") next.envCarte = media;
          else next.accessibiliteCarte = media;
          next.mapsSettings = {
            ...(next.mapsSettings || {}),
            [kind]: { lat: res.center.lat, lng: res.center.lng, zoom: getPreferredZoom(kind) },
          };
        }
        return next;
      });
      const failed: Partial<Record<MapKind, string>> = {};
      results.forEach((result, index) => {
        if (result.status === "rejected") failed[missingKinds[index]] = (result.reason as Error).message;
        else if (result.value.res.error) failed[result.value.kind] = result.value.res.error;
      });
      if (Object.keys(failed).length) setMapErrors((prev) => ({ ...prev, ...failed }));
    })();
    return () => { cancelled = true; };
  }, [data.adresse, data.codePostal, data.ville, data.mapsSettings, gmap, pipelineBusy, storageReady]);



  const onScanEnseignes = async () => {
    const address = composedAddress();
    if (!address) { alert("Renseignez l'adresse."); return; }
    setAutoBusy("nearby");
    try {
      const res = await gnearby({ data: { address, radius: 500 } });
      const enseignes = res.places;
      const sortedNames = [...new Set(enseignes.map((p) => p.name.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
      if (!sortedNames.length) {
        alert("Aucune enseigne trouvée dans un rayon de 500 m.");
        return;
      }
      setData((current) => ({
        ...current,
        envSousTitre: sortedNames.map((n) => `• ${n}`).join("\n"),
        envNbCommerces: String(sortedNames.length),
        envMapLabels: enseignes.map((place) => ({ name: place.name, lat: place.lat, lng: place.lng, type: place.type })),
      }));
    } catch (e) {
      alert("Erreur Places : " + (e as Error).message);
    } finally {
      setAutoBusy(null);
    }
  };


  const onFetchRevenus = async () => {
    if (!data.ville) { alert("Renseignez la ville."); return; }
    setAutoBusy("revenus");
    try {
      const r = await aiRevenus({ data: { ville: data.ville, codePostal: data.codePostal } });
      update("revenus", { ...data.revenus, ...r });
    } catch (e) {
      alert("Erreur revenus : " + (e as Error).message);
    } finally {
      setAutoBusy(null);
    }
  };

  const onAIEnrich = async (besoin: "ville" | "trafic" | "traficRoutier" | "fluxPieton" | "commerce" | "projets") => {
    if (!data.ville) { alert("Renseignez la ville."); return; }
    setAutoBusy("ai-" + besoin);
    try {
      const res = await aiEnrich({
        data: {
          ville: data.ville,
          adresse: data.adresse,
          descriptionCourante: besoin === "ville" ? data.descriptionVille : undefined,
          besoin,
        },
      });
      if (besoin === "ville") update("descriptionVille", data.descriptionVille?.trim() ? `${data.descriptionVille.trim()}\n\n${res.content}` : res.content);
      else if (besoin === "trafic" || besoin === "traficRoutier" || besoin === "fluxPieton") update("envTrafic", res.content);
      else if (besoin === "commerce") update("envCA", res.content);
      else if (besoin === "projets") update("envProjets", res.content);
    } catch (e) {
      alert("Erreur IA : " + (e as Error).message);
    } finally {
      setAutoBusy(null);
    }
  };

  // Comparables helpers
  const dedupKey = (c: Pick<Comparable, "enseigne" | "ville" | "surface" | "loyerAnnuel" | "dateSignature" | "prixVente" | "kind">) => {
    const norm = (s?: string) => (s || "").toString().toLowerCase().replace(/\s+/g, "").replace(/[.,€]/g, "").trim();
    return [c.kind || "location", norm(c.enseigne), norm(c.ville), norm(c.surface), norm(c.loyerAnnuel), norm(c.prixVente), norm(c.dateSignature)].join("|");
  };
  const mergeUniqueComparables = (existing: Comparable[], incoming: Comparable[]): { merged: Comparable[]; added: number } => {
    const seen = new Set(existing.map(dedupKey));
    const kept: Comparable[] = [];
    for (const c of incoming) {
      const k = dedupKey(c);
      if (seen.has(k)) continue;
      seen.add(k);
      kept.push(c);
    }
    return { merged: [...existing, ...kept], added: kept.length };
  };
  const addComparable = (c: Omit<Comparable, "id">) => {
    setData((d) => {
      const { merged } = mergeUniqueComparables(d.comparables, [{ ...c, id: crypto.randomUUID() }]);
      return { ...d, comparables: merged };
    });
  };
  const updateComparable = (id: string, patch: Partial<Comparable>) => {
    setData((d) => ({
      ...d,
      comparables: d.comparables.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    }));
  };
  const addComparablesBulk = (incoming: Comparable[]): number => {
    let addedCount = 0;
    setData((d) => {
      const { merged, added } = mergeUniqueComparables(d.comparables, incoming);
      addedCount = added;
      return { ...d, comparables: merged };
    });
    return addedCount;
  };
  const removeComparable = (id: string) =>
    setData((d) => ({ ...d, comparables: d.comparables.filter((c) => c.id !== id) }));

  // ─── Fiches issues du scan Outlook : upsert sans doublon, info la plus récente ───
  const scanNum = (s?: string) => {
    if (!s) return NaN;
    const n = Number(String(s).replace(/[^\d.,-]/g, "").replace(/\s/g, "").replace(",", "."));
    return isNaN(n) ? NaN : n;
  };
  /** Identité d'un actif : type d'offre + enseigne + localisation. Indépendante des chiffres. */
  const identityKey = (c: Comparable) => {
    const norm = (s?: string) => (s || "").toString().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    return [c.kind || "location", norm(c.enseigne), norm(c.codePostal) || norm(c.ville), norm(c.adresse)].join("|");
  };
  const freshness = (c: Comparable) => c.derniereMaj || c.dateSignature || "";

  const recordToComparable = (r: ScanRecord, emailDate: string, source: string): Comparable => {
    const surf = scanNum(r.surface);
    const surfP = scanNum(r.surfacePonderee);
    const loyer = scanNum(r.loyerAnnuel);
    const prix = scanNum(r.prixVente);
    const round = (n: number) => String(Math.round(n));
    return {
      id: crypto.randomUUID(),
      kind: r.kind,
      typeActif: r.typeActif || "",
      enseigne: r.enseigne,
      ville: r.ville,
      codePostal: r.codePostal,
      adresse: r.adresse,
      surface: r.surface,
      surfacePonderee: r.surfacePonderee,
      loyerAnnuel: r.loyerAnnuel,
      loyerM2: r.loyerM2 || (isFinite(loyer) && surf > 0 ? round(loyer / surf) : ""),
      loyerM2Pondere: r.loyerM2Pondere || (isFinite(loyer) && surfP > 0 ? round(loyer / surfP) : ""),
      prixVente: r.prixVente,
      prixM2: r.prixM2 || (isFinite(prix) && surf > 0 ? round(prix / surf) : ""),
      rendement: r.rendement || (isFinite(loyer) && isFinite(prix) && prix > 0 ? (loyer / prix * 100).toFixed(2) : ""),
      dateSignature: r.date || (emailDate ? emailDate.slice(0, 10) : ""),
      derniereMaj: emailDate ? emailDate.slice(0, 10) : "",
      source,
      notes: r.notes || "",
    };
  };

  /** Ajoute les fiches ; si l'actif existe déjà, ne garde que l'information la plus récente. */
  const upsertScanRecords = (records: ScanRecord[], emailDate: string, source: string) => {
    let added = 0;
    let updated = 0;
    setData((d) => {
      const list = [...d.comparables];
      const index = new Map<string, number>();
      list.forEach((c, i) => index.set(identityKey(c), i));
      for (const r of records) {
        const cand = recordToComparable(r, emailDate, source);
        if (!cand.enseigne && !cand.adresse) continue;
        const key = identityKey(cand);
        const pos = index.get(key);
        if (pos === undefined) {
          list.push(cand);
          index.set(key, list.length - 1);
          added += 1;
          continue;
        }
        const prev = list[pos];
        const candIsNewer = freshness(cand) >= freshness(prev);
        // On complète toujours les champs vides ; on écrase seulement si la source est plus récente.
        const pick = (a: string | undefined, b: string | undefined) => {
          const av = (a || "").trim();
          const bv = (b || "").trim();
          if (!bv) return av;
          if (!av) return bv;
          return candIsNewer ? bv : av;
        };
        const merged: Comparable = {
          ...prev,
          typeActif: pick(prev.typeActif, cand.typeActif),
          ville: pick(prev.ville, cand.ville),
          codePostal: pick(prev.codePostal, cand.codePostal),
          adresse: pick(prev.adresse, cand.adresse),
          surface: pick(prev.surface, cand.surface),
          surfacePonderee: pick(prev.surfacePonderee, cand.surfacePonderee),
          loyerAnnuel: pick(prev.loyerAnnuel, cand.loyerAnnuel),
          loyerM2: pick(prev.loyerM2, cand.loyerM2),
          loyerM2Pondere: pick(prev.loyerM2Pondere, cand.loyerM2Pondere),
          prixVente: pick(prev.prixVente, cand.prixVente),
          prixM2: pick(prev.prixM2, cand.prixM2),
          rendement: pick(prev.rendement, cand.rendement),
          dateSignature: pick(prev.dateSignature, cand.dateSignature),
          derniereMaj: candIsNewer ? cand.derniereMaj : prev.derniereMaj,
          notes: pick(prev.notes, cand.notes),
          source: candIsNewer ? cand.source : prev.source,
        };
        if (JSON.stringify(merged) !== JSON.stringify(prev)) {
          list[pos] = merged;
          updated += 1;
        }
      }
      return { ...d, comparables: list };
    });
    return { added, updated };
  };

  // ─── Base de comparables partagée (cloud) ─────────────────────────
  const comparablesCloudReady = useRef(false);
  const waitForToken = useCallback(async (): Promise<string | null> => {
    let { data: { session } } = await supabase.auth.getSession();
    for (let i = 0; i < 20 && !session?.access_token; i++) {
      await new Promise((r) => setTimeout(r, 150));
      ({ data: { session } } = await supabase.auth.getSession());
    }
    return session?.access_token ?? null;
  }, []);

  /** Fusionne la liste locale avec la base partagée puis renvoie la liste complète. */
  const syncComparablesToCloud = useCallback(async (local: Comparable[]): Promise<Comparable[] | null> => {
    const token = await waitForToken();
    if (!token) return null;
    try {
      const remote = await loadSharedComparables();
      const { merged } = mergeUniqueComparables(remote || [], local);
      await pushSharedComparables({ data: { items: merged } });
      return merged;
    } catch (e) {
      console.warn("Sync comparables échouée", e);
      return null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitForToken]);

  useEffect(() => {
    if (!storageReady || comparablesCloudReady.current) return;
    comparablesCloudReady.current = true;
    let cancelled = false;
    (async () => {
      const merged = await syncComparablesToCloud(latestDataRef.current.comparables);
      if (!merged || cancelled) return;
      setData((d) => ({ ...d, comparables: merged }));
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageReady]);

  // Toute modification locale (ajout, import, suppression) est répercutée dans la base partagée.
  const comparablesPushedRef = useRef<string>("");
  useEffect(() => {
    if (!storageReady) return;
    const signature = JSON.stringify(data.comparables.map((c) => [c.id, c.enseigne, c.surface, c.loyerAnnuel, c.prixVente]));
    if (comparablesPushedRef.current === signature) return;
    const t = setTimeout(async () => {
      const token = await waitForToken();
      if (!token) return;
      try {
        await pushSharedComparables({ data: { items: data.comparables } });
        comparablesPushedRef.current = signature;
      } catch (e) {
        console.warn("Enregistrement des comparables échoué", e);
      }
    }, 1200);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.comparables, storageReady]);

  // ─── Surveillance automatique de la boîte Outlook ────────────────────────
  // À l'ouverture puis toutes les 5 minutes : les nouveaux emails sont analysés
  // côté serveur et leurs chiffres alimentent directement le tableau Comparables.
  const [autoIngest, setAutoIngest] = useState<{ busy: boolean; status: string }>({ busy: false, status: "" });
  const autoIngestRunning = useRef(false);

  const runAutoIngest = useCallback(async (silent: boolean) => {
    if (autoIngestRunning.current) return;
    autoIngestRunning.current = true;
    if (!silent) setAutoIngest({ busy: true, status: "Analyse des nouveaux emails…" });
    else setAutoIngest((s) => ({ ...s, busy: true }));
    try {
      const token = await waitForToken();
      if (!token) {
        setAutoIngest({ busy: false, status: silent ? "" : "Session non disponible — reconnectez-vous." });
        return;
      }
      const r = await doMailIngest({ data: { maxMessages: 8 } });
      if (Array.isArray(r.items) && (r.added > 0 || r.updated > 0)) {
        comparablesPushedRef.current = "";
        setData((d) => ({ ...d, comparables: r.items as Comparable[] }));
      }
      const when = new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
      setAutoIngest({
        busy: false,
        status:
          r.scanned === 0
            ? `Aucun nouvel email (${when})`
            : `${r.scanned} email(s) analysé(s) — ${r.added} fiche(s) ajoutée(s), ${r.updated} mise(s) à jour (${when})`,
      });
    } catch (e) {
      setAutoIngest({ busy: false, status: silent ? "" : "Erreur : " + (e as Error).message });
    } finally {
      autoIngestRunning.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waitForToken]);

  useEffect(() => {
    if (!storageReady || shouldBypassAuthInPreview()) return;
    const t = setTimeout(() => void runAutoIngest(true), 4000);
    const i = setInterval(() => void runAutoIngest(true), 5 * 60 * 1000);
    return () => { clearTimeout(t); clearInterval(i); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageReady]);


  /** Comparables déduits de la brochure en cours (état locatif + prix de vente). */
  const comparablesFromCurrentBrochure = (source: BrochureData): Comparable[] => {
    const today = new Date().toISOString().slice(0, 10);
    const address = [source.adresse, [source.codePostal, source.ville].filter(Boolean).join(" ")]
      .filter(Boolean).join(", ");
    const label = source.nomSite || source.ville || address;
    const out: Comparable[] = source.locataires
      .filter((r) => (r.enseigne || "").trim() || (r.loyerAnnuel || "").trim())
      .map((r) => ({
        id: crypto.randomUUID(),
        kind: "location" as const,
        enseigne: r.enseigne,
        ville: source.ville,
        codePostal: source.codePostal,
        adresse: address,
        surface: r.surface,
        loyerAnnuel: r.loyerAnnuel,
        loyerM2: r.loyerM2,
        dateSignature: r.debutBail || today,
        source: `Brochure — ${label}`,
        notes: r.debutBail ? `Début bail : ${r.debutBail}` : "",
      }));
    if (!source.nousConsulter && (source.prixVente || "").trim()) {
      out.push({
        id: crypto.randomUUID(),
        kind: "prix" as const,
        enseigne: label,
        ville: source.ville,
        codePostal: source.codePostal,
        adresse: address,
        surface: source.surface,
        loyerAnnuel: source.loyerAnnuel,
        loyerM2: source.loyerM2,
        prixVente: source.prixVente,
        dateSignature: today,
        source: `Brochure — ${label}`,
        notes: "",
      });
    }
    return out;
  };


  const importFromEtatLocatif = () => {
    const today = new Date().toISOString().slice(0, 10);
    const address = composedAddress();
    const newOnes: Comparable[] = data.locataires
      .filter((r) => r.enseigne || r.loyerAnnuel)
      .map((r) => ({
        id: crypto.randomUUID(),
        enseigne: r.enseigne,
        ville: data.ville,
        codePostal: data.codePostal,
        adresse: address,
        surface: r.surface,
        loyerAnnuel: r.loyerAnnuel,
        loyerM2: r.loyerM2,
        dateSignature: today,
        source: `État locatif — ${data.nomSite || data.ville}`,
        notes: r.debutBail ? `Début bail : ${r.debutBail}` : "",
      }));
    const added = addComparablesBulk(newOnes);
    alert(`${added} comparable(s) importé(s)${added < newOnes.length ? ` (${newOnes.length - added} doublon(s) ignoré(s))` : ""}.`);
  };

  const handleFiles = async (e: ChangeEvent<HTMLInputElement>, max: number): Promise<BrochureMedia[]> => {
    const files = Array.from(e.target.files || []).slice(0, max);
    return Promise.all(files.map(fileToMedia));
  };

  const handleSingle = async (e: ChangeEvent<HTMLInputElement>): Promise<BrochureMedia | null> => {
    const f = e.target.files?.[0];
    if (!f) return null;
    return fileToMedia(f);
  };

  const whitenPictoMedia = async (media: BrochureMedia): Promise<BrochureMedia> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const c = document.createElement("canvas");
          c.width = img.naturalWidth;
          c.height = img.naturalHeight;
          const ctx = c.getContext("2d");
          if (!ctx) return resolve(media);
          ctx.drawImage(img, 0, 0);
          const d = ctx.getImageData(0, 0, c.width, c.height);
          for (let i = 0; i < d.data.length; i += 4) {
            if (d.data[i + 3] > 0) {
              d.data[i] = 255;
              d.data[i + 1] = 255;
              d.data[i + 2] = 255;
            }
          }
          ctx.putImageData(d, 0, 0);
          resolve({ dataUrl: c.toDataURL("image/png"), name: media.name.replace(/\.[^.]+$/, "") + "-white.png" });
        } catch {
          resolve(media);
        }
      };
      img.onerror = () => resolve(media);
      img.src = media.dataUrl;
    });
  };

  const submitNewPoint = async () => {
    const title = newPointTitle.trim();
    if (!title) return;
    // Trouver le premier slot libre (label vide / défaut)
    const labels = [...(data.settings.pointsClesPictosLabels || POINT_CLE_PICTO_LABELS_DEFAULT)];
    const pictos = [...(data.settings.pointsClesPictos || [])];
    while (labels.length < 6) labels.push("");
    while (pictos.length < 6) pictos.push(null);
    let slot = -1;
    for (let i = 0; i < 6; i++) {
      const raw = (labels[i] || "").replace(/^Picto\s+/i, "").trim();
      const defaults = POINT_CLE_PICTO_LABELS_DEFAULT.map((l) => l.replace(/^Picto\s+/i, "").trim());
      if (!raw || defaults.includes(raw)) {
        if (!pictos[i]) { slot = i; break; }
      }
    }
    if (slot === -1) {
      for (let i = 0; i < 6; i++) {
        if (!pictos[i]) { slot = i; break; }
      }
    }
    if (slot === -1) slot = 5;
    labels[slot] = `Picto ${title}`;
    const whitened = newPointPicto ? await whitenPictoMedia(newPointPicto) : null;
    if (whitened) pictos[slot] = whitened;
    const nextPoints = [...data.pointsCles];
    while (nextPoints.length < 6) nextPoints.push("");
    nextPoints[slot] = title;
    commitData((d) => ({
      ...d,
      pointsCles: nextPoints,
      settings: { ...d.settings, pointsClesPictosLabels: labels, pointsClesPictos: pictos },
    }));
    setNewPointTitle("");
    setNewPointPicto(null);
    setAddPointOpen(false);
  };

  const appendMedia = async (
    key: "photos" | "plans" | "perspectives",
    e: ChangeEvent<HTMLInputElement>,
  ) => {
    const files = Array.from(e.target.files || []);
    const media = await Promise.all(files.map(fileToMedia));
    // Pour "plans" et "perspectives" : demande un titre pour chaque média (utilisé comme titre de slide).
    if (key === "plans" || key === "perspectives") {
      for (let i = 0; i < media.length; i++) {
        const defaultLabel = key === "plans"
          ? (i === 0 ? "Plan de masse" : "Plan")
          : (i === 0 ? "Perspective" : `Perspective ${i + 1}`);
        const t = window.prompt(`Titre du ${key === "plans" ? "plan" : "perspective"} « ${media[i].name} » (affiché sur la slide) :`, defaultLabel);
        if (t !== null && t.trim()) media[i] = { ...media[i], title: t.trim() };
      }
    }
    setData((d) => ({ ...d, [key]: [...d[key], ...media] }));
    e.target.value = "";
  };

  const setMediaTitle = (key: "plans" | "perspectives", index: number, title: string) => {
    setData((d) => {
      const arr = [...d[key]];
      arr[index] = { ...arr[index], title };
      return { ...d, [key]: arr };
    });
  };

  const removeMedia = (key: "photos" | "plans" | "perspectives", index: number) => {
    setData((d) => {
      const removed = d[key][index];
      const next = { ...d, [key]: d[key].filter((_, i) => i !== index) };
      // Nettoie la liste d'exclusion du reportage quand une photo est supprimée.
      if (key === "photos" && removed && d.photosExclues?.length) {
        next.photosExclues = d.photosExclues.filter((n) => n !== removed.name);
      }
      return next;
    });
  };

  /** Coche/décoche une photo pour le reportage (slide Reportage photos du PPTX). */
  const togglePhotoReportage = (name: string) => {
    setData((d) => {
      const exclues = d.photosExclues || [];
      const next = exclues.includes(name) ? exclues.filter((n) => n !== name) : [...exclues, name];
      return { ...d, photosExclues: next };
    });
  };

  /** Choisit une photo importée comme photo de page de garde. */
  const setCoverFromPhoto = (media: BrochureMedia) => {
    setData((d) => ({ ...d, photoCouverture: media }));
  };

  const fetchWikipedia = useCallback(async () => {
    if (!data.ville) return;
    setAutoBusy("wiki");
    try {
      const res = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(data.ville)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.extract) update("descriptionVille", json.extract);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setAutoBusy(null);
    }
  }, [data.ville]);

  const setLocataire = (i: number, field: keyof RentalRow, value: string) => {
    setData((d) => {
      const next = [...d.locataires];
      next[i] = { ...next[i], [field]: value };
      // Auto-recalcule WALB / WALT dès qu'une date change (n'écrase que si champ vide).
      if (field === "debutBail" || field === "prochainBreak" || field === "finBail") {
        const auto = computeRowDurations(next[i]);
        const row = next[i];
        if (!row.walb || !row.walb.trim()) row.walb = auto.walb;
        if (!row.walt || !row.walt.trim()) row.walt = auto.walt;
      }
      // Recalcule TOUJOURS Loyer/m² = Loyer annuel HC-HT / Surface dès qu'une des deux entrées change.
      if (field === "surface" || field === "loyerAnnuel") {
        const row = next[i];
        const surf = parseAmt(row.surface);
        const loy = parseAmt(row.loyerAnnuel);
        if (Number.isFinite(surf) && surf > 0 && Number.isFinite(loy) && loy > 0) {
          row.loyerM2 = `${formatFrThousandsStr(String(Math.round(loy / surf)))} €`;
        }
      }
      return { ...d, locataires: next };
    });
  };


  const setNbLocataires = (n: number) => {
    setData((d) => {
      const nb = Math.max(1, Math.min(20, n));
      const next = [...d.locataires];
      while (next.length < nb) next.push({ enseigne: "", surface: "", loyerAnnuel: "", loyerM2: "", debutBail: "", prochainBreak: "", walb: "", finBail: "", walt: "" });
      while (next.length > nb) next.pop();
      return { ...d, nbLocataires: nb, locataires: next };
    });
  };

  const moveLocataire = (i: number, dir: -1 | 1) => {
    setData((d) => {
      const j = i + dir;
      if (j < 0 || j >= d.locataires.length) return d;
      const next = [...d.locataires];
      [next[i], next[j]] = [next[j], next[i]];
      return { ...d, locataires: next };
    });
  };

  const insertLocataire = (i: number) => {
    setData((d) => {
      const next = [...d.locataires];
      next.splice(i + 1, 0, { enseigne: "", surface: "", loyerAnnuel: "", loyerM2: "", debutBail: "", prochainBreak: "", walb: "", finBail: "", walt: "" });
      return { ...d, locataires: next, nbLocataires: next.length };
    });
  };

  const removeLocataire = (i: number) => {
    setData((d) => {
      if (d.locataires.length <= 1) return d;
      const next = d.locataires.filter((_, k) => k !== i);
      return { ...d, locataires: next, nbLocataires: next.length };
    });
  };

  const onImportEtatLocatif = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setEtatBusy(true);
    try {
      const name = file.name.toLowerCase();
      let payload: Parameters<typeof doImportEtat>[0]["data"];
      const { fileToBase64 } = await import("@/lib/import-client");
      if (name.endsWith(".pdf")) {
        payload = { filename: file.name, pdfBase64: await fileToBase64(file) };
      } else if (/\.(xlsx|xls|csv|ods)$/i.test(name)) {
        const XLSX = await import("xlsx");
        const buf = await file.arrayBuffer();
        const wb = XLSX.read(buf, { type: "array" });
        const parts: string[] = [];
        for (const sh of wb.SheetNames) {
          const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sh], { blankrows: false });
          if (csv.trim()) parts.push(`--- Feuille ${sh} ---\n${csv}`);
        }
        payload = { filename: file.name, text: parts.join("\n\n") };
      } else if (/\.(png|jpe?g|webp|gif|bmp)$/i.test(name)) {
        const mime = file.type || "image/png";
        payload = { filename: file.name, imageBase64: await fileToBase64(file), imageMime: mime };
      } else {
        alert("Format non supporté (accepté : Excel .xlsx/.xls/.csv, PDF, image .png/.jpg).");
        return;
      }
      const res = await doImportEtat({ data: payload });
      if (res.error) {
        alert("Extraction incomplète : " + res.error);
        return;
      }
      const rows = (res.locataires as Partial<RentalRow>[]).map((r) => ({
        enseigne: r.enseigne || "", surface: r.surface || "", loyerAnnuel: r.loyerAnnuel || "",
        loyerM2: r.loyerM2 || "", debutBail: r.debutBail || "", prochainBreak: r.prochainBreak || "",
        walb: r.walb || "", finBail: r.finBail || "", walt: r.walt || "",
      }));
      if (!rows.length) {
        alert("Aucune ligne détectée dans l'état locatif.");
        return;
      }
      const withDurations = normalizeRentalRowsForCalculations(rows);
      setData((d) => ({ ...d, locataires: withDurations, nbLocataires: withDurations.length }));
    } catch (err) {
      alert("Erreur import état locatif : " + (err as Error).message);
    } finally {
      setEtatBusy(false);
    }
  };



  const refreshAllMapMediaForExport = async (source: BrochureData): Promise<BrochureData> => {
    const address = [source.adresse, source.codePostal, source.ville].filter(Boolean).join(", ");
    if (!address) return source;
    const entries: Array<{ kind: MapKind; field: "carteRegion" | "envCarte" | "accessibiliteCarte" }> = [
      { kind: "localisation", field: "carteRegion" },
      { kind: "environnement", field: "envCarte" },
      { kind: "accessibilite", field: "accessibiliteCarte" },
    ];
    const results = await Promise.allSettled(entries.map(async ({ kind, field }) => {
      const settings = source.mapsSettings?.[kind];
      const res = await gmap({ data: { address, kind, lat: settings?.lat, lng: settings?.lng, zoom: settings?.zoom } });
      return { kind, field, res };
    }));
    let next: BrochureData = {
      ...source,
      carteRegion: googleMapPreview(source.carteRegion),
      envCarte: googleMapPreview(source.envCarte),
      accessibiliteCarte: googleMapPreview(source.accessibiliteCarte),
      mapsSettings: { ...(source.mapsSettings || {}) },
    };
    results.forEach((result) => {
      if (result.status !== "fulfilled") return;
      const { kind, field, res } = result.value;
      next = {
        ...next,
        [field]: res.dataUrl ? { dataUrl: res.dataUrl, name: `map-${kind}.png` } : null,
        mapsSettings: {
          ...(next.mapsSettings || {}),
          [kind]: {
            lat: res.center.lat,
            lng: res.center.lng,
            zoom: source.mapsSettings?.[kind]?.zoom ?? getPreferredZoom(kind),
          },
        },
      };
    });
    return next;
  };

  /** Contrôles obligatoires communs à l'ajout d'un actif et à la génération. */
  const validateAsset = (sourceData: BrochureData): boolean => {
    if (!sourceData.photoCouverture) {
      alert("Photo de page de garde requise : veuillez ajouter une image en section 1.");
      return false;
    }
    if (!sourceData.nousConsulter && !sourceData.prixVente.trim()) {
      alert("Prix de vente obligatoire (ou cochez « Nous consulter »).");
      return false;
    }
    if (!sourceData.honoraires.trim()) {
      alert("Honoraires obligatoires.");
      return false;
    }
    return true;
  };

  /** Complète les enseignes, régénère l'isochrone et rafraîchit toutes les cartes. */
  const prepareAssetForExport = async (input: BrochureData): Promise<BrochureData> => {
    let sourceData = input;
    // Si la liste n'a pas encore été récupérée, la compléter juste avant
    // l'export. Une panne du scan ne doit jamais effacer une saisie existante.
    if (sourceData.includeEnvironnement && !sourceData.envMapLabels.length) {
      const addr = [sourceData.adresse, sourceData.codePostal, sourceData.ville].filter(Boolean).join(", ");
      if (addr) {
        const nearby = await gnearby({ data: { address: addr, radius: 500 } }).catch(() => null);
        const names = [...new Set((nearby?.places || []).map((place) => place.name.trim()).filter(Boolean))]
          .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
        if (names.length) {
          sourceData = {
            ...sourceData,
            envSousTitre: names.map((name) => `• ${name}`).join("\n"),
            envNbCommerces: sourceData.envNbCommerces || String(names.length),
            envMapLabels: (nearby?.places || []).map((place) => ({ name: place.name, lat: place.lat, lng: place.lng, type: place.type })),
          };
        }
      }
    }
    // Toujours reconstruire l'isochrone à l'export.
    const address = [sourceData.adresse, sourceData.codePostal, sourceData.ville].filter(Boolean).join(", ");
    if (address) {
      const freshIsochrone = await iso({
        data: {
          address,
          mode: sourceData.modeChalandise,
          minutes1: sourceData.dureeZone1,
          minutes2: sourceData.dureeZone2,
        },
      }).catch(() => null);
      if (freshIsochrone) {
        sourceData = {
          ...sourceData,
          chalandiseImage: { dataUrl: freshIsochrone.dataUrl, name: "isochrone.png" },
          populationZone1: freshIsochrone.population1
            ? formatFrThousandsStr(String(freshIsochrone.population1))
            : sourceData.populationZone1,
          populationZone2: freshIsochrone.population2
            ? formatFrThousandsStr(String(freshIsochrone.population2))
            : sourceData.populationZone2,
        };
      }
    }
    return await refreshAllMapMediaForExport(sourceData);
  };

  /** Bascule sur un autre actif du portefeuille sans rien perdre de la saisie en cours. */
  const switchToAsset = (index: number) => {
    const all = buildFullAssets();
    if (index < 0 || index >= all.length || index === activeAssetRef.current) return;
    const next = all[index];
    const rest = all.filter((_, i) => i !== index);
    otherAssetsRef.current = rest;
    activeAssetRef.current = index;
    setOtherAssets(rest);
    setActiveAsset(index);
    latestDataRef.current = next;
    setData(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Ajoute un actif vierge (aucun traitement réseau : impossible de perdre la saisie). */
  const addAsset = () => {
    const all = buildFullAssets();
    const current = latestDataRef.current;
    const blank: BrochureData = {
      ...emptyBrochure(),
      settings: current.settings,
      comparables: current.comparables,
      includeComparables: current.includeComparables,
    };
    const rest = [...all];
    otherAssetsRef.current = rest;
    activeAssetRef.current = rest.length;
    setOtherAssets(rest);
    setActiveAsset(rest.length);
    latestDataRef.current = blank;
    setData(blank);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** Supprime un actif du portefeuille (après confirmation). */
  const removeAsset = (index: number) => {
    const all = buildFullAssets();
    if (all.length <= 1) return;
    const label = all[index].nomSite || all[index].ville || `Actif ${index + 1}`;
    if (!confirm(`Supprimer définitivement « ${label} » du portefeuille ?`)) return;
    const kept = all.filter((_, i) => i !== index);
    const newActive = Math.min(activeAssetRef.current > index ? activeAssetRef.current - 1 : activeAssetRef.current, kept.length - 1);
    const next = kept[newActive];
    const rest = kept.filter((_, i) => i !== newActive);
    otherAssetsRef.current = rest;
    activeAssetRef.current = newActive;
    setOtherAssets(rest);
    setActiveAsset(newActive);
    latestDataRef.current = next;
    setData(next);
  };

  const onGenerate = async () => {
    const all = buildFullAssets().map((asset) => ({
      ...asset,
      locataires: normalizeRentalRowsForCalculations(asset.locataires),
      portfolioAssets: undefined,
    }));
    // Validation de chaque actif : on bascule sur celui qui pose problème.
    for (let i = 0; i < all.length; i++) {
      if (!validateAsset(all[i])) {
        if (all.length > 1) {
          alert(`Actif ${i + 1} incomplet : complétez-le avant de générer la brochure.`);
          switchToAsset(i);
        }
        return;
      }
    }

    setBusy(true);
    try {
      const prepared: BrochureData[] = [];
      for (const asset of all) {
        try {
          prepared.push(await prepareAssetForExport(asset));
        } catch (e) {
          // Une erreur réseau sur un actif ne doit jamais bloquer ni effacer la saisie.
          console.warn("Préparation de l'actif échouée, export des données saisies", e);
          prepared.push(asset);
        }
      }
      const activeIdx = Math.min(activeAssetRef.current, prepared.length - 1);
      latestDataRef.current = prepared[activeIdx];
      setData(prepared[activeIdx]);
      const rest = prepared.filter((_, i) => i !== activeIdx);
      otherAssetsRef.current = rest;
      setOtherAssets(rest);

      const [first, ...others] = prepared;
      const payload: BrochureData = { ...first, portfolioAssets: others };
      const dept = (first.codePostal || "").slice(0, 2);
      const local = dept ? payload.comparables.filter((c) => (c.codePostal || "").startsWith(dept)) : [];
      if (local.length) payload.comparables = local;
      const res = await gen({ data: payload });
      downloadBase64(res.base64, res.filename);
      if (onGenerated) {
        try { await onGenerated(res.base64, res.filename); } catch (e) { console.warn("Enregistrement de la brochure échoué", e); }
      }
      // Alimente automatiquement la base de comparables avec cette brochure
      try {
        const harvested = prepared.flatMap((asset) => comparablesFromCurrentBrochure(asset));
        const { merged, added } = mergeUniqueComparables(latestDataRef.current.comparables, harvested);
        if (added > 0) setData((d) => ({ ...d, comparables: merged }));
        const cloud = await syncComparablesToCloud(merged);
        if (cloud) setData((d) => ({ ...d, comparables: cloud }));
      } catch (e) {
        console.warn("Alimentation de la base de comparables échouée", e);
      }
    } catch (e) {
      console.error(e);
      alert("Erreur lors de la génération : " + (e as Error).message);
    } finally {
      setBusy(false);
    }
  };


  // Settings helpers
  const setPictoSlot = (arrKey: "pointsClesPictos" | "revenusPictos", index: number, media: BrochureMedia | null) => {
    commitData((d) => {
      const arr = mediaSlots(d.settings[arrKey]);
      arr[index] = media;
      const next = { ...d, settings: { ...d.settings, [arrKey]: arr } };
      void idbPut(`${arrKey}.${index}`, media).catch((e) => console.warn("Failed to persist picto slot", e));
      persistPictosToCloud(next.settings);
      return next;
    });
  };
  const updateTeam = (i: number, patch: Partial<TeamMember>) => {
    commitData((d) => {
      const team = [...d.settings.team];
      team[i] = { ...team[i], ...patch };
      return { ...d, settings: { ...d.settings, team } };
    });
  };
  const addTeamMember = () => updateSettings("team", [...data.settings.team, emptyTeamMember()]);
  const removeTeamMember = (i: number) =>
    updateSettings("team", data.settings.team.filter((_, idx) => idx !== i));

  // ─── AUTO-PIPELINE au choix d'une adresse validée ─────────────────
  const onAddressSelect = async (a: SelectedAddress) => {
    setPipelineBusy(true);
    // 1) Remplir les champs
    const hasSelectedCoords = Number.isFinite(a.lat) && Number.isFinite(a.lng) && (a.lat !== 0 || a.lng !== 0);
    setData((d) => ({
      ...d,
      adresse: a.street,
      codePostal: a.postalCode,
      ville: a.city,
      accessibilite: [],
      mapsSettings: hasSelectedCoords
        ? {
            localisation: { lat: a.lat, lng: a.lng, zoom: getPreferredZoom("localisation") },
            environnement: { lat: a.lat, lng: a.lng, zoom: getPreferredZoom("environnement") },
            accessibilite: { lat: a.lat, lng: a.lng, zoom: getPreferredZoom("accessibilite") },
          }
        : {},
    }));
    const address = [a.street, a.postalCode, a.city].filter(Boolean).join(", ");
    const ville = a.city;
    const mapCenter = hasSelectedCoords ? { lat: a.lat, lng: a.lng } : {};
    setPipelineStatus("Lancement des recherches automatiques…");

    const tasks: Array<[string, Promise<unknown>]> = [];

    // 2) Cartes Google Maps — toutes lancées automatiquement après validation de l'adresse
    const localisationMapTask = gmap({ data: { address, kind: "localisation", zoom: getPreferredZoom("localisation"), ...mapCenter } })
      .then((r) => {
        setData((d) => ({
          ...d,
          carteRegion: r.dataUrl ? { dataUrl: r.dataUrl, name: "map-localisation.png" } : null,
          mapsSettings: {
            ...(d.mapsSettings || {}),
            localisation: { lat: r.center.lat, lng: r.center.lng, zoom: getPreferredZoom("localisation") },
          },
        }));
        if (r.error) setMapErrors((prev) => ({ ...prev, localisation: r.error }));
      })
      .catch((e) => { setMapErrors((prev) => ({ ...prev, localisation: (e as Error).message })); update("carteRegion", null); throw e; });
    tasks.push(["carte Google localisation", localisationMapTask]);
    const environnementMapTask = gmap({ data: { address, kind: "environnement", zoom: getPreferredZoom("environnement"), ...mapCenter } })
      .then((r) => {
        setData((d) => ({
          ...d,
          envCarte: r.dataUrl ? { dataUrl: r.dataUrl, name: "map-environnement.png" } : null,
          mapsSettings: {
            ...(d.mapsSettings || {}),
            environnement: { lat: r.center.lat, lng: r.center.lng, zoom: getPreferredZoom("environnement") },
          },
        }));
        if (r.error) setMapErrors((prev) => ({ ...prev, environnement: r.error }));
      })
      .catch((e) => { setMapErrors((prev) => ({ ...prev, environnement: (e as Error).message })); update("envCarte", null); throw e; });
    tasks.push(["carte Google environnement", environnementMapTask]);
    const accessibiliteMapTask = gmap({ data: { address, kind: "accessibilite", zoom: getPreferredZoom("accessibilite"), ...mapCenter } })
      .then((r) => {
        setData((d) => ({
          ...d,
          accessibiliteCarte: r.dataUrl ? { dataUrl: r.dataUrl, name: "map-accessibilite.png" } : null,
          mapsSettings: {
            ...(d.mapsSettings || {}),
            accessibilite: { lat: r.center.lat, lng: r.center.lng, zoom: getPreferredZoom("accessibilite") },
          },
        }));
        if (r.error) setMapErrors((prev) => ({ ...prev, accessibilite: r.error }));
      })
      .catch((e) => { setMapErrors((prev) => ({ ...prev, accessibilite: (e as Error).message })); update("accessibiliteCarte", null); throw e; });
    tasks.push(["carte Google satellite accessibilité", accessibiliteMapTask]);

    // 3) Wikipédia + IA ville
    tasks.push(["Wikipédia + IA", (async () => {
      let wiki = "";
      try {
        const r = await fetch(`https://fr.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(ville)}`);
        if (r.ok) { const j = await r.json(); wiki = j.extract || ""; }
      } catch {}
      try {
        const ai = await aiEnrich({ data: { ville, adresse: a.street, descriptionCourante: wiki, besoin: "ville" } });
        const combined = wiki ? `${wiki}\n\n${ai.content}` : ai.content;
        update("descriptionVille", combined);
      } catch { if (wiki) update("descriptionVille", wiki); }
    })()]);

    // 4) Zone de chalandise OpenStreetMap — seul usage OSM conservé
    tasks.push(["carte OpenStreetMap zone de chalandise", iso({
      data: { address, mode: data.modeChalandise, minutes1: data.dureeZone1, minutes2: data.dureeZone2 },
    }).then((r) => {
      update("chalandiseImage", { dataUrl: r.dataUrl, name: "isochrone.png" });
      if (r.population1) update("populationZone1", formatFrThousandsStr(String(r.population1)));
      if (r.population2) update("populationZone2", formatFrThousandsStr(String(r.population2)));
    })
       .catch((e) => { console.warn("iso", e); })]);

    // 5) Revenus mensuels
    tasks.push(["revenus", aiRevenus({ data: { ville, codePostal: a.postalCode } })
      .then((r) => setData((d) => ({ ...d, revenus: { ...d.revenus, ...r } })))]);

    // 6) Environnement commercial — enseignes géolocalisées directement sur la carte.
    tasks.push(["enseignes voisines", (async () => {
      const res = await gnearby({ data: { address, radius: 500 } });
      const enseignes = res.places;
      const sortedNames = [...new Set(enseignes.map((p) => p.name.trim()).filter(Boolean))]
        .sort((a, b) => a.localeCompare(b, "fr", { sensitivity: "base" }));
      if (sortedNames.length) {
        setData((current) => ({
          ...current,
          envSousTitre: sortedNames.map((n) => `• ${n}`).join("\n"),
          envNbCommerces: String(sortedNames.length),
          envMapLabels: enseignes.map((place) => ({ name: place.name, lat: place.lat, lng: place.lng, type: place.type })),
        }));
      }
    })()]);

    // 7) IA : un seul flux selon la typologie, puis CA et projets.
    const flowNeed = data.envType === "centre-ville" ? "fluxPieton" : "traficRoutier";
    tasks.push([data.envType === "centre-ville" ? "flux piéton" : "trafic routier", aiEnrich({ data: { ville, adresse: a.street, besoin: flowNeed } })
      .then((r) => update("envTrafic", r.content))]);
    tasks.push(["CA zone / hypermarché", aiEnrich({ data: { ville, adresse: a.street, besoin: "commerce" } })
      .then((r) => update("envCA", r.content))]);
    tasks.push(["projets à venir", aiEnrich({ data: { ville, adresse: a.street, besoin: "projets" } })
      .then((r) => update("envProjets", r.content))]);
    // Rapport de fin
    let done = 0;
    await Promise.all(tasks.map(([name, p]) => Promise.resolve(p).then(
      () => { done++; setPipelineStatus(`✓ ${done}/${tasks.length} — ${name}`); },
      (e) => { done++; console.error(name, e); setPipelineStatus(`⚠ ${done}/${tasks.length} — ${name} : ${(e as Error).message}`); },
    )));
    const mapResults = await Promise.allSettled([
      gmap({ data: { address, kind: "localisation", zoom: getPreferredZoom("localisation"), ...mapCenter } }),
      gmap({ data: { address, kind: "environnement", zoom: getPreferredZoom("environnement"), ...mapCenter } }),
      gmap({ data: { address, kind: "accessibilite", zoom: getPreferredZoom("accessibilite"), ...mapCenter } }),
    ]);
    setData((d) => ({
      ...d,
      carteRegion: mapResults[0].status === "fulfilled" ? (mapResults[0].value.dataUrl ? { dataUrl: mapResults[0].value.dataUrl, name: "map-localisation.png" } : null) : d.carteRegion,
      envCarte: mapResults[1].status === "fulfilled" ? (mapResults[1].value.dataUrl ? { dataUrl: mapResults[1].value.dataUrl, name: "map-environnement.png" } : null) : d.envCarte,
      accessibiliteCarte: mapResults[2].status === "fulfilled" ? (mapResults[2].value.dataUrl ? { dataUrl: mapResults[2].value.dataUrl, name: "map-accessibilite.png" } : null) : d.accessibiliteCarte,
      mapsSettings: {
        ...(d.mapsSettings || {}),
        ...(mapResults[0].status === "fulfilled" ? { localisation: { lat: mapResults[0].value.center.lat, lng: mapResults[0].value.center.lng, zoom: getPreferredZoom("localisation") } } : {}),
        ...(mapResults[1].status === "fulfilled" ? { environnement: { lat: mapResults[1].value.center.lat, lng: mapResults[1].value.center.lng, zoom: getPreferredZoom("environnement") } } : {}),
        ...(mapResults[2].status === "fulfilled" ? { accessibilite: { lat: mapResults[2].value.center.lat, lng: mapResults[2].value.center.lng, zoom: getPreferredZoom("accessibilite") } } : {}),
      },
    }));
    setMapErrors((prev) => ({
      ...prev,
      ...(mapResults[0].status === "rejected" ? { localisation: (mapResults[0].reason as Error).message } : { localisation: mapResults[0].value.error }),
      ...(mapResults[1].status === "rejected" ? { environnement: (mapResults[1].reason as Error).message } : { environnement: mapResults[1].value.error }),
      ...(mapResults[2].status === "rejected" ? { accessibilite: (mapResults[2].reason as Error).message } : { accessibilite: mapResults[2].value.error }),
    }));
    setPipelineStatus(`✅ Pipeline terminé (${tasks.length} tâches).`);
    setPipelineBusy(false);
  };

  const onValidateAddress = async () => {
    if (!data.adresse || !data.ville) {
      alert("Renseignez au minimum l'adresse et la ville.");
      return;
    }
    await onAddressSelect({
      formatted: [data.adresse, data.codePostal, data.ville].filter(Boolean).join(", "),
      street: data.adresse,
      postalCode: data.codePostal,
      city: data.ville,
      lat: 0,
      lng: 0,
    });
  };



  return (
    <div className="brochure-editor bg-background text-foreground" >
      <header className="border-b border-border bg-card px-0 py-3">
        <div className="flex items-center gap-6 mb-3">
          <div className="text-xs uppercase tracking-normal text-primary shrink-0">WALLSBROKER</div>
          <h1 className="flex-1 text-center text-[11px] sm:text-sm md:text-base uppercase tracking-normal text-foreground font-semibold whitespace-normal">
            Teaser
          </h1>
          <div className="w-[110px] shrink-0" />
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <Button
            onClick={() => setTab("generator")}
            className={`h-9 px-3 rounded-md text-xs font-semibold border ${tab === "generator" ? "bg-primary text-primary-foreground border-border" : "bg-muted text-muted-foreground border-border"}`}
          >
            Générateur
          </Button>
          <label className={`h-9 inline-flex items-center px-3 rounded-md text-xs font-semibold border ${importBusy ? "bg-primary text-primary-foreground border-border opacity-60 cursor-not-allowed pointer-events-none" : "bg-muted text-muted-foreground border-border hover:bg-card cursor-pointer"}`}>
            {importBusy ? (importProgress || "Import en cours…") : "Importer"}
            <input
              type="file"
              accept=".pdf,.pptx,.docx"
              multiple
              disabled={importBusy}
              className="hidden"
              onChange={async (e) => {
                const files = Array.from(e.target.files || []);
                e.target.value = "";
                if (!files.length) return;
                await onImportFiles(files);
              }}
            />
          </label>
          <Button
            onClick={resetAll}
            className="h-9 px-3 rounded-md bg-destructive hover:bg-destructive text-primary-foreground text-xs font-semibold"
            title="Vider le formulaire (les Paramètres et Comparables sont conservés)"
          >
            Effacer
          </Button>
          <Button
            onClick={onGenerate}
            disabled={busy}
            className="h-9 px-4 rounded-md bg-primary hover:bg-primary disabled:opacity-50 text-primary-foreground font-semibold text-xs shadow-lg"
          >
            {busy ? "Génération…" : "Générer PPTX"}
          </Button>
          {isAdmin && (
            <Button
              onClick={() => setTab("settings")}
              title="Paramètres"
              aria-label="Paramètres"
              className={`h-9 w-9 inline-flex items-center justify-center rounded-md text-base border ${tab === "settings" ? "bg-primary text-primary-foreground border-border" : "bg-muted text-muted-foreground border-border"}`}
            >
              ⚙️
            </Button>
          )}
        </div>

      </header>


      <main className="max-w-5xl mx-auto py-4 space-y-4">
        {tab === "settings" ? (
          <SettingsTab
            data={data}
            setPictoSlot={setPictoSlot}
            updateSettings={updateSettings}
            updateTeam={updateTeam}
            addTeamMember={addTeamMember}
            removeTeamMember={removeTeamMember}
            restoreDefaultTeam={restoreDefaultTeam}

          />
        ) : tab === "comparables" ? (
          <ComparablesTab
            data={data}
            update={update}
            addComparable={addComparable}
            updateComparable={updateComparable}
            removeComparable={removeComparable}
            importFromEtatLocatif={importFromEtatLocatif}
            onImportFile={async (f) => {
              setImportBusy(true);
              try {
                await onImportFile(f, "comparablesOnly");
              } catch (e) {
                alert("Erreur import : " + (e as Error).message);
              } finally {
                setImportBusy(false);
              }
            }}
            importBusy={importBusy}
            mailList={mailList}
            mailKeyword={mailKeyword}
            setMailKeyword={setMailKeyword}
            onScanOutlook={onScanOutlook}
            onExtractFromMail={onExtractFromMail}
            mailBusy={mailBusy}
            fullScan={fullScan}
            mailError={mailError}
            startFullMailboxScan={startFullMailboxScan}
            stopFullMailboxScan={stopFullMailboxScan}
            autoIngest={autoIngest}
            onRunAutoIngest={() => runAutoIngest(false)}
          />

        ) : (
          <>
            {pipelineStatus && (
              <div className="rounded-md border border-border bg-primary px-4 py-2 text-xs text-primary-foreground">
                {pipelineStatus}
              </div>
            )}
            <div className="rounded-md border border-border bg-card p-3">
              <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs font-semibold">
                <span className="text-primary">
                  Actifs de la brochure {otherAssets.length > 0 ? `(${otherAssets.length + 1} actifs — portefeuille)` : "(1 actif)"} — 
                </span>
                <span
                  role="status"
                  className={draftStatus === "error" ? "text-destructive" : draftStatus === "saved" ? "text-primary" : "text-muted-foreground"}
                >
                  {draftStatus === "loading" ? "Restauration…" : draftStatus === "saving" ? "Sauvegarde…" : draftStatus === "error" ? "Sauvegarde impossible" : "✓ Sauvegardé"}
                </span>
              </div>
              <div className="mb-2 flex flex-wrap items-center gap-2 text-xs">
                <Button
                  type="button"
                  onClick={() => void saveDraftToCloud(false)}
                  className="rounded-md border border-border bg-primary px-2 py-1 font-semibold text-primary-foreground hover:bg-primary"
                >
                  💾 Sauvegarder sur le serveur
                </Button>
                <Button
                  type="button"
                  onClick={() => { if (confirm("Remplacer les actifs actuellement affichés par la dernière sauvegarde serveur ?")) void restoreDraftFromCloud(); }}
                  className="rounded-md border border-border bg-muted px-2 py-1 font-semibold text-foreground hover:bg-card"
                >
                  ⤵ Restaurer la sauvegarde serveur
                </Button>
                {cloudDraftStatus && <span className="text-muted-foreground">{cloudDraftStatus}</span>}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {buildFullAssets().map((asset, i) => {
                  const active = i === activeAsset;
                  const label = asset.nomSite || asset.ville || asset.adresse || `Actif ${i + 1}`;
                  return (
                    <div
                      key={i}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs ${active ? "bg-primary border-border text-primary-foreground" : "bg-muted border-border text-muted-foreground"}`}
                    >
                      <Button type="button" onClick={() => switchToAsset(i)} className="font-semibold">
                        {i + 1}. {label}
                      </Button>
                      {otherAssets.length > 0 && (
                        <Button
                          type="button"
                          onClick={() => removeAsset(i)}
                          title="Supprimer cet actif"
                          className="text-destructive hover:text-destructive"
                        >
                          ✕
                        </Button>
                      )}
                    </div>
                  );
                })}
                <Button
                  type="button"
                  onClick={addAsset}
                  title="Ajoute un actif vierge à la brochure. L’actif en cours est conservé et reste modifiable à tout moment."
                  className="rounded-md border border-border bg-muted hover:bg-card px-3 py-1 text-xs font-semibold text-primary-foreground"
                >
                  ➕ Ajouter un actif
                </Button>
              </div>
            </div>

            <Stepper>
            <Section title="1. Le bien">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Nom du site (ex: Clémence Isaure Retail Park)">
                  <input className={inputCls} value={data.nomSite} onChange={(e) => update("nomSite", e.target.value)} />
                </Field>
                <Field label="Type de bien">
                  <input className={inputCls} value={data.typeBien} onChange={(e) => update("typeBien", e.target.value)} />
                </Field>
                <Field label="Adresse (autocomplétion)">
                  <AddressAutocomplete
                    className={inputCls}
                    value={data.adresse}
                    onChangeText={(v) => update("adresse", v)}
                    onSelect={onAddressSelect}
                  />
                </Field>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <Field label="Code postal">
                    <input className={inputCls} value={data.codePostal} onChange={(e) => update("codePostal", e.target.value)} />
                  </Field>
                  <Field label="Ville">
                    <input className={inputCls} value={data.ville} onChange={(e) => update("ville", e.target.value)} />
                  </Field>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    type="button"
                    onClick={onValidateAddress}
                    disabled={pipelineBusy || !data.adresse || !data.ville}
                    className="h-10 px-4 rounded-md bg-primary hover:bg-primary disabled:opacity-50 disabled:cursor-not-allowed text-primary-foreground text-xs font-semibold shadow"
                  >
                    {pipelineBusy ? "Recherches en cours…" : "✓ Valider l'adresse & tout générer automatiquement"}
                  </Button>
                  {pipelineStatus && <span className="text-xs text-muted-foreground truncate">{pipelineStatus}</span>}
                </div>
                <Field label="Surface (m²)">
                  <input className={inputCls} value={data.surface} onChange={(e) => update("surface", e.target.value)} onBlur={(e) => update("surface", formatFrThousandsStr(e.target.value))} />
                </Field>
                <Field label="Loyer annuel HC-HT">
                  <input className={inputCls} placeholder="240 000 €" value={data.loyerAnnuel} onChange={(e) => update("loyerAnnuel", e.target.value)} onBlur={(e) => update("loyerAnnuel", formatFrThousandsStr(e.target.value))} />
                </Field>
                <Field label="Loyer / m² / an HC-HT">
                  <input className={inputCls} placeholder="75" value={data.loyerM2} onChange={(e) => update("loyerM2", e.target.value)} onBlur={(e) => update("loyerM2", formatFrThousandsStr(e.target.value))} />
                </Field>
                <Field label="Type de vente">
                  <input className={inputCls} value={data.typeVente} onChange={(e) => update("typeVente", e.target.value)} />
                </Field>
                <Field label="Prix de vente *">
                  <div className="space-y-1">
                    <input
                      className={inputCls}
                      placeholder="3 330 000 €"
                      value={data.prixVente}
                      onChange={(e) => update("prixVente", e.target.value)}
                      onBlur={(e) => update("prixVente", formatFrThousandsStr(e.target.value))}
                      disabled={data.nousConsulter}
                    />
                    <label className="flex items-center gap-2 text-xs text-muted-foreground cursor-pointer">
                      <input
                        type="checkbox"
                        checked={data.nousConsulter}
                        onChange={(e) => update("nousConsulter", e.target.checked)}
                        className="w-4 h-4"
                      />
                      Nous consulter (masque le prix, affiche « Nous consulter » sur la slide Conditions de la vente)
                    </label>
                  </div>
                </Field>
                <Field label="Honoraires *">
                  <input className={inputCls} placeholder="3% HT du prix net vendeur" value={data.honoraires} onChange={(e) => update("honoraires", e.target.value)} onBlur={(e) => update("honoraires", formatFrThousandsStr(e.target.value))} />
                </Field>
                <Field label="Nombre de parkings (optionnel)">
                  <input className={inputCls} placeholder="ex : 120" value={data.nbParkings} onChange={(e) => update("nbParkings", e.target.value)} onBlur={(e) => update("nbParkings", formatFrThousandsStr(e.target.value))} />
                </Field>
              </div>


              <div className="grid grid-cols-[1fr_auto] gap-3 items-end pt-2 border-t border-border mt-3">
                <Field label="📷 Photo de page de garde (obligatoire)">
                  <input type="file" accept="image/*" className={inputCls} onChange={async (e) => update("photoCouverture", await handleSingle(e))} />
                </Field>
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-medium text-muted-foreground mb-1">Position</span>
                  <div className="flex rounded-md overflow-hidden border border-border">
                    <Button
                      type="button"
                      onClick={() => update("photoCouverturePosition", "left")}
                      className={`px-3 py-2 text-xs font-semibold ${data.photoCouverturePosition === "left" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      ⬅ Gauche
                    </Button>
                    <Button
                      type="button"
                      onClick={() => update("photoCouverturePosition", "right")}
                      className={`px-3 py-2 text-xs font-semibold ${data.photoCouverturePosition === "right" ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}
                    >
                      Droite ➡
                    </Button>
                  </div>
                </div>
              </div>
              {!data.photoCouverture && (
                <p className="text-xs font-semibold text-primary mt-2">⚠ Photo de page de garde obligatoire pour générer le PPTX</p>
              )}
              {data.photoCouverture && (
                <div className="mt-2">
                  <UploadedMediaPreview
                    media={data.photoCouverture}
                    alt="cover"
                    className="h-32 rounded border border-border object-cover"
                    onRemove={() => update("photoCouverture", null)}
                  />
                </div>
              )}
              {data.photos.length > 0 && (
                <div className="mt-3 rounded-lg border border-border bg-background p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-2">Ou choisir parmi les photos importées :</p>
                  <div className="grid grid-cols-3 gap-2">
                    {data.photos.map((p, i) => {
                      const isCover = data.photoCouverture?.name === p.name;
                      return (
                        <Button
                          key={i}
                          type="button"
                          onClick={() => setCoverFromPhoto(p)}
                          className={`relative rounded overflow-hidden border-2 transition ${isCover ? "border-border" : "border-border hover:border-border"}`}
                          title={isCover ? "Photo de couverture actuelle" : "Utiliser comme photo de couverture"}
                        >
                          <img src={p.dataUrl} alt={p.name} className="w-full aspect-video object-cover" />
                          {isCover && (
                            <span className="absolute bottom-0 inset-x-0 bg-primary text-primary-foreground text-[10px] font-bold py-0.5 text-center">COUVERTURE</span>
                          )}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              )}

            </Section>


            <Section title="2. Points clés (3 mini et 6 maxi)">
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => {
                  const labels = data.settings.pointsClesPictosLabels || [];
                  const raw = (labels[i] || "").replace(/^Picto\s+/i, "").trim();
                  const label = raw || `Point clé ${i + 1}`;
                  const value = data.pointsCles[i] ?? "";
                  return (
                    <Field
                      key={i}
                      label={(
                        <span className="flex items-center gap-2">
                          <InlinePicto media={data.settings.pointsClesPictos?.[i]} alt={`Picto ${label}`} />
                          <span>{label}</span>
                        </span>
                      )}
                    >
                      <input
                        className={inputCls}
                        value={value}
                        onChange={(e) => {
                          const next = [...data.pointsCles];
                          while (next.length < 6) next.push("");
                          next[i] = e.target.value;
                          update("pointsCles", next);
                        }}
                      />
                    </Field>
                  );
                })}
              </div>
              <div className="flex gap-2">
                <Button type="button" onClick={() => setAddPointOpen(true)} className={btnSecondary}>
                  + Ajouter
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Seuls les points clés remplis apparaissent dans le PPTX. Sans picto, un cercle numéroté orange s'affiche.
              </p>
            </Section>

            {addPointOpen && (
              <div
                className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4"
                onClick={() => setAddPointOpen(false)}
              >
                <div
                  className="w-full max-w-md rounded-lg border border-border bg-card p-5 shadow-xl"
                  onClick={(e) => e.stopPropagation()}
                >
                  <h3 className="mb-4 text-lg font-semibold text-primary-foreground">Ajouter un point clé</h3>
                  <div className="space-y-4">
                    <Field label="Titre du point clé">
                      <input
                        className={inputCls}
                        value={newPointTitle}
                        onChange={(e) => setNewPointTitle(e.target.value)}
                        placeholder="Ex : Surface, Loyer / m²…"
                        autoFocus
                      />
                    </Field>
                    <Field label="Picto (sera automatiquement blanchi)">
                      <input
                        type="file"
                        accept="image/*"
                        className={inputCls}
                        onChange={async (e) => setNewPointPicto(await handleSingle(e))}
                      />
                    </Field>
                    {newPointPicto && (
                      <div className="rounded border border-border bg-background p-2">
                        <img src={newPointPicto.dataUrl} alt="picto" className="h-16 w-16 object-contain" />
                      </div>
                    )}
                  </div>
                  <div className="mt-5 flex justify-end gap-2">
                    <Button
                      type="button"
                      className={btnSecondary}
                      onClick={() => {
                        setAddPointOpen(false);
                        setNewPointTitle("");
                        setNewPointPicto(null);
                      }}
                    >
                      Annuler
                    </Button>
                    <Button
                      type="button"
                      className={btnPrimary}
                      disabled={!newPointTitle.trim()}
                      onClick={submitNewPoint}
                    >
                      Ajouter
                    </Button>
                  </div>
                </div>
              </div>
            )}

            <Section title="3. Localisation">
              <Field label="Description de la ville">
                <textarea
                  className={inputCls + " min-h-[120px]"}
                  value={data.descriptionVille}
                  onChange={(e) => update("descriptionVille", e.target.value)}
                />
              </Field>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={fetchWikipedia}
                  disabled={!data.ville || autoBusy === "wiki"}
                  className="text-xs px-3 py-1.5 rounded bg-primary hover:bg-primary disabled:opacity-50"
                >
                  {autoBusy === "wiki" ? "Recherche…" : "↻ Wikipédia"}
                </Button>
                <Button
                  type="button"
                  onClick={() => onAIEnrich("ville")}
                  disabled={!data.ville || autoBusy === "ai-ville"}
                  className="text-xs px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 font-semibold"
                >
                  {autoBusy === "ai-ville" ? "IA…" : "✨ Enrichir par IA (Lovable AI)"}
                </Button>
                <Button
                  type="button"
                  onClick={() => onFetchMap("localisation")}
                  disabled={autoBusy === "map-localisation"}
                  className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold"
                >
                  {autoBusy === "map-localisation" ? "…" : "Relancer carte Google Maps"}
                </Button>
              </div>
              <InteractiveGoogleMap
                address={composedAddress()}
                value={data.mapsSettings?.localisation ?? null}
                previewMedia={data.carteRegion}
                errorMessage={mapErrors.localisation}
                defaultZoom={getPreferredZoom("localisation")}
                mapType={DEFAULT_MAP_TYPE.localisation}
                aspectRatio={6.8 / 5.5}
                onChange={(v) => setMapSettings("localisation", v)}
                onCommit={(v) => refreshMapMedia("localisation", v)}
              />
            </Section>

            <Section title="4. Zone de chalandise + revenus (avant environnement commercial)">
              <div className="grid grid-cols-3 gap-3">
                <Field label="Mode de déplacement">
                  <select className={inputCls} value={data.modeChalandise} onChange={(e) => update("modeChalandise", e.target.value as "voiture" | "pieton")}>
                    <option value="voiture">Voiture</option>
                    <option value="pieton">À pied</option>
                  </select>
                </Field>
                <Field label="Zone primaire (min)">
                  <input type="number" className={inputCls} value={data.dureeZone1} onChange={(e) => update("dureeZone1", parseInt(e.target.value) || 0)} />
                </Field>
                <Field label="Zone secondaire (min)">
                  <input type="number" className={inputCls} value={data.dureeZone2} onChange={(e) => update("dureeZone2", parseInt(e.target.value) || 0)} />
                </Field>
                <Field label="Population zone primaire">
                  <input className={inputCls} value={data.populationZone1} onChange={(e) => update("populationZone1", e.target.value)} onBlur={(e) => update("populationZone1", formatFrThousandsStr(e.target.value))} />
                </Field>
                <Field label="Population zone secondaire">
                  <input className={inputCls} value={data.populationZone2} onChange={(e) => update("populationZone2", e.target.value)} onBlur={(e) => update("populationZone2", formatFrThousandsStr(e.target.value))} />
                </Field>



                <Field label="Image isochrone (upload manuel)">
                  <input type="file" accept="image/*" className={inputCls} onChange={async (e) => update("chalandiseImage", await handleSingle(e))} />
                </Field>
              </div>
              <div className="pt-2 flex flex-wrap gap-3 items-center">
                <Button
                  type="button"
                  onClick={onGenerateIsochrone}
                  disabled={autoBusy === "iso"}
                  className="text-xs px-3 py-1.5 rounded bg-primary hover:bg-primary disabled:opacity-50 font-semibold"
                >
                  {autoBusy === "iso" ? "Génération…" : "⚡ Relancer la carte OpenStreetMap de chalandise"}
                </Button>
                <a
                  href={`https://classic-maps.openrouteservice.org/reach?n1=&n2=&n3=13&b=0&i=0&j1=${data.dureeZone1}&j2=${data.dureeZone2}&k1=fr-FR&k2=km`}
                  target="_blank" rel="noreferrer"
                  className="text-xs text-primary hover:underline"
                >
                  ↗ OpenRouteService (manuel)
                </a>
              </div>
              {data.chalandiseImage && (
                <div className="mt-2">
                  <UploadedMediaPreview
                    media={data.chalandiseImage}
                    alt="isochrone"
                    className="max-h-64 rounded border-2 border-border bg-card object-contain"
                    onRemove={() => update("chalandiseImage", null)}
                  />
                </div>
              )}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="col-span-2 flex items-center justify-between">
                  <div className="text-xs font-semibold uppercase text-primary">Revenus mensuels nets à {data.ville || "…"}</div>
                  <Button
                    type="button"
                    onClick={onFetchRevenus}
                    disabled={!data.ville || autoBusy === "revenus"}
                    className="text-xs px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 font-semibold"
                  >
                    {autoBusy === "revenus" ? "Recherche…" : "Récupérer auto (salairemoyen.com + IA)"}
                  </Button>
                </div>
                {REVENU_LABELS.map(([k, label], i) => (
                  <Field
                    key={k}
                    label={(
                      <span className="flex items-center gap-2">
                        <InlinePicto media={data.settings.revenusPictos?.[i]} alt={`Picto revenu ${label}`} />
                        <span>{label}</span>
                      </span>
                    )}
                    bold
                  >
                    <input
                      className={inputCls}
                      placeholder="1 458 € nets/mois"
                      value={data.revenus[k]}
                      onChange={(e) => update("revenus", { ...data.revenus, [k]: e.target.value })}
                    />
                  </Field>
                ))}

              </div>
              <a
                href={`https://www.salairemoyen.com/salaire-ville-${encodeURIComponent(data.ville || "")}.html`}
                target="_blank" rel="noreferrer"
                className="text-xs text-primary hover:underline"
              >
                ↗ salairemoyen.com (vérification manuelle)
              </a>
              <p className="text-xs text-muted-foreground">Les pictos ménages se règlent dans Paramètres.</p>
            </Section>

            <Section title="5. Environnement commercial (après chalandise)">
              <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={data.includeEnvironnement} onChange={(e) => update("includeEnvironnement", e.target.checked)} className="w-4 h-4" />
                  Inclure cette slide dans la brochure
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={(data.envType || "peripherie") === "peripherie"} onChange={() => update("envType", "peripherie")} className="w-4 h-4" />
                  Périphérie
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={data.envType === "centre-ville"} onChange={() => update("envType", "centre-ville")} className="w-4 h-4" />
                  Centre-ville
                </label>
              </div>
              {data.includeEnvironnement && (
                <>
                  <p className="text-xs text-muted-foreground">Les enseignes détectées dans un rayon de 500 m sont affichées directement sur la carte.</p>
                  <div className="grid grid-cols-1 gap-3">
                    <Field label={data.envType === "centre-ville" ? "Flux piéton (auto IA)" : "Trafic routier (auto IA)"}>
                      <textarea className={inputCls + " min-h-[80px] whitespace-pre-wrap break-words"} style={{ resize: "vertical" }} value={data.envTrafic} onChange={(e) => update("envTrafic", e.target.value)} onBlur={(e) => update("envTrafic", formatFrThousandsStr(e.target.value))} />
                    </Field>
                    <Field label="🛒 CA zone / CA hypermarché s'il existe (auto IA)">
                      <textarea className={inputCls + " min-h-[80px] whitespace-pre-wrap break-words"} style={{ resize: "vertical" }} value={data.envCA} onChange={(e) => update("envCA", e.target.value)} />
                    </Field>
                    <Field label="🏗 Projets à venir (auto IA)">
                      <textarea className={inputCls + " min-h-[80px] whitespace-pre-wrap break-words"} style={{ resize: "vertical" }} value={data.envProjets} onChange={(e) => update("envProjets", e.target.value)} />
                    </Field>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Button type="button" onClick={() => onFetchMap("environnement")} disabled={autoBusy === "map-environnement"} className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold">
                      {autoBusy === "map-environnement" ? "…" : "Relancer carte Google Maps"}
                    </Button>
                    <Button type="button" onClick={onScanEnseignes} disabled={autoBusy === "nearby"} className="text-xs px-3 py-1.5 rounded bg-success hover:bg-success disabled:opacity-50 font-semibold">
                      {autoBusy === "nearby" ? "…" : "Actualiser les enseignes sur la carte"}
                    </Button>
                    <Button type="button" onClick={() => onAIEnrich(data.envType === "centre-ville" ? "fluxPieton" : "traficRoutier")} disabled={autoBusy === "ai-fluxPieton" || autoBusy === "ai-traficRoutier"} className="text-xs px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50">
                      {(autoBusy === "ai-fluxPieton" || autoBusy === "ai-traficRoutier") ? "…" : data.envType === "centre-ville" ? "Relancer flux piéton" : "Relancer trafic routier"}
                    </Button>
                    <Button type="button" onClick={() => onAIEnrich("commerce")} disabled={autoBusy === "ai-commerce"} className="text-xs px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50">
                      {autoBusy === "ai-commerce" ? "…" : "Relancer CA/commerces"}
                    </Button>
                    <Button type="button" onClick={() => onAIEnrich("projets")} disabled={autoBusy === "ai-projets"} className="text-xs px-3 py-1.5 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50">
                      {autoBusy === "ai-projets" ? "…" : "Relancer projets"}
                    </Button>
                  </div>
                  <Field label="Plan / carte de l'environnement commercial (upload manuel)">
                    <input type="file" accept="image/*" className={inputCls} onChange={async (e) => update("envCarte", await handleSingle(e))} />
                  </Field>
                  <InteractiveGoogleMap
                    address={composedAddress()}
                    value={data.mapsSettings?.environnement ?? null}
                    previewMedia={data.envCarte}
                    errorMessage={mapErrors.environnement}
                    defaultZoom={getPreferredZoom("environnement")}
                    mapType={DEFAULT_MAP_TYPE.environnement}
                    aspectRatio={8.15 / 5.72}
                    labels={data.envMapLabels}
                    onChange={(v) => setMapSettings("environnement", v)}
                    onCommit={(v) => refreshMapMedia("environnement", v)}
                  />
                  {data.envCarte && data.envCarte.name && !/^map-environnement\.png$/i.test(data.envCarte.name) && (
                    <UploadedMediaPreview
                      media={data.envCarte}
                      alt="Carte environnement commercial"
                      className="mt-2 max-h-32 rounded border border-border bg-card object-contain"
                      onRemove={() => update("envCarte", null)}
                    />
                  )}
                </>
              )}
            </Section>

            <Section title="6. Accessibilité immédiate">
              <p className="text-xs font-semibold text-primary">
                ⚠ Slide à terminer dans le PPTX en plaçant vos flèches d'accès.
              </p>
              <Button type="button" onClick={() => onFetchMap("accessibilite")} disabled={autoBusy === "map-accessibilite"} className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 font-semibold">
                {autoBusy === "map-accessibilite" ? "…" : "Relancer carte Google Maps satellite"}
              </Button>
              <Field label="Carte accessibilité manuelle (si besoin)">
                <input type="file" accept="image/*" className={inputCls} onChange={async (e) => update("accessibiliteCarte", await handleSingle(e))} />
              </Field>
              <InteractiveGoogleMap
                address={composedAddress()}
                value={data.mapsSettings?.accessibilite ?? null}
                previewMedia={data.accessibiliteCarte}
                errorMessage={mapErrors.accessibilite}
                defaultZoom={getPreferredZoom("accessibilite")}
                mapType={DEFAULT_MAP_TYPE.accessibilite}
                aspectRatio={7.55 / 4.9}
                onChange={(v) => setMapSettings("accessibilite", v)}
                onCommit={(v) => refreshMapMedia("accessibilite", v)}
              />
              {data.accessibiliteCarte && data.accessibiliteCarte.name && !/^map-accessibilite\.png$/i.test(data.accessibiliteCarte.name) && (
                <UploadedMediaPreview
                  media={data.accessibiliteCarte}
                  alt="Carte accessibilité"
                  className="mt-2 max-h-32 rounded border border-border bg-card object-contain"
                  onRemove={() => update("accessibiliteCarte", null)}
                />
              )}
            </Section>

            <Section title="7. État locatif">
              <Field label="📎 Importer un état locatif à part (Excel, PDF ou image)">
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv,.ods,.pdf,image/*"
                  className={inputCls}
                  disabled={etatBusy}
                  onChange={onImportEtatLocatif}
                />
                <p className="text-[10px] text-muted-foreground mt-1">
                  {etatBusy ? "Extraction en cours…" : "Remplit automatiquement le tableau ci-dessous à partir du fichier fourni (écrase les lignes actuelles)."}
                </p>
              </Field>
              <Field label="Nombre de locataires">
                <input type="number" min={1} max={20} className={inputCls + " w-32"} value={data.nbLocataires} onChange={(e) => setNbLocataires(parseInt(e.target.value) || 1)} />
              </Field>
              <div className="overflow-x-auto">
                <table className="w-full text-xs border-collapse">
                  <thead>
                    <tr className="bg-muted text-foreground">
                      <th className="px-2 py-2 text-left font-medium w-16">Ordre</th>
                      {["Enseigne", "Surface (m²)", "Loyer annuel HC-HT", "Loyer/m²", "Début bail", "Prochain Break", "WALB", "Fin bail", "WALT"].map((h) => (
                        <th key={h} className="px-2 py-2 text-left font-medium">{h}</th>
                      ))}
                      <th className="px-2 py-2 text-left font-medium w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.locataires.map((row, i) => (
                      <tr key={i} className="border-t border-border">
                        <td className="p-1">
                          <div className="flex flex-col gap-0.5">
                            <Button type="button" title="Monter" disabled={i === 0} onClick={() => moveLocataire(i, -1)} className="px-1 py-0.5 text-xs rounded bg-muted hover:bg-card disabled:opacity-30">▲</Button>
                            <Button type="button" title="Descendre" disabled={i === data.locataires.length - 1} onClick={() => moveLocataire(i, 1)} className="px-1 py-0.5 text-xs rounded bg-muted hover:bg-card disabled:opacity-30">▼</Button>
                          </div>
                        </td>
                        {(["enseigne", "surface", "loyerAnnuel", "loyerM2", "debutBail", "prochainBreak", "walb", "finBail", "walt"] as Array<keyof RentalRow>).map((field) => {
                          const isNumeric = field === "surface" || field === "loyerAnnuel" || field === "loyerM2";
                          return (
                            <td key={field} className="p-1">
                              <input
                                className="w-full px-2 py-1 rounded bg-background border border-border text-foreground text-xs"
                                value={row[field]}
                                onChange={(e) => setLocataire(i, field, e.target.value)}
                                onBlur={isNumeric ? (e) => setLocataire(i, field, formatFrThousandsStr(e.target.value)) : undefined}
                              />
                            </td>
                          );
                        })}
                        <td className="p-1">
                          <div className="flex flex-col gap-0.5">
                            <Button type="button" title="Insérer une ligne en-dessous" onClick={() => insertLocataire(i)} className="px-1 py-0.5 text-xs rounded bg-emerald-700 hover:bg-emerald-600 text-primary-foreground">+</Button>
                            <Button type="button" title="Supprimer la ligne" disabled={data.locataires.length <= 1} onClick={() => removeLocataire(i)} className="px-1 py-0.5 text-xs rounded bg-rose-700 hover:bg-rose-600 text-primary-foreground disabled:opacity-30">✕</Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {data.nbLocataires > 1 && (
                <p className="text-xs text-muted-foreground">Une ligne TOTAL sera automatiquement ajoutée. Utilisez ▲▼ pour réordonner et + / ✕ pour ajouter/supprimer une ligne (utile pour saisir manuellement une ligne oubliée à l'import).</p>
              )}
            </Section>



            <Section title="8. Reportage photos (facultatif, jusqu’à 6 photos)">
              <div className="flex items-center gap-2">
                <label className={`text-xs px-3 py-1.5 rounded font-semibold cursor-pointer ${data.photos.length >= 6 ? "bg-card text-muted-foreground" : "bg-primary hover:bg-primary text-primary-foreground"}`}>
                  + Ajouter
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    disabled={data.photos.length >= 6}
                    onChange={(e) => appendMedia("photos", e)}
                  />
                </label>
                <span className="text-xs text-muted-foreground">{data.photos.length} / 6 image(s)</span>
              </div>
              {data.photos.length > 0 && (
                <>
                  <p className="text-xs text-muted-foreground mt-2">Cochez les photos à inclure dans le reportage. « Couverture » envoie la photo sur la page de garde.</p>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {data.photos.map((p, i) => {
                      const exclue = (data.photosExclues || []).includes(p.name);
                      const isCover = data.photoCouverture?.name === p.name;
                      return (
                        <div key={i} className={`relative group rounded border-2 overflow-hidden transition ${exclue ? "border-border opacity-50" : isCover ? "border-border" : "border-border"}`}>
                          <img src={p.dataUrl} alt={p.name} className="w-full aspect-video object-cover" />
                          {isCover && (
                            <span className="absolute top-1 left-1 bg-primary text-primary-foreground text-[10px] font-bold px-1.5 py-0.5 rounded">COUVERTURE</span>
                          )}
                          <Button
                            type="button"
                            onClick={() => removeMedia("photos", i)}
                            className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-primary-foreground text-xs opacity-0 group-hover:opacity-100 transition"
                          >
                            ✕
                          </Button>
                          <div className="flex items-center justify-between gap-1 px-1.5 py-1 bg-background">
                            <label className="flex items-center gap-1 text-[10px] font-semibold text-foreground cursor-pointer">
                              <input
                                type="checkbox"
                                checked={!exclue}
                                onChange={() => togglePhotoReportage(p.name)}
                                className="accent-teal-500"
                              />
                              Reportage
                            </label>
                            {!isCover && (
                              <Button
                                type="button"
                                onClick={() => setCoverFromPhoto(p)}
                                className="text-[10px] font-semibold text-primary hover:text-primary"
                              >
                                Couverture
                              </Button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </Section>



            <Section title="9. Plan de masse (1 seul)">
              <Field label="Plan de masse principal">
                <input type="file" accept="image/*" className={inputCls} onChange={async (e) => update("planMasse", await handleSingle(e))} />
              </Field>
              {data.planMasse && (
                <div className="space-y-2">
                  <div className="relative group">
                    <div
                      className="w-full rounded border border-border bg-card overflow-hidden"
                      style={{ aspectRatio: "10.6 / 6.8" }}
                      title="Aperçu à l'échelle : la zone reproduit exactement les proportions du plan dans le PowerPoint (10,6 × 6,8 pouces sur une slide 13,33 × 7,5)."
                    >
                      <img src={data.planMasse.dataUrl} alt="plan de masse" className="w-full h-full object-contain" />
                    </div>
                    <Button
                      type="button"
                      aria-label="Supprimer le plan de masse"
                      title="Supprimer le plan de masse"
                      onClick={() => update("planMasse", null)}
                      className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-base font-bold leading-none text-primary-foreground shadow hover:bg-destructive"
                    >
                      ×
                    </Button>
                  </div>
                  <Button type="button" onClick={() => update("planMasse", null)} className="text-xs px-3 py-1.5 rounded bg-destructive hover:bg-destructive border border-border text-destructive">
                    Supprimer le plan de masse
                  </Button>
                </div>
              )}
            </Section>

            <MediaSection
              title="10. Plans (illimité — chaque plan génère sa propre slide avec le titre saisi)"
              items={data.plans}
              onAdd={(e) => appendMedia("plans", e)}
              onRemove={(i) => removeMedia("plans", i)}
              onTitleChange={(i, t) => setMediaTitle("plans", i, t)}
              gridCols={2}
              fit="contain"
            />

            <MediaSection
              title="11. Perspectives (illimité — chaque perspective génère sa propre slide avec le titre saisi)"
              items={data.perspectives}
              onAdd={(e) => appendMedia("perspectives", e)}
              onRemove={(i) => removeMedia("perspectives", i)}
              onTitleChange={(i, t) => setMediaTitle("perspectives", i, t)}
              gridCols={2}
              fit="contain"
            />
            </Stepper>

            <div className="flex flex-wrap justify-end gap-3 pt-4 pb-12">
              <Button
                onClick={onGenerate}
                disabled={busy}
                className="px-6 py-3 rounded-md bg-primary hover:bg-primary disabled:opacity-50 text-primary-foreground font-semibold shadow-lg"
              >
                {busy ? "Génération en cours…" : "📥 Générer & télécharger la brochure PPTX"}
              </Button>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function MediaSection({
  title, items, onAdd, onRemove, gridCols, fit, max, onTitleChange,
}: {
  title: string;
  items: BrochureMedia[];
  onAdd: (e: ChangeEvent<HTMLInputElement>) => void;
  onRemove: (i: number) => void;
  gridCols: number;
  fit: "cover" | "contain";
  max?: number;
  onTitleChange?: (i: number, title: string) => void;
}) {
  const atMax = max !== undefined && items.length >= max;
  return (
    <Section title={title}>
      <div className="flex items-center gap-2">
        <label className={`text-xs px-3 py-1.5 rounded font-semibold cursor-pointer ${atMax ? "bg-card text-muted-foreground" : "bg-primary hover:bg-primary text-primary-foreground"}`}>
          + Ajouter
          <input
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            disabled={atMax}
            onChange={onAdd}
          />
        </label>
        <span className="text-xs text-muted-foreground">
          {items.length}{max ? ` / ${max}` : ""} image(s)
        </span>
      </div>
      {items.length > 0 && (
        <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}>
          {items.map((p, i) => (
            <div key={i} className="relative group space-y-1">
              <div
                className="w-full rounded border border-border bg-card overflow-hidden"
                style={{ aspectRatio: fit === "contain" ? "10.6 / 6.8" : "16 / 9" }}
                title={fit === "contain" ? "Aperçu à l'échelle : la zone reproduit exactement les proportions du plan dans le PowerPoint." : undefined}
              >
                <img
                  src={p.dataUrl}
                  alt=""
                  className={`w-full h-full ${fit === "cover" ? "object-cover" : "object-contain"}`}
                />
              </div>
              {onTitleChange && (
                <input
                  className="w-full px-2 py-1 rounded bg-background border border-border text-foreground text-xs"
                  placeholder="Titre de la slide"
                  value={p.title || ""}
                  onChange={(e) => onTitleChange(i, e.target.value)}
                />
              )}
              <Button
                type="button"
                onClick={() => onRemove(i)}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-destructive text-primary-foreground text-xs opacity-0 group-hover:opacity-100 transition"
              >
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

// ═════════════════════ SETTINGS TAB ═════════════════════

function SettingsTab({
  data, setPictoSlot, updateSettings, updateTeam, addTeamMember, removeTeamMember, restoreDefaultTeam,
}: {
  data: BrochureData;
  setPictoSlot: (arrKey: "pointsClesPictos" | "revenusPictos", index: number, media: BrochureMedia | null) => void;
  updateSettings: <K extends keyof BrochureData["settings"]>(key: K, value: BrochureData["settings"][K]) => void;
  updateTeam: (i: number, patch: Partial<TeamMember>) => void;
  addTeamMember: () => void;
  removeTeamMember: (i: number) => void;
  restoreDefaultTeam: () => void;
}) {

  const handleSingle = async (e: ChangeEvent<HTMLInputElement>): Promise<BrochureMedia | null> => {
    const f = e.target.files?.[0];
    if (!f) return null;
    return fileToMedia(f);
  };

  return (
    <>
      <div className="rounded-lg border border-border bg-primary p-4 text-sm">
        <p className="text-primary font-semibold mb-1">Paramètres réutilisables</p>
        <p className="text-muted-foreground text-xs">
          Les assets ci-dessous sont mémorisés pour toutes les brochures : ils garantissent la cohérence graphique
          (pictos, carte France, équipe). Uploadez-les une fois, ils seront réutilisés à chaque génération.
        </p>
      </div>





      <Section title="Carte de France (fond slide Localisation)">
        <Field label="Image PNG transparente de la France">
          <input
            type="file"
            accept="image/*"
            className={inputCls}
            onChange={async (e) => updateSettings("franceMap", await handleSingle(e))}
          />
        </Field>
        {data.settings.franceMap && (
          <UploadedMediaPreview
            media={data.settings.franceMap}
            alt="france"
            className="max-h-40 rounded border border-border bg-card object-contain"
            onRemove={() => updateSettings("franceMap", null)}
          />
        )}
        <p className="text-xs text-muted-foreground">Un point orange sera placé au centre par défaut ; à repositionner manuellement dans PowerPoint sur la ville.</p>
      </Section>

      <Section title="Slides fixes — Confidentialité et À propos">
        <p className="text-xs text-muted-foreground mb-2">
          Ces deux slides sont figées et seront ajoutées telles quelles à la fin de chaque brochure générée. Formats acceptés : <b>.pptx</b> (recommandé — la mise en page originale est conservée) ou image.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Confidentialité / exclusion (.pptx ou image)">
            <input
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
              className={inputCls}
              onChange={async (e) => updateSettings("fixedConfidentialiteSlide", await handleSingle(e))}
            />
          </Field>
          <Field label="À propos / équipe (.pptx ou image)">
            <input
              type="file"
              accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation,image/*"
              className={inputCls}
              onChange={async (e) => updateSettings("fixedAProposSlide", await handleSingle(e))}
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
          {data.settings.fixedConfidentialiteSlide && (
            <div className="rounded border border-border bg-card p-2 space-y-2">
              {/\.pptx?$/i.test(data.settings.fixedConfidentialiteSlide.name || "") || /presentationml/.test(data.settings.fixedConfidentialiteSlide.dataUrl.slice(0, 200)) ? (
                <div className="text-xs text-primary py-8 text-center">📎 {data.settings.fixedConfidentialiteSlide.name || "Confidentialite.pptx"}<br/><span className="text-muted-foreground">Slide PPTX — ajoutée telle quelle</span></div>
              ) : (
                <img src={data.settings.fixedConfidentialiteSlide.dataUrl} alt="Slide confidentialité" className="w-full rounded object-contain" />
              )}
              <Button type="button" onClick={() => updateSettings("fixedConfidentialiteSlide", null)} className={btnSecondary}>× Retirer</Button>
            </div>
          )}
          {data.settings.fixedAProposSlide && (
            <div className="rounded border border-border bg-card p-2 space-y-2">
              {/\.pptx?$/i.test(data.settings.fixedAProposSlide.name || "") || /presentationml/.test(data.settings.fixedAProposSlide.dataUrl.slice(0, 200)) ? (
                <div className="text-xs text-primary py-8 text-center">📎 {data.settings.fixedAProposSlide.name || "A_propos.pptx"}<br/><span className="text-muted-foreground">Slide PPTX — ajoutée telle quelle</span></div>
              ) : (
                <img src={data.settings.fixedAProposSlide.dataUrl} alt="Slide à propos" className="w-full rounded object-contain" />
              )}
              <Button type="button" onClick={() => updateSettings("fixedAProposSlide", null)} className={btnSecondary}>× Retirer</Button>
            </div>
          )}
        </div>
      </Section>

      <Section title="Pictos points clés (6 slots)">
        <p className="text-xs text-muted-foreground mb-2">Renommez chaque emplacement (ex. « Surface », « Loyer/m² », « Revenu locatif »). Le libellé s'affichera dans le Générateur au-dessus du champ correspondant, et le picto sera utilisé au même emplacement dans la brochure.</p>
        <div className="grid grid-cols-3 gap-3">
          {data.settings.pointsClesPictos.map((p, i) => {
            const labels = data.settings.pointsClesPictosLabels || [];
            const label = labels[i] ?? `Point clé #${i + 1}`;
            return (
              <div key={i} className="rounded border border-border p-2 space-y-2">
                <div className="text-[10px] uppercase tracking-wide text-muted-foreground">Slot #{i + 1}</div>
                <input
                  className={inputCls}
                  value={label}
                  placeholder={`Point clé #${i + 1}`}
                  onChange={(e) => {
                    const next = [...(data.settings.pointsClesPictosLabels || [])];
                    while (next.length < 6) next.push("");
                    next[i] = e.target.value;
                    updateSettings("pointsClesPictosLabels", next);
                  }}
                />
                <input
                  type="file"
                  accept="image/*"
                  className={inputCls}
                  onChange={async (e) => setPictoSlot("pointsClesPictos", i, await handleSingle(e))}
                />
                {p && (
                  <div className="flex items-center gap-2">
                    <UploadedMediaPreview
                      media={p}
                      alt={`Picto point clé ${i + 1}`}
                      className="h-12 w-12 object-contain rounded bg-card"
                      onRemove={() => setPictoSlot("pointsClesPictos", i, null)}
                    />
                    <Button type="button" onClick={() => setPictoSlot("pointsClesPictos", i, null)} className={btnSecondary}>× Retirer</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      <Section title="Pictos revenus des ménages (6 slots)">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {REVENU_LABELS.map(([, label], i) => {
            const p = data.settings.revenusPictos[i];
            return (
              <div key={i} className="rounded border border-border p-2 space-y-2">
                <div className="text-xs font-semibold text-primary">{label}</div>
                <input
                  type="file"
                  accept="image/*"
                  className={inputCls}
                  onChange={async (e) => setPictoSlot("revenusPictos", i, await handleSingle(e))}
                />
                {p && (
                  <div className="flex items-center gap-2">
                    <UploadedMediaPreview
                      media={p}
                      alt={`Picto revenu ${label}`}
                      className="h-10 w-10 object-contain rounded bg-card"
                      onRemove={() => setPictoSlot("revenusPictos", i, null)}
                    />
                    <Button type="button" onClick={() => setPictoSlot("revenusPictos", i, null)} className={btnSecondary}>× Retirer</Button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Bloc Équipe supprimé : géré via la slide fixe À propos (.pptx). */}

      {/* Bibliothèque de logos supprimée : les logos sont désormais toujours re-téléchargés à chaque scan d'enseignes. */}

      <AllowedUsersSection />
    </>
  );
}

function AllowedUsersSection() {
  const listFn = useServerFn(listAllowedUsers);
  const addFn = useServerFn(addAllowedUser);
  const delFn = useServerFn(deleteAllowedUser);
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [needsSignIn, setNeedsSignIn] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      setErr(null);
      setNeedsSignIn(false);
      // Wait briefly for session hydration (page just loaded), but don't hard-block.
      let { data: { session } } = await supabase.auth.getSession();
      for (let i = 0; i < 10 && !session?.access_token; i++) {
        await new Promise((r) => setTimeout(r, 100));
        ({ data: { session } } = await supabase.auth.getSession());
      }
      if (!session?.access_token) {
        setNeedsSignIn(true);
        setUsers([]);
        return;
      }
      const rows = await listFn();
      setUsers(rows);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (/unauthor/i.test(msg)) setNeedsSignIn(true);
      else setErr(msg);
    } finally {
      setLoading(false);
    }
  }, [listFn]);

  useEffect(() => { void refresh(); }, [refresh]);


  const onAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setErr("Prénom, nom et email sont requis.");
      return;
    }
    try {
      setBusy(true);
      await addFn({ data: { first_name: firstName.trim(), last_name: lastName.trim(), email: email.trim() } });
      setFirstName(""); setLastName(""); setEmail("");
      await refresh();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const onDelete = async (u: AllowedUser) => {
    if (!confirm(`Supprimer l'accès de ${u.first_name} ${u.last_name} (${u.email}) ?`)) return;
    try {
      await delFn({ data: { id: u.id } });
      await refresh();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  return (
    <Section title="Utilisateurs autorisés">
      <p className="text-xs text-muted-foreground mb-2">
        Chaque personne ajoutée ici pourra se connecter à l'outil avec son adresse email professionnelle.
      </p>

      <form onSubmit={onAdd} className="grid grid-cols-1 md:grid-cols-4 gap-2 items-end">
        <Field label="Prénom">
          <input className={inputCls} value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Prénom" />
        </Field>
        <Field label="Nom">
          <input className={inputCls} value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Nom" />
        </Field>
        <Field label="Email">
          <input type="email" className={inputCls} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="prenom.nom@wallsbroker.com" />
        </Field>
        <Button
          type="submit"
          disabled={busy}
          className="h-9 rounded-md bg-primary hover:bg-primary disabled:opacity-50 text-primary-foreground font-semibold text-xs px-3"
        >
          {busy ? "Ajout…" : "+ Ajouter"}
        </Button>
      </form>

      {err && (
        <p className="text-xs text-destructive bg-destructive border border-border rounded p-2 mt-2">{err}</p>
      )}

      {needsSignIn && (
        <div className="mt-2 rounded border border-amber-800 bg-amber-950/40 p-3 text-xs text-amber-200 flex items-center justify-between gap-3">
          <span>Connecte-toi pour gérer les utilisateurs autorisés.</span>
          <a href="/auth" className="rounded bg-primary hover:bg-primary text-primary-foreground font-semibold px-3 py-1.5">Se connecter</a>
        </div>
      )}


      <div className="mt-4 rounded border border-border divide-y divide-slate-800 bg-card">
        {loading ? (
          <div className="p-3 text-xs text-muted-foreground">Chargement…</div>
        ) : users.length === 0 ? (
          <div className="p-3 text-xs text-muted-foreground">Aucun utilisateur autorisé.</div>
        ) : (
          users.map((u) => (
            <div key={u.id} className="flex items-center gap-3 p-2 text-xs">
              <div className="flex-1 min-w-0">
                <div className="font-semibold text-foreground">{u.first_name} {u.last_name}</div>
                <div className="text-muted-foreground truncate">{u.email}</div>
              </div>
              <Button
                type="button"
                onClick={() => onDelete(u)}
                className="text-xs px-2 py-1 rounded bg-destructive hover:bg-destructive text-primary-foreground"
              >
                Supprimer
              </Button>
            </div>
          ))
        )}
      </div>
    </Section>
  );
}


// ═════════════════════ COMPARABLES TAB ═════════════════════

function ComparablesTab({
  data, update, addComparable, updateComparable, removeComparable, importFromEtatLocatif,
  onImportFile, importBusy,
  mailList, mailKeyword, setMailKeyword, onScanOutlook, onExtractFromMail, mailBusy,
  fullScan, startFullMailboxScan, stopFullMailboxScan, mailError,
  autoIngest, onRunAutoIngest,
}: {
  data: BrochureData;
  update: <K extends keyof BrochureData>(key: K, value: BrochureData[K]) => void;
  addComparable: (c: Omit<Comparable, "id">) => void;
  updateComparable: (id: string, patch: Partial<Comparable>) => void;
  removeComparable: (id: string) => void;
  importFromEtatLocatif: () => void;
  onImportFile: (f: File) => Promise<void>;
  importBusy: boolean;
  mailList: Array<{ id: string; subject: string; from: string; date: string }>;
  mailKeyword: string;
  setMailKeyword: (v: string) => void;
  onScanOutlook: () => Promise<void>;
  onExtractFromMail: (id: string, subject: string) => Promise<void>;
  mailBusy: string | null;
  fullScan: { running: boolean; stop: boolean; folder: string; foldersDone: number; foldersTotal: number; mailsDone: number; added: number; updated: number; lastError: string } | null;
  mailError: string;
  startFullMailboxScan: () => Promise<void>;
  stopFullMailboxScan: () => void;
  autoIngest: { busy: boolean; status: string };
  onRunAutoIngest: () => void;
}) {
  const [kindFilter, setKindFilter] = useState<"location" | "prix">("location");
  const [showAdd, setShowAdd] = useState(false);
  const emptyDraft = (kind: "location" | "prix"): Omit<Comparable, "id"> => ({
    kind,
    typeActif: "",
    enseigne: "", ville: "", codePostal: "", adresse: "", surface: "", surfacePonderee: "",
    loyerAnnuel: "", loyerM2: "", loyerM2Pondere: "", prixVente: "", prixM2: "", rendement: "",
    dateSignature: new Date().toISOString().slice(0, 10),
    source: "manuel", notes: "",
  });
  const [draft, setDraft] = useState<Omit<Comparable, "id">>(emptyDraft("location"));
  const [search, setSearch] = useState("");
  const [surfMin, setSurfMin] = useState("");
  const [surfMax, setSurfMax] = useState("");
  const [prixMin, setPrixMin] = useState("");
  const [prixMax, setPrixMax] = useState("");

  const openAdd = () => { setDraft(emptyDraft(kindFilter)); setShowAdd(true); };

  const num = (s?: string) => {
    if (!s) return NaN;
    const n = Number(String(s).replace(/[^\d.,-]/g, "").replace(/\s/g, "").replace(",", "."));
    return isNaN(n) ? NaN : n;
  };
  const fmt = (n: number, digits = 0) => isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "—";
  const tableInput = (c: Comparable, field: Exclude<keyof Comparable, "id">, extra = "", placeholder = "") => (
    <input
      className={`w-full min-w-20 rounded border border-transparent bg-transparent px-1 py-1 text-xs text-foreground outline-none hover:border-border focus:border-border focus:bg-background placeholder:text-muted-foreground ${extra}`}
      value={String(c[field] ?? "")}
      placeholder={placeholder}
      onChange={(e) => updateComparable(c.id, { [field]: e.target.value } as Partial<Comparable>)}
    />
  );

  const submit = () => {
    if (!draft.enseigne) { alert("Enseigne obligatoire."); return; }
    const surf = num(draft.surface);
    const surfP = num(draft.surfacePonderee);
    const loyer = num(draft.loyerAnnuel);
    const prix = num(draft.prixVente);
    const computed: Omit<Comparable, "id"> = {
      ...draft,
      loyerM2: isFinite(loyer) && isFinite(surf) && surf > 0 ? String(Math.round(loyer / surf)) : draft.loyerM2,
      loyerM2Pondere: draft.kind === "location" && isFinite(loyer) && isFinite(surfP) && surfP > 0 ? String(Math.round(loyer / surfP)) : draft.loyerM2Pondere,
      prixM2: draft.kind === "prix" && isFinite(prix) && isFinite(surf) && surf > 0 ? String(Math.round(prix / surf)) : draft.prixM2,
      rendement: draft.kind === "prix" && isFinite(loyer) && isFinite(prix) && prix > 0 ? (loyer / prix * 100).toFixed(2) : draft.rendement,
    };
    addComparable(computed);
    setDraft(emptyDraft(kindFilter));
    setShowAdd(false);
  };

  return (
    <>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-primary px-5 py-4">
        <div>
          <p className="text-primary text-xs uppercase tracking-widest">Base Comparables</p>
          <p className="text-muted-foreground text-xs mt-1">Historique de références locatives (mémorisées localement).</p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-primary leading-none">{data.comparables.filter(c => (c.kind || "location") === kindFilter).length}</div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{kindFilter === "location" ? "réf. locatives" : "réf. de prix"}</div>
        </div>
      </div>

      {/* Toggle type de comparables */}
      <div className="flex justify-center">
        <div className="inline-flex rounded-md border border-border bg-card overflow-hidden text-xs font-semibold">
          <Button
            type="button"
            onClick={() => setKindFilter("location")}
            className={`px-4 py-2 ${kindFilter === "location" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary-foreground"}`}
          >
            Comparables locatifs
          </Button>
          <Button
            type="button"
            onClick={() => setKindFilter("prix")}
            className={`px-4 py-2 border-l border-border ${kindFilter === "prix" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-primary-foreground"}`}
          >
            Comparables prix de vente
          </Button>
        </div>
      </div>


      <div className="rounded-lg border border-border bg-primary p-4 text-sm">
        <p className="text-muted-foreground text-xs">
          Alimentation : état locatif courant, import manuel, import de brochures PDF/PPTX/DOCX,
          ou scan de votre boîte Outlook.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-2">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={data.includeComparables} onChange={(e) => update("includeComparables", e.target.checked)} className="w-4 h-4" />
          Inclure une slide « Comparables » dans la brochure générée
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button type="button" onClick={openAdd} className="text-xs px-3 py-1.5 rounded bg-primary hover:bg-primary text-primary-foreground font-semibold">
          + Ajouter {kindFilter === "location" ? "un comparable locatif" : "un comparable prix"}
        </Button>
        <Button type="button" onClick={importFromEtatLocatif} className="text-xs px-3 py-1.5 rounded bg-primary hover:bg-primary text-primary-foreground font-semibold">
          Importer depuis l'état locatif courant
        </Button>
        <label className={`text-xs px-3 py-1.5 rounded font-semibold cursor-pointer ${importBusy ? "bg-card text-muted-foreground" : "bg-purple-600 hover:bg-purple-500 text-primary-foreground"}`}>
          {importBusy ? "Analyse IA…" : "Importer PDF/PPTX/DOCX (extraction IA)"}
          <input
            type="file"
            accept=".pdf,.pptx,.docx"
            disabled={importBusy}
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              e.target.value = "";
              if (f) await onImportFile(f);
            }}
          />
        </label>
        <Button
          type="button"
          onClick={async () => {
            const XLSX = await import("xlsx");
            const loc = data.comparables.filter((c) => (c.kind || "location") === "location");
            const prix = data.comparables.filter((c) => c.kind === "prix");
            const num = (s?: string) => { const n = Number(String(s ?? "").replace(/[^\d.,-]/g, "").replace(/\s/g, "").replace(",", ".")); return isNaN(n) ? "" : n; };
            const locRows = loc.map((c) => ({
              "Type d'actif": c.typeActif || "",
              "Enseigne": c.enseigne,
              "Ville": c.ville,
              "Code postal": c.codePostal || "",
              "Adresse": c.adresse,
              "Surface (m²)": num(c.surface),
              "Surface pondérée (m²)": num(c.surfacePonderee),
              "Loyer / an HC-HT (€)": num(c.loyerAnnuel),
              "Loyer / m² HC-HT (€)": num(c.loyerM2),
              "Loyer / m² pondéré HC-HT (€)": num(c.loyerM2Pondere),
              "Date": c.dateSignature,
              "Dernière maj": c.derniereMaj || "",
              "Notes": c.notes,
            }));
            const prixRows = prix.map((c) => ({
              "Enseigne": c.enseigne,
              "Ville": c.ville,
              "Code postal": c.codePostal || "",
              "Adresse": c.adresse,
              "Surface totale (m²)": num(c.surface),
              "Loyer annuel HC-HT (€)": num(c.loyerAnnuel),
              "Loyer / m²/an (€)": num(c.loyerM2),
              "Prix de vente (€)": num(c.prixVente),
              "Prix / m² (€)": num(c.prixM2),
              "Rendement (%)": num(c.rendement),
              "Date": c.dateSignature,
              "Dernière maj": c.derniereMaj || "",
              "Notes": c.notes,
            }));
            const wb = XLSX.utils.book_new();
            const ws1 = XLSX.utils.json_to_sheet(locRows.length ? locRows : [{ "Type d'actif": "" }]);
            XLSX.utils.book_append_sheet(wb, ws1, "Locatifs");
            const ws2 = XLSX.utils.json_to_sheet(prixRows.length ? prixRows : [{ "Enseigne": "" }]);
            XLSX.utils.book_append_sheet(wb, ws2, "Prix de vente");
            const date = new Date().toISOString().slice(0, 10);
            XLSX.writeFile(wb, `comparables_wallsbroker_${date}.xlsx`);
          }}
          className="text-xs px-3 py-1.5 rounded bg-emerald-600 hover:bg-emerald-500 text-primary-foreground font-semibold"
        >
          ⬇ Exporter Excel
        </Button>
      </div>

      <div className="rounded-lg border border-border bg-primary p-4 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase text-primary">Remplissage automatique depuis Outlook</span>
          <Button
            type="button"
            onClick={onRunAutoIngest}
            disabled={autoIngest.busy}
            className="text-xs px-3 py-1.5 rounded bg-primary hover:bg-primary disabled:opacity-50 text-primary-foreground font-semibold"
          >
            {autoIngest.busy ? "Analyse…" : "Vérifier maintenant"}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          Les nouveaux emails reçus (corps + brochures PDF jointes) sont analysés automatiquement à l'ouverture puis toutes les 5 minutes ; les chiffres extraits arrivent directement dans les tableaux ci-dessous, sans doublon.
        </p>
        {autoIngest.status && <p className="text-xs text-primary">{autoIngest.status}</p>}
      </div>

      <div className="rounded-lg border border-border bg-card p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-primary">Scanner ma boîte Outlook (Microsoft 365)</span>
        </div>
        <p className="text-xs text-muted-foreground">
          Compte lié : <code className="text-primary">d.berbia@wallsbroker.com</code>. Analyse le corps des emails et les brochures jointes (PDF/PPTX/DOCX). Laissez le mot-clé vide pour voir les emails les plus récents.
        </p>
        <div className="flex gap-2">
          <input
            className={inputCls + " flex-1"}
            placeholder="Mot-clé (ex: brochure, retail park, investissement)"
            value={mailKeyword}
            onChange={(e) => setMailKeyword(e.target.value)}
          />
          <Button
            type="button"
            onClick={onScanOutlook}
            disabled={mailBusy === "list"}
            className="text-xs px-3 py-1.5 rounded bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-primary-foreground font-semibold whitespace-nowrap"
          >
            {mailBusy === "list" ? "Recherche…" : "Rechercher"}
          </Button>
        </div>
        {mailList.length > 0 && (
          <div className="max-h-72 overflow-y-auto rounded border border-border divide-y divide-slate-800">
            {mailList.map((m) => (
              <div key={m.id} className="flex items-center gap-2 p-2 text-xs hover:bg-card">
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{m.subject || "(sans objet)"}</div>
                  <div className="text-muted-foreground truncate">{m.from} • {m.date?.slice(0, 10)}</div>
                </div>
                <Button
                  type="button"
                  onClick={() => onExtractFromMail(m.id, m.subject)}
                  disabled={mailBusy === m.id}
                  className="text-xs px-2 py-1 rounded bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-primary-foreground whitespace-nowrap"
                >
                  {mailBusy === m.id ? "…" : "Extraire"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {/* Scan complet arrière-plan (inclut Archive) */}
        <div className="mt-3 rounded border border-border bg-primary p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs text-primary">
              <b>Scan complet</b> de la boîte (Inbox, Archive, sous-dossiers) — s'exécute en arrière-plan. Les fichiers sont lus en mémoire uniquement et ne sont jamais stockés.
            </div>
            {fullScan?.running ? (
              <Button
                type="button"
                onClick={stopFullMailboxScan}
                className="text-xs px-3 py-1.5 rounded bg-destructive hover:bg-destructive text-primary-foreground font-semibold whitespace-nowrap"
              >
                Arrêter
              </Button>
            ) : (
              <Button
                type="button"
                onClick={startFullMailboxScan}
                className="text-xs px-3 py-1.5 rounded bg-primary hover:bg-primary text-primary-foreground font-semibold whitespace-nowrap"
              >
                Scanner toute la boîte
              </Button>
            )}
          </div>
          {fullScan && (
            <div className="text-[11px] text-muted-foreground space-y-1">
              <div>
                {fullScan.running ? "En cours" : "Terminé"} — dossier {fullScan.foldersDone}/{fullScan.foldersTotal || "…"} ({fullScan.folder}) • {fullScan.mailsDone} email(s) analysé(s) • <b className="text-primary">{fullScan.added}</b> fiche(s) ajoutée(s) • <b className="text-primary">{fullScan.updated}</b> mise(s) à jour
              </div>
              {fullScan.lastError && <div className="text-destructive">Dernière erreur : {fullScan.lastError}</div>}
            </div>
          )}
          {mailError && <div className="text-[11px] text-destructive">{mailError}</div>}
        </div>
      </div>



      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/60 p-4" onClick={() => setShowAdd(false)}>
          <div className="bg-card border border-border rounded-lg p-6 max-w-2xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-primary">
              Ajouter un comparable {draft.kind === "prix" ? "prix de vente" : "locatif"}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={draft.kind === "prix" ? "Enseignes * (séparées par virgules)" : "Enseigne *"}>
                <input className={inputCls} value={draft.enseigne} onChange={(e) => setDraft({ ...draft, enseigne: e.target.value })} />
              </Field>
              <Field label="Date signature"><input type="date" className={inputCls} value={draft.dateSignature} onChange={(e) => setDraft({ ...draft, dateSignature: e.target.value })} /></Field>
              <Field label="Ville"><input className={inputCls} value={draft.ville} onChange={(e) => setDraft({ ...draft, ville: e.target.value })} /></Field>
              <Field label="Code Postal"><input className={inputCls} value={draft.codePostal || ""} onChange={(e) => setDraft({ ...draft, codePostal: e.target.value })} /></Field>
              <Field label="Adresse"><input className={inputCls} value={draft.adresse} onChange={(e) => setDraft({ ...draft, adresse: e.target.value })} /></Field>
              <Field label={draft.kind === "prix" ? "Surface totale (m²)" : "Surface (m²)"}>
                <input className={inputCls} value={draft.surface} onChange={(e) => setDraft({ ...draft, surface: e.target.value })} />
              </Field>
              {draft.kind === "location" && (
                <Field label="Surface pondérée (m²)">
                  <input className={inputCls} value={draft.surfacePonderee || ""} onChange={(e) => setDraft({ ...draft, surfacePonderee: e.target.value })} />
                </Field>
              )}
              <Field label={draft.kind === "prix" ? "Loyer annuel total HC-HT" : "Loyer annuel HC-HT"}>
                <input className={inputCls} value={draft.loyerAnnuel} onChange={(e) => setDraft({ ...draft, loyerAnnuel: e.target.value })} />
              </Field>
              {draft.kind === "location" ? (
                <>
                  <Field label="Loyer / m² (auto si vide)">
                    <input className={inputCls} value={draft.loyerM2} onChange={(e) => setDraft({ ...draft, loyerM2: e.target.value })} />
                  </Field>
                  <Field label="Loyer / m² pondéré (auto si vide)">
                    <input className={inputCls} value={draft.loyerM2Pondere || ""} onChange={(e) => setDraft({ ...draft, loyerM2Pondere: e.target.value })} />
                  </Field>
                </>
              ) : (
                <Field label="Prix de vente">
                  <input className={inputCls} value={draft.prixVente || ""} onChange={(e) => setDraft({ ...draft, prixVente: e.target.value })} />
                </Field>
              )}
            </div>
            {draft.kind === "prix" && (
              <p className="text-[11px] text-muted-foreground">Loyer/m², Prix/m² et Rendement seront calculés automatiquement à partir de la surface totale, du loyer total et du prix de vente.</p>
            )}
            <Field label="Notes"><textarea className={inputCls + " min-h-[60px]"} value={draft.notes} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" onClick={() => setShowAdd(false)} className={btnSecondary}>Annuler</Button>
              <Button type="button" onClick={submit} className="text-xs px-4 py-1.5 rounded bg-primary hover:bg-primary text-primary-foreground font-semibold">Ajouter</Button>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const q = search.trim().toLowerCase();
        const matchesSearch = (c: Comparable) => {
          if (!q) return true;
          const cp = (c.codePostal || "").trim();
          const ville = (c.ville || "").toLowerCase();
          // Département : 2 premiers chiffres du code postal (si la recherche est un nombre 1-3 chiffres)
          if (/^\d{1,3}$/.test(q)) {
            const dept = cp.slice(0, 2);
            if (q.length <= 2 && dept === q.padStart(2, "0")) return true;
            if (cp.startsWith(q)) return true;
          }
          if (cp.toLowerCase().includes(q)) return true;
          if (ville.includes(q)) return true;
          return false;
        };
        const sMin = num(surfMin), sMax = num(surfMax);
        const pMin = num(prixMin), pMax = num(prixMax);
        const matchesRange = (c: Comparable) => {
          if (kindFilter === "location") {
            const s = num(c.surface);
            if (isFinite(sMin) && (!isFinite(s) || s < sMin)) return false;
            if (isFinite(sMax) && (!isFinite(s) || s > sMax)) return false;
          } else {
            const p = num(c.prixVente);
            if (isFinite(pMin) && (!isFinite(p) || p < pMin)) return false;
            if (isFinite(pMax) && (!isFinite(p) || p > pMax)) return false;
          }
          return true;
        };
        const rows = data.comparables
          .filter(c => (c.kind || "location") === kindFilter)
          .filter(matchesSearch)
          .filter(matchesRange)
          .sort((a, b) => (b.dateSignature || "").localeCompare(a.dateSignature || ""));

        const SearchBar = (
          <div className="rounded-t-lg border border-b-0 border-border bg-card px-3 py-2 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Rechercher</span>
              <input
                className={inputCls + " flex-1"}
                placeholder="Département (2 chiffres), code postal ou ville…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {search && (
                <Button type="button" onClick={() => setSearch("")} className="text-xs px-2 py-1 rounded bg-muted hover:bg-card text-muted-foreground">Effacer</Button>
              )}
              <span className="text-[11px] text-muted-foreground whitespace-nowrap">{rows.length} résultat{rows.length > 1 ? "s" : ""}</span>
            </div>
            {kindFilter === "location" ? (
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Surface (m²)</span>
                <input className={inputCls + " w-28"} placeholder="min" value={surfMin} onChange={(e) => setSurfMin(e.target.value)} />
                <span className="text-muted-foreground">—</span>
                <input className={inputCls + " w-28"} placeholder="max" value={surfMax} onChange={(e) => setSurfMax(e.target.value)} />
                {(surfMin || surfMax) && (
                  <Button type="button" onClick={() => { setSurfMin(""); setSurfMax(""); }} className="text-xs px-2 py-1 rounded bg-muted hover:bg-card text-muted-foreground">Effacer</Button>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] uppercase tracking-widest text-muted-foreground">Prix de vente (€)</span>
                <input className={inputCls + " w-36"} placeholder="min" value={prixMin} onChange={(e) => setPrixMin(e.target.value)} />
                <span className="text-muted-foreground">—</span>
                <input className={inputCls + " w-36"} placeholder="max" value={prixMax} onChange={(e) => setPrixMax(e.target.value)} />
                {(prixMin || prixMax) && (
                  <Button type="button" onClick={() => { setPrixMin(""); setPrixMax(""); }} className="text-xs px-2 py-1 rounded bg-muted hover:bg-card text-muted-foreground">Effacer</Button>
                )}
              </div>
            )}
          </div>
        );

        if (kindFilter === "location") {
          return (
            <div>
              {SearchBar}
              <div className="rounded-b-lg border border-border overflow-auto max-h-[70vh]">
                <table className="w-full text-xs">
                  <thead className="bg-muted text-foreground sticky top-0 z-10">
                    <tr>
                      {["Date", <span>Type<br />d'actif</span>, "Enseigne", "Code Postal", "Ville", "Adresse", "Surface", <span>Surface<br />pondérée</span>, "Loyer/an", "€/m²", <span>Loyer<br />/m²p</span>, ""].map((h, i) => (
                        <th key={i} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.length === 0 ? (
                      <tr><td colSpan={12} className="text-center text-muted-foreground py-8">Aucun comparable locatif {q ? "ne correspond à la recherche" : "pour le moment"}.</td></tr>
                    ) : rows.map((c) => {
                      const surf = num(c.surface);
                      const surfP = num(c.surfacePonderee);
                      const loyer = num(c.loyerAnnuel);
                      const lm2 = num(c.loyerM2);
                      const loyerM2 = isFinite(lm2) ? lm2 : (isFinite(loyer) && surf > 0 ? loyer / surf : NaN);
                      const lm2p = num(c.loyerM2Pondere);
                      const loyerM2Pondere = isFinite(lm2p) ? lm2p : (isFinite(loyer) && surfP > 0 ? loyer / surfP : NaN);
                      return (
                        <tr key={c.id} className="border-t border-border hover:bg-card">
                          <td className="px-1 py-1 text-muted-foreground whitespace-nowrap">{tableInput(c, "dateSignature", "min-w-24 text-muted-foreground")}</td>
                          <td className="px-1 py-1">{tableInput(c, "typeActif", "min-w-32")}</td>
                          <td className="px-1 py-1 font-semibold">{tableInput(c, "enseigne", "min-w-32 font-semibold")}</td>
                          <td className="px-1 py-1 whitespace-nowrap">{tableInput(c, "codePostal", "min-w-16")}</td>
                          <td className="px-1 py-1">{tableInput(c, "ville", "min-w-28")}</td>
                          <td className="px-1 py-1">{tableInput(c, "adresse", "min-w-40")}</td>
                          <td className="px-1 py-1">{tableInput(c, "surface", "min-w-20 text-right")}</td>
                          <td className="px-1 py-1">{tableInput(c, "surfacePonderee", "min-w-20 text-right")}</td>
                          <td className="px-1 py-1">{tableInput(c, "loyerAnnuel", "min-w-24 text-right")}</td>
                          <td className="px-1 py-1">{tableInput(c, "loyerM2", "min-w-20 text-right text-primary font-semibold", fmt(loyerM2))}</td>
                          <td className="px-1 py-1">{tableInput(c, "loyerM2Pondere", "min-w-20 text-right text-primary font-semibold", fmt(loyerM2Pondere))}</td>
                          <td className="px-2 py-1.5"><Button onClick={() => removeComparable(c.id)} className="text-destructive hover:text-destructive">✕</Button></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        }
        return (
          <div>
            {SearchBar}
            <div className="rounded-b-lg border border-border overflow-auto max-h-[70vh]">
              <table className="w-full text-xs">
                <thead className="bg-muted text-foreground sticky top-0 z-10">
                  <tr>
                    {["Date", "Enseignes", "Code Postal", "Ville", "Adresse", "Surface totale", "Loyer annuel total", "Loyer/m²", "Prix de vente", "Prix/m²", "Rendement %", ""].map((h, i) => (
                      <th key={i} className="px-2 py-2 text-left font-medium whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 ? (
                    <tr><td colSpan={12} className="text-center text-muted-foreground py-8">Aucun comparable de prix {q ? "ne correspond à la recherche" : "pour le moment"}.</td></tr>
                  ) : rows.map((c) => {
                    const surf = num(c.surface);
                    const loyer = num(c.loyerAnnuel);
                    const prix = num(c.prixVente);
                    const loyerM2 = isFinite(loyer) && surf > 0 ? loyer / surf : NaN;
                    const prixM2 = isFinite(prix) && surf > 0 ? prix / surf : NaN;
                    const rendement = isFinite(loyer) && isFinite(prix) && prix > 0 ? (loyer / prix * 100) : NaN;
                    return (
                      <tr key={c.id} className="border-t border-border hover:bg-card">
                        <td className="px-1 py-1 text-muted-foreground whitespace-nowrap">{tableInput(c, "dateSignature", "min-w-24 text-muted-foreground")}</td>
                        <td className="px-1 py-1 font-semibold">{tableInput(c, "enseigne", "min-w-40 font-semibold")}</td>
                        <td className="px-1 py-1 whitespace-nowrap">{tableInput(c, "codePostal", "min-w-16")}</td>
                        <td className="px-1 py-1">{tableInput(c, "ville", "min-w-28")}</td>
                        <td className="px-1 py-1">{tableInput(c, "adresse", "min-w-40")}</td>
                        <td className="px-1 py-1">{tableInput(c, "surface", "min-w-20 text-right")}</td>
                        <td className="px-1 py-1">{tableInput(c, "loyerAnnuel", "min-w-24 text-right")}</td>
                        <td className="px-1 py-1">{tableInput(c, "loyerM2", "min-w-20 text-right text-primary font-semibold", fmt(loyerM2))}</td>
                        <td className="px-1 py-1">{tableInput(c, "prixVente", "min-w-24 text-right")}</td>
                        <td className="px-1 py-1">{tableInput(c, "prixM2", "min-w-20 text-right text-primary font-semibold", fmt(prixM2))}</td>
                        <td className="px-1 py-1">{tableInput(c, "rendement", "min-w-20 text-right text-primary font-semibold", isFinite(rendement) ? rendement.toFixed(2) + " %" : "—")}</td>
                        <td className="px-2 py-1.5"><Button onClick={() => removeComparable(c.id)} className="text-destructive hover:text-destructive">✕</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        );
      })()}
    </>
  );
}

function SignOutButton() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const handleSignOut = async () => {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    router.navigate({ to: "/auth", replace: true });
  };
  return (
    <Button
      type="button"
      onClick={handleSignOut}
      title="Se déconnecter"
      aria-label="Se déconnecter"
      className="h-9 w-9 inline-flex items-center justify-center rounded-md border bg-muted text-muted-foreground border-border hover:text-primary-foreground hover:bg-card"
    >
      <Power size={18} />
    </Button>
  );
}


/** Affiche les sections une par une : Suivant / Retour, sans faire défiler toute la page. */
function Stepper({ children }: { children: React.ReactNode }) {
  const steps = (Array.isArray(children) ? children : [children]).flat().filter(
    (c): c is React.ReactElement<{ title?: string }> => Boolean(c) && typeof c === "object" && "props" in (c as object),
  );
  const [i, setI] = useState(0);
  const cur = Math.min(i, steps.length - 1);
  const go = (n: number) => { setI(n); window.scrollTo({ top: 0, behavior: "smooth" }); };
  const label = (c: React.ReactElement<{ title?: string }>, n: number) =>
    String(c.props.title || `Étape ${n + 1}`).replace(/^\d+\.\s*/, "").split(" (")[0];
  return (
    <div className="space-y-4">
      <div className="flex gap-1 overflow-x-auto pb-1">
        {steps.map((c, n) => (
          <Button
            key={n}
            type="button"
            onClick={() => go(n)}
            className={`shrink-0 rounded-md border px-3 py-2 text-xs font-semibold ${n === cur ? "bg-primary border-border text-primary-foreground" : n < cur ? "bg-muted border-border text-primary" : "bg-muted border-border text-muted-foreground"}`}
          >
            {n + 1}. {label(c, n)}
          </Button>
        ))}
      </div>
      <div key={cur}>{steps[cur]}</div>
      <div className="flex items-center justify-between gap-3">
        <Button type="button" disabled={cur === 0} onClick={() => go(cur - 1)} className="min-h-11 rounded-md border border-border bg-muted px-5 text-sm font-semibold text-primary-foreground disabled:opacity-30">
          ← Retour
        </Button>
        <span className="text-xs text-muted-foreground">Étape {cur + 1} / {steps.length}</span>
        <Button type="button" disabled={cur >= steps.length - 1} onClick={() => go(cur + 1)} className="min-h-11 rounded-md bg-primary px-5 text-sm font-semibold text-primary-foreground disabled:opacity-30">
          Suivant →
        </Button>
      </div>
    </div>
  );
}
