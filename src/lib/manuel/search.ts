import type { ManualTab } from "./types";

const STOP = new Set("le la les un une des de du d l et ou a au aux en dans sur pour par avec sans est sont comment quoi que qui quel quelle quels quelles je j me m on il elle ce cet cette ces mon ma mes son sa ses peut peux faire fait il y ne pas plus".split(" "));

export function tokens(s: string): string[] {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 1 && !STOP.has(t))
    .map((t) => (t.length > 4 ? t.replace(/(s|x)$/, "") : t));
}

export type Hit = { tab: string; section: string; title: string; tabLabel: string; score: number };

/** Recherche gratuite par mots-clés dans le Manuel écrit (titre compté double). */
export function searchManual(tabs: ManualTab[], question: string, limit = 3): Hit[] {
  const q = new Set(tokens(question));
  if (!q.size) return [];
  const hits: Hit[] = [];
  for (const t of tabs)
    for (const s of t.sections) {
      const title = tokens(`${t.label} ${s.title}`);
      const body = tokens(s.body.join(" "));
      let score = 0;
      for (const w of q) {
        if (title.includes(w)) score += 2;
        if (body.includes(w)) score += 1;
      }
      if (score > 0) hits.push({ tab: t.slug, section: s.id, title: s.title, tabLabel: t.label, score });
    }
  return hits.sort((a, b) => b.score - a.score).slice(0, limit);
}

/** Onglet du Manuel correspondant à la page affichée. */
export function tabForPath(tabs: ManualTab[], path: string): ManualTab | undefined {
  return tabs.find((t) => t.routes.some((r) => path === r || path.startsWith(`${r}/`)));
}
