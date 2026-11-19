/** Année civile lue dans une date ISO (timestamp ou date simple) ; null si absente ou illisible. */
export function yearOf(value?: string | null): number | null {
  if (!value) return null;
  const y = Number(String(value).slice(0, 4));
  return Number.isInteger(y) && y >= 1000 && y <= 2999 ? y : null;
}

/** Vrai si la date correspond au filtre d'année ("all" garde toutes les années). */
export function matchesYear(value: string | null | undefined, filter: string): boolean {
  if (filter === "all") return true;
  const y = yearOf(value);
  return y != null && String(y) === filter;
}

/** Années présentes dans une liste de dates, de la plus récente à la plus ancienne. */
export function yearsOf(values: (string | null | undefined)[]): number[] {
  return [...new Set(values.map(yearOf).filter((y): y is number => y != null))].sort((a, b) => b - a);
}
