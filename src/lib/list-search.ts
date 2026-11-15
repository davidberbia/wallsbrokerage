export const normalizeSearch = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLocaleLowerCase("fr")
    .trim();

export function matchesAssetSearch(
  asset: {
    title?: string | null;
    city?: string | null;
    address?: string | null;
    reference?: string | null;
    postal_code?: string | null;
  },
  query: string,
) {
  const text = normalizeSearch(
    [asset.title, asset.city, asset.address, asset.reference, asset.postal_code]
      .filter(Boolean)
      .join(" "),
  );
  return normalizeSearch(query)
    .split(/\s+/)
    .filter(Boolean)
    .every((word) => text.includes(word));
}

export function homeDestination(isStaff: boolean) {
  return isStaff ? ("/dossiers" as const) : ("/mon-profil" as const);
}
