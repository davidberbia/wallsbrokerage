// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
// Utilitaires côté serveur pour composer une carte à partir de tuiles OSM.
// Aucune clé requise. Fonctionne dans l'environnement Worker.

const UA = "WallsbrokerBrochures/1.0 (contact@wallsbroker.com)";
const TILE_SIZE = 256;
const TILE_TIMEOUT_MS = 2500;
const GEOCODE_TIMEOUT_MS = 4000;

// Serveurs OSM (fallback en cas d'échec).
const TILE_HOSTS = [
  // Tuiles OSM sans clé. Carto est volontairement exclu : sans clé valide,
  // ses tuiles affichent un filigrane "API KEY REQUIRED" dans les exports.
  "https://a.tile.openstreetmap.fr/osmfr",
  "https://b.tile.openstreetmap.fr/osmfr",
  "https://tile.openstreetmap.org",
];

// Serveurs de tuiles satellite (ArcGIS World Imagery – accès public sans clé).
const SATELLITE_HOSTS = [
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile",
  "https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile",
];


async function fetchWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TILE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchGeocodeWithTimeout(url: string, init: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GEOCODE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

function fallbackTile(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="256" height="256" fill="#eef2f1"/><path d="M0 64H256M0 128H256M0 192H256M64 0V256M128 0V256M192 0V256" stroke="#d7dfdc" stroke-width="2"/><path d="M20 220C75 180 120 210 160 150C184 114 214 92 252 80" fill="none" stroke="#b7d7c3" stroke-width="18" stroke-linecap="round"/><path d="M10 34C70 50 112 22 160 48C192 65 215 65 246 56" fill="none" stroke="#ffffff" stroke-width="8" stroke-linecap="round"/></svg>`;
  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`;
}

export function lonLatToPixel(lon: number, lat: number, zoom: number): [number, number] {
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n * TILE_SIZE;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * TILE_SIZE;
  return [x, y];
}

async function fetchTileFrom(hosts: string[], z: number, x: number, y: number, ext: "png" | "jpg" = "png"): Promise<string> {
  const n = 2 ** z;
  const xx = ((x % n) + n) % n;
  const yy = Math.max(0, Math.min(n - 1, y));
  let lastErr: unknown = null;
  for (const host of hosts) {
    try {
      // ArcGIS uses {z}/{y}/{x} order
      const url = host.includes("arcgis")
        ? `${host}/${z}/${yy}/${xx}`
        : `${host}/${z}/${xx}/${yy}.${ext}`;
      const r = await fetchWithTimeout(url, {
        headers: { "User-Agent": UA, Referer: "https://wallsbroker.com" },
      });
      if (!r.ok) { lastErr = new Error(`${host} ${r.status}`); continue; }
      const buf = new Uint8Array(await r.arrayBuffer());
      let binary = "";
      for (let i = 0; i < buf.length; i++) binary += String.fromCharCode(buf[i]);
      const mime = host.includes("arcgis") ? "image/jpeg" : "image/png";
      return `data:${mime};base64,${btoa(binary)}`;
    } catch (e) { lastErr = e; }
  }
  console.warn(`Tile fallback z=${z} x=${xx} y=${yy}: ${String(lastErr)}`);
  return fallbackTile();
}

async function fetchTile(z: number, x: number, y: number): Promise<string> {
  return fetchTileFrom(TILE_HOSTS, z, x, y);
}

async function fetchSatelliteTile(z: number, x: number, y: number): Promise<string> {
  return fetchTileFrom(SATELLITE_HOSTS, z, x, y, "jpg");
}


/** Construit une SVG data-URL centrée sur (lon,lat) au zoom donné, taille width×height. */
export async function buildOsmSvg(
  lon: number,
  lat: number,
  zoom: number,
  width = 1024,
  height = 800,
  overlaySvg = "",
): Promise<string> {
  const [cx, cy] = lonLatToPixel(lon, lat, zoom);
  const originX = cx - width / 2;
  const originY = cy - height / 2;
  const tileX0 = Math.floor(originX / TILE_SIZE);
  const tileY0 = Math.floor(originY / TILE_SIZE);
  const tileX1 = Math.floor((originX + width) / TILE_SIZE);
  const tileY1 = Math.floor((originY + height) / TILE_SIZE);
  const tasks: Promise<{ x: number; y: number; href: string }>[] = [];
  for (let tx = tileX0; tx <= tileX1; tx++) {
    for (let ty = tileY0; ty <= tileY1; ty++) {
      tasks.push(
        fetchTile(zoom, tx, ty).then((href) => ({
          x: tx * TILE_SIZE - originX,
          y: ty * TILE_SIZE - originY,
          href,
        })),
      );
    }
  }
  const tiles = await Promise.all(tasks);
  const images = tiles
    .map((t) => `<image href="${t.href}" x="${t.x}" y="${t.y}" width="${TILE_SIZE}" height="${TILE_SIZE}" />`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${images}${overlaySvg}</svg>`;
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}

/** Comme buildOsmSvg mais avec des tuiles satellite (ArcGIS World Imagery, sans clé). */
export async function buildSatelliteSvg(
  lon: number,
  lat: number,
  zoom: number,
  width = 1024,
  height = 800,
  overlaySvg = "",
): Promise<string> {
  const [cx, cy] = lonLatToPixel(lon, lat, zoom);
  const originX = cx - width / 2;
  const originY = cy - height / 2;
  const tileX0 = Math.floor(originX / TILE_SIZE);
  const tileY0 = Math.floor(originY / TILE_SIZE);
  const tileX1 = Math.floor((originX + width) / TILE_SIZE);
  const tileY1 = Math.floor((originY + height) / TILE_SIZE);
  const tasks: Promise<{ x: number; y: number; href: string }>[] = [];
  for (let tx = tileX0; tx <= tileX1; tx++) {
    for (let ty = tileY0; ty <= tileY1; ty++) {
      tasks.push(
        fetchSatelliteTile(zoom, tx, ty).then((href) => ({
          x: tx * TILE_SIZE - originX,
          y: ty * TILE_SIZE - originY,
          href,
        })),
      );
    }
  }
  const tiles = await Promise.all(tasks);
  const images = tiles
    .map((t) => `<image href="${t.href}" x="${t.x}" y="${t.y}" width="${TILE_SIZE}" height="${TILE_SIZE}" />`)
    .join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">${images}${overlaySvg}</svg>`;
  const b64 = btoa(unescape(encodeURIComponent(svg)));
  return `data:image/svg+xml;base64,${b64}`;
}

export async function geocodeFr(address: string): Promise<[number, number]> {
  try {
    const apiAdresse = `https://api-adresse.data.gouv.fr/search/?limit=1&q=${encodeURIComponent(address)}`;
    const r = await fetchGeocodeWithTimeout(apiAdresse, { headers: { "User-Agent": UA, Accept: "application/json" } });
    if (r.ok) {
      const j = (await r.json()) as { features?: { geometry?: { coordinates?: [number, number] } }[] };
      const coord = j.features?.[0]?.geometry?.coordinates;
      if (coord) return coord;
    }
  } catch {}
  const url = `https://nominatim.openstreetmap.org/search?format=json&countrycodes=fr&limit=1&q=${encodeURIComponent(address)}`;
  const r = await fetchGeocodeWithTimeout(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!r.ok) throw new Error(`Nominatim ${r.status}: ${(await r.text()).slice(0, 200)}`);
  const j = (await r.json()) as { lat: string; lon: string }[];
  if (!j?.[0]) throw new Error("Adresse introuvable (Nominatim)");
  return [parseFloat(j[0].lon), parseFloat(j[0].lat)]; // [lon, lat]
}
