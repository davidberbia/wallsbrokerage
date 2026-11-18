type WithNasYear = { nas_year?: number | null };

export function assetYears(assets: WithNasYear[]): number[] {
  return [...new Set(assets.flatMap((a) => a.nas_year == null ? [] : [a.nas_year]))].sort((a, b) => b - a);
}

export function matchesAssetYear(asset: WithNasYear, filter: string): boolean {
  if (filter === "all") return true;
  if (filter === "none") return asset.nas_year == null;
  return asset.nas_year != null && String(asset.nas_year) === filter;
}