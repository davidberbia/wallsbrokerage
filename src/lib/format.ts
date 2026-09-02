/** Formatage des montants : espaces fines pour les milliers. */
export const formatThousands = (value: string | number | null | undefined) => {
  if (value == null || value === "") return "";
  const digits = String(value).replace(/[^\d]/g, "");
  if (!digits) return "";
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
};

/** Retire les séparateurs pour obtenir un nombre exploitable. */
export const parseThousands = (value: string) => {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
};

/** Nom de fichier lisible d'une brochure stockée (le dossier porte l'identifiant). */
export function brochureFileName(path: string | null | undefined) {
  if (!path) return null;
  const last = path.split("/").pop() ?? path;
  // Compatibilité avec l'ancien format « <uuid>-nom.pdf ».
  return last.replace(
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}-/i,
    "",
  );
}
