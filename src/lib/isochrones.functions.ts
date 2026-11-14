// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";

type IsoInput = {
  address: string;
  mode: "voiture" | "pieton";
  minutes1: number;
  minutes2: number;
};

type Ring = [number, number][]; // [lon, lat]

const ORS = "https://api.openrouteservice.org";
const UA = "WallsbrokerBrochures/1.0 (contact@wallsbroker.com)";

async function isochrones(
  coord: [number, number],
  profile: string,
  rangesSec: number[],
  apiKey: string,
): Promise<Ring[]> {
  const r = await fetch(`${ORS}/v2/isochrones/${profile}`, {
    method: "POST",
    headers: {
      Authorization: apiKey,
      "Content-Type": "application/json",
      Accept: "application/geo+json",
    },
    body: JSON.stringify({ locations: [coord], range: rangesSec, range_type: "time" }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Isochrones failed: ${r.status} ${t.slice(0, 200)}`);
  }
  const j = (await r.json()) as {
    features: { properties: { value: number }; geometry: { coordinates: number[][][] } }[];
  };
  const feats = [...j.features].sort((a, b) => a.properties.value - b.properties.value);
  return feats.map((f) => f.geometry.coordinates[0] as Ring);
}

// Compute OSM slippy tile x/y from lon/lat/zoom.
function lonLatToPixel(lon: number, lat: number, zoom: number): [number, number] {
  const n = 2 ** zoom;
  const x = ((lon + 180) / 360) * n * 256;
  const latRad = (lat * Math.PI) / 180;
  const y = ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) * n * 256;
  return [x, y];
}

function computeZoom(bbox: [number, number, number, number], width: number, height: number): number {
  // bbox = [minLon, minLat, maxLon, maxLat]
  for (let z = 15; z >= 3; z--) {
    const [x1, y1] = lonLatToPixel(bbox[0], bbox[3], z);
    const [x2, y2] = lonLatToPixel(bbox[2], bbox[1], z);
    if (Math.abs(x2 - x1) < width * 0.9 && Math.abs(y2 - y1) < height * 0.9) return z;
  }
  return 3;
}




function ringToSvgPath(
  ring: Ring,
  centerLon: number,
  centerLat: number,
  zoom: number,
  width: number,
  height: number,
): string {
  const [cx, cy] = lonLatToPixel(centerLon, centerLat, zoom);
  const pts = ring.map(([lon, lat]) => {
    const [px, py] = lonLatToPixel(lon, lat, zoom);
    return [px - cx + width / 2, py - cy + height / 2];
  });
  return "M" + pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(" L") + " Z";
}

async function buildSvgWithBase(
  center: [number, number],
  rings: Ring[],
): Promise<string> {
  const width = 1024;
  const height = 800;
  // Compute bbox of all rings.
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const ring of rings) for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  }
  const zoom = computeZoom([minLon, minLat, maxLon, maxLat], width, height);
  const { buildOsmSvg } = await import("./osm-tiles.server");
  const ordered = [...rings].sort((a, b) => b.length - a.length);
  const colors = ["#E07B3E", "#2E8FA8"];
  const paths = ordered
    .map((ring, i) => {
      const d = ringToSvgPath(ring, center[0], center[1], zoom, width, height);
      const c = colors[i] || "#888";
      return `<path d="${d}" fill="${c}" fill-opacity="0.28" stroke="${c}" stroke-width="3" />`;
    })
    .join("");
  const overlay = `${paths}<circle cx="${width / 2}" cy="${height / 2}" r="8" fill="#1B2A3E" stroke="#fff" stroke-width="2" />`;
  return await buildOsmSvg(center[0], center[1], zoom, width, height, overlay);
}


// ─── Population dans les isochrones (communes INSEE via geo.api.gouv.fr) ───

type Commune = { nom: string; population?: number; centre?: { coordinates: [number, number] } };

function pointInRing(lon: number, lat: number, ring: Ring): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    const intersect = yi > lat !== yj > lat && lon < ((xj - xi) * (lat - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

async function communesForRings(rings: Ring[]): Promise<Commune[]> {
  let minLon = Infinity, minLat = Infinity, maxLon = -Infinity, maxLat = -Infinity;
  for (const ring of rings) for (const [lon, lat] of ring) {
    if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
    if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
  }
  if (!isFinite(minLon)) return [];
  const deps = new Set<string>();
  const steps = 4;
  const probes: Promise<void>[] = [];
  for (let i = 0; i <= steps; i++) {
    for (let j = 0; j <= steps; j++) {
      const lon = minLon + ((maxLon - minLon) * i) / steps;
      const lat = minLat + ((maxLat - minLat) * j) / steps;
      probes.push(
        fetch(`https://geo.api.gouv.fr/communes?lat=${lat}&lon=${lon}&fields=codeDepartement`, {
          headers: { "User-Agent": UA },
        })
          .then((r) => (r.ok ? r.json() : []))
          .then((arr: { codeDepartement?: string }[]) => {
            for (const c of arr || []) if (c.codeDepartement) deps.add(c.codeDepartement);
          })
          .catch(() => {}),
      );
    }
  }
  await Promise.all(probes);
  const lists = await Promise.all(
    [...deps].map((d) =>
      fetch(`https://geo.api.gouv.fr/departements/${d}/communes?fields=nom,population,centre`, {
        headers: { "User-Agent": UA },
      })
        .then((r) => (r.ok ? r.json() : []))
        .catch(() => [] as Commune[]),
    ),
  );
  return lists.flat() as Commune[];
}

async function populationsForRings(rings: Ring[]): Promise<number[]> {
  const communes = await communesForRings(rings);
  if (!communes.length) return rings.map(() => 0);
  return rings.map((ring) => {
    let total = 0;
    for (const c of communes) {
      const pt = c.centre?.coordinates;
      if (!pt || !c.population) continue;
      if (pointInRing(pt[0], pt[1], ring)) total += c.population;
    }
    return total;
  });
}

export const fetchIsochrones = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: IsoInput) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.OPENROUTESERVICE_API_KEY;
    if (!apiKey) throw new Error("OPENROUTESERVICE_API_KEY manquant");
    const profile = data.mode === "pieton" ? "foot-walking" : "driving-car";
    const { geocodeFr } = await import("./osm-tiles.server");
    const coord = await geocodeFr(data.address);
    const m1 = Math.max(1, Math.min(60, data.minutes1));
    const m2 = Math.max(1, Math.min(60, data.minutes2));
    const rings = await isochrones(coord, profile, [m1 * 60, m2 * 60], apiKey);
    const dataUrl = await buildSvgWithBase(coord, rings);
    let populations: number[] = [];
    try {
      populations = await populationsForRings(rings);
    } catch {
      populations = [];
    }
    return {
      dataUrl,
      center: coord,
      population1: populations[0] || 0,
      population2: populations[1] || 0,
    };
  });
