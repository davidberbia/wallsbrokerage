// Cibles (opportunités entrantes) et honoraires détectés par l'IA → tableau des dossiers.
import { getAdmin } from "@/lib/automation.server";
import { addressKey } from "@/lib/lead-policy";
import { isGenericDealName, nameKey, nameTokens, sameDeal } from "@/lib/deal-stages";

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

const COLS = "id, name, stage, surface, rent, amount, fee_amount, fee_pct, address";
const BAD_NAME = /^(inconnu|n\/?a|non pr[ée]cis[ée]|dossier|actif|facture|honoraires?|divers|autre)$/i;

async function findDeal(admin: Admin, key: string, name: string) {
  const { data } = await admin.from("deals").select(COLS).eq("name_key", key).limit(1).maybeSingle();
  if (data) return data;
  // Rapprochement souple : même enseigne / ville / adresse sous un autre libellé.
  const tokens = nameTokens(name).sort((a, b) => b.length - a.length);
  if (!tokens.length) return null;
  for (const t of tokens.slice(0, 3)) {
    const { data: cands } = await admin.from("deals").select(COLS).ilike("name", `%${t}%`).limit(30);
    const hit = (cands ?? []).find((c) => sameDeal(c.name, name));
    if (hit) return hit;
  }
  return null;
}

/** Doublons : même référence (64_0001) dans un lead ou l'objet d'un mail rangé, ou même bien sous un autre libellé. */
async function findExistingLead(admin: Admin, name: string, text: string, address?: string, city?: string): Promise<string | null> {
  const ref = `${name} ${text}`.match(/\b\d{2}_\d{4}\b/)?.[0];
  if (ref) {
    const { data: byName } = await admin.from("deals").select("id").ilike("name", `%${ref.replace("_", "\\_")}%`).neq("lead_status", "archived").limit(1).maybeSingle();
    if (byName) return byName.id;
    const { data: byMail } = await admin.from("mail_messages").select("deal_id").ilike("subject", `%${ref.replace("_", "\\_")}%`).not("deal_id", "is", null).limit(1).maybeSingle();
    if (byMail?.deal_id) return byMail.deal_id;
  }
  // Même adresse (numéro + voie), quelle que soit l'écriture.
  const key = addressKey(address);
  if (key) {
    const [n, , word] = key.split(" ");
    const { data: cands } = await admin.from("deals").select("id,address").ilike("address", `%${n}%${word ?? ""}%`).neq("lead_status", "archived").limit(20);
    const hit = (cands ?? []).find((c) => addressKey(c.address) === key);
    if (hit) return hit.id;
  }
  // Même enseigne / occupant dans la même ville.
  if (city?.trim()) {
    const norm = (v: string) => v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const { data: occ } = await admin.from("assets").select("id,occupant").ilike("city", city.trim()).not("occupant", "is", null).limit(50);
    const hay = norm(`${name} ${text}`);
    const a = (occ ?? []).find((o) => { const v = norm(String(o.occupant ?? "")).trim(); return v.length >= 4 && hay.includes(v); });
    if (a) { const { data: d } = await admin.from("deals").select("id").eq("asset_id", a.id).neq("lead_status", "archived").limit(1).maybeSingle(); if (d) return d.id; }
  }
  const hit = await findDeal(admin, nameKey(name), name);
  return hit?.id ?? null;
}

/** Crée ou complète les cibles, applique les honoraires. Jamais de doublon (clé de nom). */
export async function saveTargets(
  admin: Admin,
  targets: RawTarget[],
  fees: RawFee[],
  source: string,
  date: string,
): Promise<{ targets: number; fees: number; ids: string[] }> {
  // Opportunities only: no invoice, payment or pipeline-stage writes.
  void fees;
  const {data:owner}=await admin.from("user_roles").select("user_id").eq("role","admin").limit(2);
  if(owner?.length!==1)return {targets:0,fees:0,ids:[]};
  const ownerId=owner[0]?.user_id;if(!ownerId)return {targets:0,fees:0,ids:[]};
  let created=0;const ids:string[]=[];
  for(const t of targets.slice(0,15)) {
    const name=String(t.name ?? "").trim().slice(0,200);const key=nameKey(name);
    if(key.length<3 || BAD_NAME.test(name) || isGenericDealName(name))continue;
    const {data:existing}=await admin.from("deals").select("id").eq("name_key",key).eq("stage","Prospection").eq("owner_id",ownerId).maybeSingle();
    if(existing){ids.push(existing.id);continue;}
    const dup=await findExistingLead(admin,name,[t.excerpt,t.origin].filter(Boolean).join(" "),t.address,t.city);
    if(dup){ids.push(dup);continue;}
    const {data,error}=await admin.from("deals").insert({name,name_key:key,stage:"Prospection",owner_id:ownerId,source,notes:[t.origin,t.asset_class,t.excerpt].filter(Boolean).join("\n").slice(0,2000),vintage:yearOf(date),surface:num(t.surface),rent:num(t.rent),amount:num(t.price),address:[t.address,t.city].filter(Boolean).join(", ").slice(0,300) || null}).select("id").single();
    if(error)throw error;if(data){created++;ids.push(data.id);}
  }
  return {targets:created,fees:0,ids};
}
/** Queue once; background processor owns grounded research and budgets. */
export async function enrichTarget(dealId:string):Promise<void> {
  const admin=await getAdmin();const {data:t}=await admin.from("deals").select("stage,owner_id").eq("id",dealId).maybeSingle();
  if(!t || t.stage!=="Prospection" || !t.owner_id)return;
  const {error}=await admin.from("extraction_jobs").upsert({owner_id:t.owner_id,kind:"research",target_id:dealId},{onConflict:"owner_id,kind,target_id",ignoreDuplicates:true});if(error)throw error;
}

/** Rattache le mail source aux leads créés et enregistre l'interlocuteur (destinataire si mail envoyé). */
export async function linkTargetMail(admin: Admin, dealIds: string[], mail: { id?: string; graph_id?: string }): Promise<void> {
  if (!dealIds.length || (!mail.id && !mail.graph_id)) return;
  let q = admin.from("mail_messages").select("id, folder, from_email, from_name, participants, to_display, deal_id");
  q = mail.id ? q.eq("id", mail.id) : q.eq("graph_id", mail.graph_id!);
  const { data: m } = await q.maybeSingle();
  if (!m) return;
  const first = dealIds[0]!;
  if (!m.deal_id) await admin.from("mail_messages").update({ deal_id: first }).eq("id", m.id).is("deal_id", null);
  const own = (e: string) => /@wallsbroker(age)?\.com$/i.test(e);
  const emails = m.folder === "sentitems"
    ? (m.participants ?? []).map((e: string) => e.toLowerCase().trim()).filter((e: string) => e && !own(e))
    : [String(m.from_email ?? "").toLowerCase().trim()].filter((e) => e && !own(e));
  const name = m.folder === "sentitems" ? (emails.length === 1 ? m.to_display : null) : m.from_name;
  for (const email of emails.slice(0, 3)) {
    await admin.from("deal_contacts").upsert({ deal_id: first, email, name: name || null }, { onConflict: "deal_id,email", ignoreDuplicates: true });
  }
}
