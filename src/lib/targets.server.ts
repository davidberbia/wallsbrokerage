// Cibles (opportunités entrantes) et honoraires détectés par l'IA → tableau des dossiers.
import { getAdmin } from "@/lib/automation.server";
import { nameKey } from "@/lib/deal-stages";

type Admin = Awaited<ReturnType<typeof getAdmin>>;

export type RawTarget = {
  name?: string;
  address?: string;
  city?: string;
  asset_class?: string;
  surface?: number | string;
  rent?: number | string;
  price?: number | string;
  fee_amount?: number | string;
  fee_pct?: number | string;
  origin?: string;
  excerpt?: string;
};
export type RawFee = {
  dossier?: string;
  amount_ht?: number | string;
  fee_pct?: number | string;
  kind?: string;
  date?: string;
};

export const TARGETS_RULES = `- targets : opportunités que Wallsbroker reçoit ou étudie : actif ciblé, demande d'avis de valeur, présentation ou teaser reçu, portefeuille (ex. tableau Excel de sites). Format {"name","address","city","asset_class","surface","rent","price","fee_amount","fee_pct","origin","excerpt"}. Un portefeuille = UNE seule cible au nom du portefeuille (surface, loyer annuel et prix totaux). name = nom court du dossier (ex. "Portefeuille Enedis", "Murs Carrefour Rochefort"). origin = "avis de valeur" | "teaser" | "présentation" | "portefeuille" | "mandat" | "autre". Nombres en € et m². Jamais les comparables de marché ni les newsletters génériques.
- fees : honoraires. Format {"dossier","amount_ht","fee_pct","kind":"facture"|"brochure","date":"AAAA-MM-JJ"}. "facture" UNIQUEMENT pour une facture d'honoraires ÉMISE PAR Wallsbroker (jamais une facture reçue d'un fournisseur, d'un prestataire ou du fisc). "brochure" quand une brochure/teaser envoyé par Wallsbroker mentionne ses honoraires (montant ou %).`;

export const TARGETS_SYSTEM = `Tu es l'analyste d'un courtier en immobilier commercial français (Wallsbroker).
Extrait UNIQUEMENT des informations explicitement présentes, jamais inventées. Réponds en JSON {"targets":[],"fees":[]}.
${TARGETS_RULES}
Tableaux vides si rien. Pas de texte hors JSON.`;

const num = (v: unknown) => {
  if (v == null || v === "") return null;
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};
const yearOf = (date: string) => Number(date.slice(0, 4)) || new Date().getFullYear();

async function findDeal(admin: Admin, key: string) {
  const { data } = await admin
    .from("deals")
    .select("id, stage, surface, rent, amount, fee_amount, fee_pct, address")
    .eq("name_key", key)
    .limit(1)
    .maybeSingle();
  return data;
}

/** Crée ou complète les cibles, applique les honoraires. Jamais de doublon (clé de nom). */
export async function saveTargets(
  admin: Admin,
  targets: RawTarget[],
  fees: RawFee[],
  source: string,
  date: string,
): Promise<{ targets: number; fees: number; ids: string[] }> {
  let created = 0;
  let feeCount = 0;
  const ids: string[] = [];
  for (const t of targets.slice(0, 15)) {
    const name = String(t.name ?? "").trim().slice(0, 200);
    const key = nameKey(name);
    if (key.length < 3) continue;
    const vals = {
      surface: num(t.surface),
      rent: num(t.rent),
      amount: num(t.price),
      fee_amount: num(t.fee_amount),
      fee_pct: num(t.fee_pct),
      address: [t.address, t.city].filter(Boolean).join(", ").slice(0, 300) || null,
    };
    const existing = await findDeal(admin, key);
    if (existing) {
      const patch: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(vals)) if (v != null && (existing as Record<string, unknown>)[k] == null) patch[k] = v;
      if (Object.keys(patch).length) await admin.from("deals").update(patch as never).eq("id", existing.id);
      ids.push(existing.id);
      continue;
    }
    const note = [t.origin ? `Origine : ${t.origin}` : null, t.asset_class ? `Type : ${t.asset_class}` : null, t.excerpt ? String(t.excerpt).slice(0, 600) : null]
      .filter(Boolean)
      .join("\n");
    const { data } = await admin
      .from("deals")
      .insert({ name, name_key: key, stage: "Cible", source, notes: note || null, vintage: yearOf(date), last_activity_at: date, ...vals } as never)
      .select("id")
      .single();
    if (data) {
      created++;
      ids.push(data.id);
    }
  }

  for (const f of fees.slice(0, 10)) {
    const dossier = String(f.dossier ?? "").trim().slice(0, 200);
    const key = nameKey(dossier);
    const amount = num(f.amount_ht);
    const pct = num(f.fee_pct);
    if (key.length < 3 || (!amount && !pct)) continue;
    const d = f.date && /^\d{4}-\d{2}-\d{2}$/.test(f.date) ? f.date : date.slice(0, 10);
    const existing = await findDeal(admin, key);
    if (f.kind === "facture" && amount) {
      if (existing) await admin.from("deals").update({ fee_amount: amount, stage: "Acte", paid_at: d } as never).eq("id", existing.id);
      else
        await admin.from("deals").insert({ name: dossier, name_key: key, stage: "Acte", fee_amount: amount, paid_at: d, source: "facture", vintage: yearOf(d), last_activity_at: d } as never);
      feeCount++;
    } else {
      if (existing) {
        const patch: Record<string, unknown> = {};
        if (existing.fee_amount == null && amount) patch["fee_amount"] = amount;
        if (existing.fee_pct == null && pct) patch["fee_pct"] = pct;
        if (Object.keys(patch).length) await admin.from("deals").update(patch as never).eq("id", existing.id);
      } else
        await admin.from("deals").insert({ name: dossier, name_key: key, stage: "Cible", fee_amount: amount, fee_pct: pct, source: "brochure", vintage: yearOf(d), last_activity_at: d } as never);
      feeCount++;
    }
  }
  return { targets: created, fees: feeCount, ids };
}

/** Recherche web (Gemini + Google Search) pour enrichir une cible et proposer une action. */
export async function enrichTarget(dealId: string): Promise<void> {
  const admin = await getAdmin();
  const { data: d } = await admin.from("deals").select("id,name,address,notes,company").eq("id", dealId).single();
  if (!d) return;
  const { callGeminiSearch } = await import("@/lib/gemini.server");
  const res = await callGeminiSearch({
    task: "enrichissement",
    system:
      "Tu es l'analyste d'un courtier en immobilier commercial français. Cherche sur le web des informations fiables et récentes sur cette opportunité (propriétaire, locataires, surface, loyer, prix, actualité des acteurs). N'invente rien. Réponds en JSON {\"summary\": \"4 phrases max en français, avec sources citées\", \"suggestion\": \"une action de prospection concrète pour David (qui appeler, quoi proposer)\"}.",
    prompt: `Opportunité : ${d.name}\nAdresse : ${d.address ?? "?"}\nSociété : ${d.company ?? "?"}\nNotes : ${(d.notes ?? "").slice(0, 1500)}`,
  });
  await admin
    .from("deals")
    .update({ enrichment: res?.summary?.slice(0, 3000) ?? null, suggestion: res?.suggestion?.slice(0, 1000) ?? null, enriched_at: new Date().toISOString() } as never)
    .eq("id", dealId);
}
