// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";
const GOOGLE_TIMEOUT_MS = 5000;

type GeoPoint = { lat: number; lng: number; formatted: string };
type NearbyPlace = { name: string; type: string; lat: number; lng: number; rating: number | null };

function authHeaders() {
  const l = process.env.LOVABLE_API_KEY;
  const g = process.env.GOOGLE_MAPS_API_KEY;
  if (!l || !g) throw new Error("Google Maps connector non configuré");
  return {
    "Authorization": `Bearer ${l}`,
    "X-Connection-Api-Key": g,
  } as Record<string, string>;
}

async function fetchGoogleGateway(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), GOOGLE_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeout);
  }
}

async function geocode(address: string): Promise<GeoPoint> {
  const { geocodeFr } = await import("./osm-tiles.server");
  const [lng, lat] = await geocodeFr(address);
  return { lat, lng, formatted: address };
}

async function staticMapDataUrl(params: URLSearchParams): Promise<string> {
  const center = parseLatLng(params.get("center"));
  if (!center) throw new Error("Centre de carte invalide");
  const zoom = Math.max(3, Math.min(18, Number(params.get("zoom") || 15)));
  const [rawW = "640", rawH = "500"] = (params.get("size") || "640x500").split("x");
  const scale = Math.max(1, Math.min(2, Number(params.get("scale") || 2)));
  const width = Math.max(640, Math.min(1280, Number(rawW) * scale || 1280));
  const height = Math.max(360, Math.min(1000, Number(rawH) * scale || 1000));
  const maptype = (params.get("maptype") || "roadmap").toLowerCase();
  const { lonLatToPixel, buildOsmSvg, buildSatelliteSvg } = await import("./osm-tiles.server");
  const [cx, cy] = lonLatToPixel(center.lng, center.lat, zoom);
  const markers = params.getAll("markers")
    .map(parseMarker)
    .filter((m): m is Marker => Boolean(m));
  const markerSvg = markers.map((m, index) => {
    const [px, py] = lonLatToPixel(m.lng, m.lat, zoom);
    const x = px - cx + width / 2;
    const y = py - cy + height / 2;
    if (x < -80 || x > width + 80 || y < -80 || y > height + 80) return "";
    if (m.primary) {
      return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><path d="M0,-52 C28,-52 52,-28 52,0 C52,38 0,78 0,78 C0,78 -52,38 -52,0 C-52,-28 -28,-52 0,-52 Z" fill="#f97316" stroke="#ffffff" stroke-width="10"/><circle r="16" fill="#ffffff"/></g>`;
    }
    const label = index > 0 && index < 10 ? `<text y="6" text-anchor="middle" fill="#0f172a" font-family="Arial,sans-serif" font-size="18" font-weight="700">${index}</text>` : "";
    return `<g transform="translate(${x.toFixed(1)} ${y.toFixed(1)})"><circle r="18" fill="#ffffff" stroke="#0891b2" stroke-width="7"/>${label}</g>`;
  }).join("");
  const overlay = `<g filter="url(#shadow)">${markerSvg}</g>`;
  const defs = `<defs><filter id="shadow" x="-30%" y="-30%" width="160%" height="160%"><feDropShadow dx="0" dy="4" stdDeviation="4" flood-color="#0f172a" flood-opacity="0.35"/></filter></defs>`;
  const fullOverlay = defs + overlay;
  if (maptype === "satellite" || maptype === "hybrid") {
    return await buildSatelliteSvg(center.lng, center.lat, zoom, width, height, fullOverlay);
  }
  return await buildOsmSvg(center.lng, center.lat, zoom, width, height, fullOverlay);
}

type Marker = { lat: number; lng: number; primary: boolean };

function parseLatLng(value: string | null): { lat: number; lng: number } | null {
  const match = value?.trim().match(/^(-?\d+(?:\.\d+)?),\s*(-?\d+(?:\.\d+)?)$/);
  if (!match) return null;
  const lat = Number(match[1]);
  const lng = Number(match[2]);
  return Number.isFinite(lat) && Number.isFinite(lng) ? { lat, lng } : null;
}

function parseMarker(value: string): Marker | null {
  const parts = value.split("|");
  const point = parseLatLng(parts[parts.length - 1]);
  if (!point) return null;
  const color = parts.find((p) => p.startsWith("color:"))?.slice(6).toLowerCase();
  return { ...point, primary: color === "orange" };
}


function osmTypeLabel(tags: Record<string, string | undefined>): string {
  const raw = tags.shop || tags.amenity || tags.cuisine || tags.brand || "commerce";
  return raw.replace(/_/g, " ");
}

async function fetchNearbyFromOsm(center: { lat: number; lng: number }, radius: number): Promise<NearbyPlace[]> {
  const query = `[out:json][timeout:12];(
    node(around:${radius},${center.lat},${center.lng})[shop][name];
    way(around:${radius},${center.lat},${center.lng})[shop][name];
    relation(around:${radius},${center.lat},${center.lng})[shop][name];
    node(around:${radius},${center.lat},${center.lng})[amenity~"^(restaurant|cafe|fast_food|pharmacy|bank|fuel)$"][name];
    way(around:${radius},${center.lat},${center.lng})[amenity~"^(restaurant|cafe|fast_food|pharmacy|bank|fuel)$"][name];
    relation(around:${radius},${center.lat},${center.lng})[amenity~"^(restaurant|cafe|fast_food|pharmacy|bank|fuel)$"][name];
  );out center 120;`;
  const endpoints = [
    "https://overpass-api.de/api/interpreter",
    "https://overpass.kumi.systems/api/interpreter",
    "https://overpass.openstreetmap.fr/api/interpreter",
  ];
  let r: Response | null = null;
  let lastStatus = 0;
  for (const url of endpoints) {
    r = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
        "Accept": "application/json",
        "User-Agent": "WallsbrokerBrochure/1.0 (contact: brochures@wallsbroker.fr)",
      },
      body: new URLSearchParams({ data: query }),
    });
    if (r.ok) break;
    lastStatus = r.status;
  }
  if (!r || !r.ok) throw new Error(`Overpass ${lastStatus || r?.status || "unreachable"}`);
  const j = (await r.json()) as {
    elements?: Array<{
      lat?: number;
      lon?: number;
      center?: { lat?: number; lon?: number };
      tags?: Record<string, string | undefined>;
    }>;
  };
  const seen = new Set<string>();
  return (j.elements || [])
    .map((el) => {
      const tags = el.tags || {};
      const name = tags.name || tags.brand || "";
      const lat = el.lat ?? el.center?.lat ?? 0;
      const lng = el.lon ?? el.center?.lon ?? 0;
      return { name, type: osmTypeLabel(tags), lat, lng, rating: null as number | null };
    })
    .filter((p) => {
      const key = p.name.trim().toLowerCase();
      if (!key || seen.has(key) || !p.lat || !p.lng) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 120);
}

type MapInput = {
  address: string;
  kind: "localisation" | "environnement" | "accessibilite";
  lat?: number;
  lng?: number;
  zoom?: number;
  mapType?: "roadmap" | "satellite" | "hybrid" | "terrain";
};

const STATIC_MAPS_UNAVAILABLE_MESSAGE =
  "Google Static Maps indisponible : carte de secours générée automatiquement.";

function isLikelyGoogleStaticMap(dataUrl: string | null): dataUrl is string {
  return Boolean(dataUrl?.startsWith("data:image/png;base64,"));
}

async function googleStaticMap(params: URLSearchParams): Promise<string | null> {
  // CRM : cartes OpenStreetMap uniquement (règle permanente), jamais Google.
  if (params) return null;
  try {
    const url = `${GATEWAY}/maps/api/staticmap?${params.toString()}`;
    const r = await fetchGoogleGateway(url, { headers: authHeaders() });
    if (!r.ok) {
      console.warn(`Google Static Maps ${r.status}: ${(await r.text()).slice(0, 200)}`);
      return null;
    }
    const buf = new Uint8Array(await r.arrayBuffer());
    let bin = "";
    for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
    return `data:image/png;base64,${btoa(bin)}`;
  } catch (e) {
    console.warn("Google Static Maps failed", e);
    return null;
  }
}

export const fetchGoogleMap = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: MapInput) => data)
  .handler(async ({ data }) => {
    let centerLat: number;
    let centerLng: number;
    if (typeof data.lat === "number" && typeof data.lng === "number") {
      centerLat = data.lat;
      centerLng = data.lng;
    } else {
      const geo = await geocode(data.address);
      centerLat = geo.lat;
      centerLng = geo.lng;
    }
    const center = `${centerLat},${centerLng}`;
    let zoom = data.zoom;
    let mapType = data.mapType;
    if (!zoom) zoom = data.kind === "environnement" ? 15 : data.kind === "accessibilite" ? 18 : 10;
    if (!mapType) mapType = data.kind === "accessibilite" ? "satellite" : "roadmap";

    const mapSize = data.kind === "environnement" ? "640x449" : "640x500";
    const gp = new URLSearchParams({
      center,
      zoom: String(zoom),
      size: mapSize,
      scale: "2",
      maptype: mapType,
      language: "fr",
      region: "fr",
    });
    // Étiquettes / POI / transports :
    // - environnement : on FORCE l'affichage des enseignes et des arrêts de bus / métro / gare
    // - localisation & accessibilité : on MASQUE POI et transports pour garder une carte propre
    if (data.kind === "environnement") {
      gp.append("style", "feature:poi|visibility:on");
      gp.append("style", "feature:poi|element:labels|visibility:on");
      gp.append("style", "feature:poi.business|element:labels|visibility:on");
      gp.append("style", "feature:poi.business|element:labels.icon|visibility:on");
      gp.append("style", "feature:poi.business|element:labels.text|visibility:on");
      gp.append("style", "feature:transit|visibility:on");
      gp.append("style", "feature:transit.station|visibility:on");
      gp.append("style", "feature:transit.station|element:labels|visibility:on");
      gp.append("style", "feature:transit.station|element:labels.text|visibility:on");
      gp.append("style", "feature:transit.line|visibility:on");
    } else {
      gp.append("style", "feature:poi|visibility:off");
      gp.append("style", "feature:transit|visibility:off");
    }
    // Pas de marqueur ici : l'UI (InteractiveGoogleMap) superpose son propre pin orange.
    const googleUrl = await googleStaticMap(gp);
    if (isLikelyGoogleStaticMap(googleUrl)) return { dataUrl: googleUrl, center: { lat: centerLat, lng: centerLng } };

    const fallbackUrl = await staticMapDataUrl(gp);
    if (fallbackUrl) {
      return {
        dataUrl: fallbackUrl,
        center: { lat: centerLat, lng: centerLng },
        error: STATIC_MAPS_UNAVAILABLE_MESSAGE,
      };
    }

    return {
      dataUrl: null,
      center: { lat: centerLat, lng: centerLng },
      error: STATIC_MAPS_UNAVAILABLE_MESSAGE,
    };
  });


// Recherche des enseignes voisines via Places API (New)
type NearbyInput = { address: string; radius?: number };

export const fetchNearbyEnseignes = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: NearbyInput) => data)
  .handler(async ({ data }) => {
    const geo = await geocode(data.address);
    const radius = Math.min(3000, Math.max(100, data.radius || 800));
    try {
      if (radius > 0) throw new Error("OSM uniquement");
      const r = await fetchGoogleGateway(`${GATEWAY}/places/v1/places:searchNearby`, {
        method: "POST",
        headers: {
          ...authHeaders(),
          "Content-Type": "application/json",
          "X-Goog-FieldMask": "places.displayName,places.location,places.primaryType,places.types,places.businessStatus",
        },
        body: JSON.stringify({
          includedTypes: [
            "supermarket", "convenience_store", "shopping_mall", "clothing_store",
            "restaurant", "cafe", "bakery", "pharmacy", "fast_food_restaurant",
            "electronics_store", "furniture_store", "hardware_store", "sporting_goods_store",
            "book_store", "beauty_salon", "hair_care", "bank", "atm", "gas_station",
            "car_dealer", "car_repair", "department_store", "drugstore", "florist",
            "grocery_store", "home_goods_store", "jewelry_store", "liquor_store",
            "meal_takeaway", "pet_store", "shoe_store", "store",
          ],
          maxResultCount: 20,
          locationRestriction: {
            circle: { center: { latitude: geo.lat, longitude: geo.lng }, radius },
          },
          languageCode: "fr",
          regionCode: "FR",
        }),
      });
      if (r.ok) {
        const j = (await r.json()) as {
          places?: {
            displayName?: { text?: string };
            location?: { latitude?: number; longitude?: number };
            primaryType?: string;
            businessStatus?: string;
          }[];
        };
        const places = (j.places || [])
          .filter((p) => p.businessStatus !== "CLOSED_PERMANENTLY" && p.displayName?.text)
          .map((p) => ({
            name: p.displayName!.text || "",
            type: p.primaryType || "",
            lat: p.location?.latitude || 0,
            lng: p.location?.longitude || 0,
            rating: null as number | null,
          }));
        if (places.length > 0) {
          const osmPlaces = await fetchNearbyFromOsm({ lat: geo.lat, lng: geo.lng }, radius).catch(() => [] as NearbyPlace[]);
          const seen = new Set<string>();
          const merged = [...places, ...osmPlaces]
            .filter((p) => {
              const key = p.name.trim().toLowerCase();
              if (!key || seen.has(key)) return false;
              seen.add(key);
              return true;
            })
            .slice(0, 80);
          return { center: { lat: geo.lat, lng: geo.lng }, places: merged };
        }
        console.warn("Places SearchNearby returned 0 results, falling back to OSM");
      } else {
        console.warn(`Places SearchNearby ${r.status}: ${(await r.text()).slice(0, 300)}`);
      }
    } catch (e) {
      console.warn("Places fallback", e);
    }
    const places = await fetchNearbyFromOsm({ lat: geo.lat, lng: geo.lng }, radius).catch((e) => {
      console.warn("OSM nearby failed", e);
      return [] as NearbyPlace[];
    });
    return { center: { lat: geo.lat, lng: geo.lng }, places };
  });

// Carte satellite avec marqueurs logos pour les enseignes voisines
type SatelliteWithLogosInput = {
  address: string;
  logos: { lat: number; lng: number; iconUrl?: string }[];
};

export const fetchSatelliteWithLogos = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: SatelliteWithLogosInput) => data)
  .handler(async ({ data }) => {
    const geo = await geocode(data.address);
    const center = `${geo.lat},${geo.lng}`;
    const params = new URLSearchParams({
      center, zoom: "17", size: "640x500", scale: "2",
      maptype: "satellite", language: "fr", region: "fr",
    });
    params.append("markers", `color:orange|size:mid|${center}`);
    for (const l of data.logos.slice(0, 10)) {
      if (l.iconUrl && /^https:\/\//.test(l.iconUrl)) {
        params.append("markers", `icon:${l.iconUrl}|${l.lat},${l.lng}`);
      } else {
        params.append("markers", `color:blue|size:small|${l.lat},${l.lng}`);
      }
    }
    const dataUrl = await staticMapDataUrl(params);
    return { dataUrl, center: { lat: geo.lat, lng: geo.lng } };
  });
