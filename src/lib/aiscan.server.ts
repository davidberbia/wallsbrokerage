// Analyse IA (Gemini) de toute la boîte mail : texte des mails + pièces jointes,
// chaque pièce jointe lue une seule fois (empreinte sha256).
import { getAdmin } from "@/lib/automation.server";
import { classifyAddress, companyFromDomain, graphGet } from "@/lib/mailscan.server";
import { BudgetReachedError, callGeminiFileJson, callGeminiJson } from "@/lib/gemini.server";

type Admin = Awaited<ReturnType<typeof getAdmin>>;

export const PAGE_SIZE = 10;
export const MIN_BYTES = 15 * 1024;
export const MAX_BYTES = 15 * 1024 * 1024;

export type Extraction = {
  contacts?: { email?: string; full_name?: string; job_title?: string; company?: string; phone?: string }[];
  comparables?: {
    kind?: string;
    asset_class?: string;
    enseigne?: string;
    address?: string;
    postal_code?: string;
    city?: string;
    surface?: number;
    rent?: number;
    price?: number;
    yield_pct?: number;
    deal_date?: string;
    excerpt?: string;
  }[];
  news?: { company?: string; title?: string; excerpt?: string }[];
};

export const SYSTEM = `Tu es l'analyste d'un courtier en immobilier commercial français (Wallsbroker).
Extrait UNIQUEMENT des informations explicitement présentes, jamais inventées. Réponds en JSON :
{"contacts":[{"email","full_name","job_title","company","phone"}],
 "comparables":[{"kind":"location"|"vente","asset_class","enseigne","address","postal_code","city","surface","rent","price","yield_pct","deal_date":"AAAA-MM-JJ","excerpt"}],
 "news":[{"company","title","excerpt"}]}
- contacts : personnes professionnelles avec un email (signatures, listes, annuaires). Ignore Wallsbroker.
- comparables : transactions immobilières réelles (bail signé = location avec loyer annuel HT en €, cession = vente avec prix en €). surface en m². excerpt = phrase source (max 300 caractères).
- news : actualités d'acteurs de l'immobilier (acquisition, cession, levée, nomination, recrutement, nouveau fonds, recherche d'actifs). Max 10.
Tableaux vides si rien. Pas de texte hors JSON.`;

export function geminiStatus(e: unknown): number | null {
  const m = /Gemini \[(\d+)\]/.exec(e instanceof Error ? e.message : String(e));
  return m ? Number(m[1]) : null;
}

export async function sha256(bytes: Uint8Array): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const b64decode = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

/** Prépare une pièce jointe pour Gemini : fichier direct ou texte extrait. */
async function prepare(name: string, type: string, base64: string): Promise<
  { file: { mimeType: string; base64: string } } | { text: string } | null
> {
  const n = name.toLowerCase();
  if (type === "application/pdf" || n.endsWith(".pdf")) return { file: { mimeType: "application/pdf", base64 } };
  if (/^image\/(png|jpe?g|webp)$/.test(type) || /\.(png|jpe?g|webp)$/.test(n)) {
    const mt = type.startsWith("image/") ? type.replace("jpg", "jpeg") : n.endsWith(".png") ? "image/png" : n.endsWith(".webp") ? "image/webp" : "image/jpeg";
    return { file: { mimeType: mt, base64 } };
  }
  if (/\.(xlsx|xlsm|xls|csv)$/.test(n)) {
    const XLSX = await import("xlsx");
    const wb = XLSX.read(b64decode(base64), { type: "array" });
    const text = wb.SheetNames.slice(0, 6)
      .map((s) => `# ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s]!)}`)
      .join("\n\n");
    return { text: text.slice(0, 120_000) };
  }
  if (n.endsWith(".docx") || n.endsWith(".pptx")) {
    const { unzipSync, strFromU8 } = await import("fflate");
    const files = unzipSync(b64decode(base64));
    const xml = Object.entries(files)
      .filter(([p]) => p === "word/document.xml" || /^ppt\/slides\/slide\d+\.xml$/.test(p))
      .map(([, v]) => strFromU8(v))
      .join("\n");
    const text = xml.replace(/<\/w:p>|<\/a:p>/g, "\n").replace(/<[^>]+>/g, " ").replace(/[ \t]+/g, " ");
    return { text: text.slice(0, 120_000) };
  }
  if (type.startsWith("text/") || n.endsWith(".txt")) {
    return { text: new TextDecoder().decode(b64decode(base64)).slice(0, 120_000) };
  }
  return null;
}

export async function analyseAttachment(name: string, type: string, base64: string): Promise<Extraction | "unsupported"> {
  const p = await prepare(name, type, base64);
  if (!p) return "unsupported";
  const prompt = `Pièce jointe « ${name} ». Extrait contacts, comparables et actualités.`;
  if ("file" in p) {
    return (await callGeminiFileJson<Extraction>({ task: "aiscan-pj", system: SYSTEM, prompt, file: p.file })) ?? {};
  }
  if (p.text.trim().length < 40) return {};
  return (await callGeminiJson<Extraction>({ task: "aiscan-pj", system: SYSTEM, prompt: `${prompt}\n\n${p.text}` })) ?? {};
}

export async function analyseBodies(
  mails: { from: string; subject: string; date: string; text: string }[],
): Promise<Extraction> {
  const joined = mails
    .map((m, i) => `=== MAIL ${i + 1} — ${m.date} — de ${m.from} — ${m.subject}\n${m.text}`)
    .join("\n\n");
  return (await callGeminiJson<Extraction>({ task: "aiscan-mails", system: SYSTEM, prompt: joined })) ?? {};
}

const num = (v: unknown) => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(/[^\d.,-]/g, "").replace(",", "."));
  return Number.isFinite(n) && n > 0 ? n : null;
};

/** Enregistre ce que Gemini a trouvé, sans jamais créer de doublon. */
export async function saveExtraction(
  admin: Admin,
  ex: Extraction,
  graphId: string,
  date: string,
): Promise<{ contacts: number; comparables: number; news: number }> {
  let contacts = 0;
  let comparables = 0;
  let news = 0;

  // Contacts
  const byEmail = new Map<string, NonNullable<Extraction["contacts"]>[number]>();
  for (const c of ex.contacts ?? []) {
    const k = classifyAddress(String(c.email ?? ""));
    if (k) byEmail.set(k.email, c);
  }
  const list = [...byEmail.keys()].slice(0, 60);
  if (list.length) {
    const [{ data: a }, { data: b }, { data: c }] = await Promise.all([
      admin.from("investors").select("email").in("email", list),
      admin.from("prospect_contacts").select("email").in("email", list),
      admin.from("mailscan_candidates").select("email").in("email", list),
    ]);
    const known = new Set([...(a ?? []), ...(b ?? []), ...(c ?? [])].map((x) => (x.email ?? "").toLowerCase()));
    const rows = list
      .filter((e) => !known.has(e))
      .map((e) => {
        const info = byEmail.get(e)!;
        const domain = e.split("@")[1]!;
        const full = (info.full_name ?? "").trim() || null;
        return {
          email: e,
          domain,
          full_name: full,
          first_name: full ? full.split(/\s+/)[0]! : null,
          job_title: info.job_title?.trim() || null,
          phone: info.phone?.trim() || null,
          company_name: info.company?.trim() || companyFromDomain(domain),
          last_seen_at: date,
          status: "à valider",
        };
      });
    if (rows.length) {
      await admin.from("mailscan_candidates").upsert(rows, { onConflict: "email", ignoreDuplicates: true });
      contacts = rows.length;
    }
  }

  // Comparables
  const cRows = (ex.comparables ?? [])
    .map((c) => {
      const kind = c.kind === "vente" ? "vente" : "location";
      const surface = num(c.surface);
      const rent = num(c.rent);
      const price = num(c.price);
      if (kind === "location" ? !rent && !surface : !price) return null;
      const excerpt = (c.excerpt ?? `${c.enseigne ?? ""} ${c.address ?? ""} ${c.city ?? ""}`).trim().slice(0, 500);
      if (!excerpt) return null;
      return {
        kind,
        asset_class: c.asset_class || null,
        enseigne: c.enseigne || null,
        address: c.address || null,
        postal_code: c.postal_code ? String(c.postal_code).slice(0, 10) : null,
        city: c.city || null,
        surface,
        rent: kind === "location" ? rent : null,
        price: kind === "vente" ? price : null,
        rent_m2: kind === "location" && rent && surface ? Math.round(rent / surface) : null,
        price_m2: kind === "vente" && price && surface ? Math.round(price / surface) : null,
        yield_pct: num(c.yield_pct),
        deal_date: c.deal_date && /^\d{4}-\d{2}-\d{2}$/.test(c.deal_date) ? c.deal_date : date.slice(0, 10),
        excerpt,
        source: "IA",
        mail_graph_id: graphId,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null)
    .slice(0, 40);
  if (cRows.length) {
    await admin.from("comparables").upsert(cRows, { onConflict: "mail_graph_id,excerpt", ignoreDuplicates: true });
    comparables = cRows.length;
  }

  // Actualités
  const nRows = (ex.news ?? [])
    .filter((n) => n.company && n.title)
    .slice(0, 10)
    .map((n) => ({
      company: String(n.company).slice(0, 200),
      title: String(n.title).slice(0, 300),
      excerpt: n.excerpt ? String(n.excerpt).slice(0, 600) : null,
      mail_graph_id: graphId,
      published_at: date,
      source: "IA",
    }));
  if (nRows.length) {
    await admin.from("news_items").upsert(nRows, { onConflict: "company,mail_graph_id", ignoreDuplicates: true });
    news = nRows.length;
  }
  return { contacts, comparables, news };
}

export { BudgetReachedError, graphGet };
