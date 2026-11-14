// Style Google Maps partagé UI + Static Maps.
// Style Google par défaut = laisser vide (rendu roadmap traditionnel comme la capture).
// On expose ici les tailles standard des cartes exportées.

export const MAP_EXPORT_SIZE = { width: 640, height: 500, scale: 2 } as const;

export type MapKind = "localisation" | "environnement" | "accessibilite";

export const DEFAULT_MAP_TYPE: Record<MapKind, "roadmap" | "hybrid" | "satellite"> = {
  localisation: "roadmap",
  environnement: "roadmap",
  accessibilite: "satellite",
};

export const DEFAULT_ZOOM: Record<MapKind, number> = {
  localisation: 10,
  environnement: 15,
  accessibilite: 18,
};

// Zooms préférés par l'utilisateur, persistés côté navigateur. Dès qu'il
// ajuste le zoom d'une carte, on mémorise la valeur pour que les prochaines
// générations (nouvelle adresse, nouveau brouillon) partent de ce réglage.
const USER_ZOOM_KEY = "wb_user_default_zoom";

function readUserZooms(): Partial<Record<MapKind, number>> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(USER_ZOOM_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function getPreferredZoom(kind: MapKind): number {
  const stored = readUserZooms()[kind];
  return typeof stored === "number" && Number.isFinite(stored) ? stored : DEFAULT_ZOOM[kind];
}

export function rememberPreferredZoom(kind: MapKind, zoom: number): void {
  if (typeof window === "undefined") return;
  if (!Number.isFinite(zoom)) return;
  try {
    const current = readUserZooms();
    if (current[kind] === zoom) return;
    const next = { ...current, [kind]: zoom };
    window.localStorage.setItem(USER_ZOOM_KEY, JSON.stringify(next));
  } catch {
    // Ignore quota / privacy mode failures.
  }
}

