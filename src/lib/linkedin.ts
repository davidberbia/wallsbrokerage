// Règles pures du module Notoriété LinkedIn (testées).
export type PostKind = "actifs" | "specialite" | "marche";
export const KIND_LABEL: Record<PostKind, string> = {
  actifs: "3 actifs à vendre (lundi/mardi)",
  specialite: "Article spécialité (jeudi/vendredi)",
  marche: "Évolution du marché (mensuel)",
};

export function formatPrice(p: number): string {
  if (p >= 1_000_000) {
    const m = Math.round((p / 1_000_000) * 10) / 10;
    return `${String(m).replace(".", ",")} M€`;
  }
  return `${Math.round(p / 1000)} k€`;
}

export type AnonAsset = { asset_class: string | null; asset_subclass: string | null; surface: number | null; postal_code: string | null; city: string | null; price: number | null };

/** « Hôtel particulier de 450 m² à vendre dans le 17e à 6,5 M€ NV » — jamais d'adresse, enseigne ni propriétaire. */
export function anonymizeAsset(a: AnonAsset): string | null {
  const type = (a.asset_subclass || a.asset_class || "").trim();
  if (!type || !a.price) return null;
  const cp = (a.postal_code ?? "").trim();
  let where = "";
  if (/^750\d\d$/.test(cp)) {
    const n = Number(cp.slice(3));
    where = ` dans le ${n}${n === 1 ? "er" : "e"}`;
  } else if (a.city) where = ` à ${a.city.trim()}`;
  const surf = a.surface ? ` de ${Math.round(a.surface).toLocaleString("fr-FR")} m²` : "";
  return `${type.charAt(0).toUpperCase()}${type.slice(1)}${surf} à vendre${where} à ${formatPrice(a.price)} NV`;
}

/** Semaine paire (n° ISO) : lundi/jeudi ; impaire : mardi/vendredi. */
export function isoWeek(d: Date): number {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return Math.ceil(((t.getTime() - y.getTime()) / 86400000 + 1) / 7);
}

/** Types de posts prévus pour une date : point marché le jour choisi, actifs lundi/mardi alternés, spécialité jeudi/vendredi alternés. */
export function kindsForDate(d: Date, marketDay: number): PostKind[] {
  const out: PostKind[] = [];
  if (d.getDate() === marketDay) out.push("marche");
  const even = isoWeek(d) % 2 === 0;
  const wd = d.getDay();
  if (wd === (even ? 1 : 2)) out.push("actifs");
  if (wd === (even ? 4 : 5)) out.push("specialite");
  return out;
}
export const kindForDate = (d: Date, marketDay: number): PostKind | null => kindsForDate(d, marketDay)[0] ?? null;

const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

/** Planning du mois de `from`, à partir de `from` inclus. */
export function monthPlan(from: Date, marketDay: number): { date: string; kind: PostKind }[] {
  const out: { date: string; kind: PostKind }[] = [];
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const m = d.getMonth();
  while (d.getMonth() === m) {
    for (const kind of kindsForDate(d, marketDay)) out.push({ date: ymd(d), kind });
    d.setDate(d.getDate() + 1);
  }
  return out;
}

export const INVITES_MAX_PER_DAY = 10;
export const INVITE_WAIT_MIN = 50;
export const INVITE_WAIT_MAX = 120;
/** Attente aléatoire entre deux invitations, en minutes (50 à 120). */
export function inviteWaitMinutes(rand: number = Math.random()): number {
  return Math.round(INVITE_WAIT_MIN + Math.min(1, Math.max(0, rand)) * (INVITE_WAIT_MAX - INVITE_WAIT_MIN));
}
/** Peut-on afficher l'invitation suivante ? */
export function canInviteNow(doneToday: number, nextAt: string | null, now: Date): boolean {
  if ([0, 6].includes(now.getDay())) return false;
  if (doneToday >= INVITES_MAX_PER_DAY) return false;
  return !nextAt || new Date(nextAt).getTime() <= now.getTime();
}

/** File d'invitations : du contact le plus récent au plus ancien, déjà invités exclus, plafond quotidien. */
export function inviteQueue<T extends { id: string; created_at: string }>(contacts: T[], done: Set<string>, perDay: number): T[] {
  return contacts
    .filter((c) => !done.has(c.id))
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, Math.min(perDay, INVITES_MAX_PER_DAY));
}

/** Couleur de l'onglet LinkedIn : rouge sans post préparé à venir, orange s'il reste une semaine ou moins. */
export function pipelineLevel(preparedDates: string[], today: string): "ok" | "orange" | "rouge" {
  const future = preparedDates.filter((d) => d >= today).sort();
  if (future.length === 0) return "rouge";
  const limit = new Date(`${today}T12:00:00Z`);
  limit.setUTCDate(limit.getUTCDate() + 7);
  return future[future.length - 1]! <= limit.toISOString().slice(0, 10) ? "orange" : "ok";
}
