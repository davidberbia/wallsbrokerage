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
