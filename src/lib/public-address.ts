/** Adresse publiée sur le site selon le niveau de confidentialité choisi. Masquer la rue masque aussi le numéro. */
export function publicAddress(address: string | null | undefined, hideNumber: boolean, hideStreet: boolean): string | null {
  const value = (address ?? "").trim();
  if (!value || hideStreet) return null;
  if (!hideNumber) return value;
  const stripped = value.replace(/^\s*\d+(\s*(bis|ter|quater|[a-d])\b)?\s*,?\s*/i, "").trim();
  return stripped || null;
}
