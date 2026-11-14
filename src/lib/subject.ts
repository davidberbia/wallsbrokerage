export const subjectFor = (asset: { title: string; city?: string | null }) => {
  const city = asset.city?.trim();
  const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const withCity = city && !norm(asset.title).includes(norm(city));
  return `Opportunité d'investissement — ${asset.title}${withCity ? ` (${city})` : ""}`;
};
