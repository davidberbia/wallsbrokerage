/** Adresses techniques jamais affichées comme interlocuteur. */
const NOISE = /newsletter|no-?reply|postmaster|mailer-daemon|notification/i;

/**
 * Interlocuteurs tiers d'un ensemble de champs e-mail.
 * Seules les adresses de l'utilisateur connecté sont masquées :
 * un collègue Wallsbroker qui transmet une affaire reste visible.
 */
export function correspondents(raws: (string | null | undefined)[], self: string[]): string[] {
  const mine = new Set(self.map((e) => e.trim().toLowerCase()).filter(Boolean));
  const out = new Set<string>();
  for (const raw of raws)
    for (const e of (raw ?? "").match(/[^\s<>,;"']+@[^\s<>,;"'.][^\s<>,;"']*/g) ?? []) {
      const v = e.toLowerCase().replace(/[.)\]]+$/, "");
      if (!mine.has(v) && !NOISE.test(v)) out.add(v);
    }
  return [...out];
}

/** Regroupe par domaine : l'interlocuteur principal et ses collègues de la même société. */
export function byDomain(emails: string[]): [string, string[]][] {
  const m = new Map<string, string[]>();
  for (const e of emails) {
    const d = e.split("@")[1] ?? "";
    m.set(d, [...(m.get(d) ?? []), e]);
  }
  return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
}
