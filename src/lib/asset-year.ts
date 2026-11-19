type WithNasYear = { nas_year?: number | null };

export function assetYears(assets: WithNasYear[]): number[] {
  return [...new Set(assets.flatMap((a) => a.nas_year == null ? [] : [a.nas_year]))].sort((a, b) => b - a);
}

export function matchesAssetYear(asset: WithNasYear, filter: string, currentYear?: number): boolean {
  if (filter === "all") return true;
  if (currentYear != null && filter === String(currentYear) && asset.nas_year == null) return true;
  if (filter === "none") return asset.nas_year == null;
  return asset.nas_year != null && String(asset.nas_year) === filter;
}
/** Année de comptage : un actif sans année de dossier compte dans l'année en cours. */
export function countYear(asset: WithNasYear, currentYear: number): number {
  return asset.nas_year ?? currentYear;
}
