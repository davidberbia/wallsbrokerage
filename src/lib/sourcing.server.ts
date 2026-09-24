// Sourcing par règles (aucune IA) : newsletters et PDF reçus → actualités,
// comparables location/vente et nouveaux contacts à valider.
import { graphGet, classifyAddress, companyFromDomain } from "@/lib/mailscan.server";
import { getAdmin } from "@/lib/automation.server";

const MESSAGES_PER_RUN = 20;
const MAX_PDF_BYTES = 6 * 1024 * 1024;
const MAX_TEXT = 200_000;

const NEWSLETTER_DOMAINS = [
  "cfnewsimmo.net",
  "cfnews.net",
  "businessimmo.com",
  "business-immo.com",
  "lesechos.fr",
  "immoweek.fr",
  "pierrepapier.fr",
  "decideurs-magazine.com",
  "sirenews.com",
  "lettreimmo.com",
  "journaldelagence.com",
  "boursorama.com",
];
const NEWSLETTER_SUBJECT = /newsletter|lettre d.info|hebdo|flash|actu|the week|daily|matinale|revue de presse/i;
const ACTION_RE =
  /\b(acquiert|acquis|acquisition|rach[eè]te|rachat|c[eè]de|cession|c[ée]d[ée]|vend|vendu|l[eè]ve|lev[ée]e|nomm[ée]|nomination|recrute|signe|sign[ée]|loue|lou[ée]|investit|investissement|lance|financ|refinanc|arbitr|s.install|prend à bail|bail)\b/i;

type Admin = Awaited<ReturnType<typeof getAdmin>>;

const num = (raw: string) => {
  const n = Number.parseFloat(raw.replace(/\s|\u00a0|\u202f/g, "").replace(/\.(?=\d{3}\b)/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

const htmlToText = (html: string) =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<br\s*\/?>|<\/(p|div|li|tr|h\d)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&eacute;/g, "é")
    .replace(/&egrave;/g, "è")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ");

const sentences = (text: string) =>
  text
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.replace(/\s+/g, " ").trim())
    .filter((s) => s.length >= 25 && s.length <= 600);

const SURFACE_RE = /(\d[\d\s\u00a0\u202f.,]*)\s*(?:m²|m2|mètres carrés|sqm)/i;
const PRICE_RE = /(\d[\d\s\u00a0\u202f.,]*)\s*(m€|millions?\s*d.euros|millions?\s*€|mio|k€|€)(?!\s*\/)/i;
const RENT_M2_RE = /(\d[\d\s\u00a0\u202f.,]*)\s*€\s*(?:HT\s*)?(?:HC\s*)?\/\s*m²?\s*\/?\s*an/i;
const CP_CITY_RE = /\b(\d{5})\s+([A-ZÉÈ][A-Za-zÀ-ÿ' -]{2,30})/;
const A_CITY_RE = /\b(?:à|sur|de)\s+(Paris(?:\s\d{1,2}e)?|Lyon|Marseille|Lille|Bordeaux|Toulouse|Nantes|Nice|Strasbourg|Montpellier|Rennes|Grenoble|Rouen|Toulon|Reims|Dijon|Angers|Tours|Brest|Metz|Nancy|Orléans|Clermont-Ferrand|Saint-Denis|Boulogne-Billancourt|Neuilly-sur-Seine|Issy-les-Moulineaux|Levallois-Perret|Courbevoie|Nanterre|La Défense|Aix-en-Provence|Le Havre|Caen|Mulhouse|Perpignan|Limoges|Annecy|Brive)/;
const ADDRESS_RE = /\d{1,4}\s*(?:bis|ter)?,?\s+(?:rue|avenue|boulevard|bd|place|quai|cours|allée|chemin|impasse)\s+[A-Za-zÀ-ÿ' -]{2,50}/i;
const CLASSES: [RegExp, string][] = [
  [/bureau/i, "Bureaux"],
  [/commerce|retail|boutique|centre commercial|retail park/i, "Commerces"],
  [/logistique|entrepôt|entrepot|plateforme/i, "Logistique"],
  [/activité|locaux d.activité|industriel/i, "Activités"],
  [/hôtel|hotel|hôtellerie/i, "Hôtellerie"],
  [/logement|résidentiel|residentiel|appartement/i, "Résidentiel"],
  [/santé|clinique|ehpad/i, "Santé"],
  [/terrain|foncier/i, "Foncier"],
];

export function extractComparables(text: string) {
  const out: {
    kind: "location" | "vente";
    surface: number | null;
    price: number | null;
    rent: number | null;
    price_m2: number | null;
    city: string | null;
    address: string | null;
    asset_class: string | null;
    excerpt: string;
  }[] = [];
  for (const s of sentences(text)) {
    const sm = s.match(SURFACE_RE);
    if (!sm) continue;
    const surface = num(sm[1]!);
    if (!surface || surface < 20 || surface > 1_000_000) continue;
    const isRent = /loyer|bail|lou[ée]|preneur|location|prise à bail|pris à bail|€\s*\/\s*m²?\s*\/\s*an/i.test(s);
    const isSale = /acqui|c[ée]d|vend|cession|rach|achat|transaction|investi/i.test(s);
    if (!isRent && !isSale) continue;
    const rm = s.match(RENT_M2_RE);
    const pm = s.match(PRICE_RE);
    let price: number | null = null;
    if (pm) {
      const v = num(pm[1]!);
      const unit = pm[2]!.toLowerCase();
      if (v) price = /m€|million|mio/.test(unit) ? v * 1_000_000 : unit === "k€" ? v * 1000 : v;
    }
    const rentM2 = rm ? num(rm[1]!) : null;
    if (!price && !rentM2) continue;
    const kind = isRent && !(isSale && price && price > 500_000 && !rentM2) ? "location" : "vente";
    const cp = s.match(CP_CITY_RE);
    const ac = s.match(A_CITY_RE);
    const addr = s.match(ADDRESS_RE);
    out.push({
      kind,
      surface,
      price: kind === "vente" ? price : null,
      rent: kind === "location" ? (rentM2 ? rentM2 * surface : price) : null,
      price_m2: kind === "location" ? rentM2 : price ? Math.round(price / surface) : null,
      city: cp ? `${cp[1]} ${cp[2]!.trim()}` : ac ? ac[1]! : null,
      address: addr ? addr[0].trim() : null,
      asset_class: CLASSES.find(([re]) => re.test(s))?.[1] ?? null,
      excerpt: s.slice(0, 500),
    });
  }
  return out.slice(0, 30);
}

async function pdfText(bytes: Uint8Array): Promise<string> {
  const { extractText, getDocumentProxy } = await import("unpdf");
  const pdf = await getDocumentProxy(bytes);
  const { text } = await extractText(pdf, { mergePages: true });
  return (Array.isArray(text) ? text.join("\n") : text).slice(0, MAX_TEXT);
}

type Company = { key: string; name: string; investor_id: string | null; prospect_company_id: string | null };

async function loadCompanies(admin: Admin): Promise<Company[]> {
  const [{ data: inv }, { data: pc }] = await Promise.all([
    admin.from("investors").select("id, company").not("company", "is", null).limit(5000),
    admin.from("prospect_companies").select("id, name").limit(10000),
  ]);
  const map = new Map<string, Company>();
  for (const i of inv ?? []) {
    const name = (i.company ?? "").trim();
    if (name.length < 4) continue;
    map.set(name.toLowerCase(), { key: name.toLowerCase(), name, investor_id: i.id, prospect_company_id: null });
  }
  for (const p of pc ?? []) {
    const name = p.name.trim();
    if (name.length < 4) continue;
    const k = name.toLowerCase();
    const prev = map.get(k);
    if (prev) prev.prospect_company_id = p.id;
    else map.set(k, { key: k, name, investor_id: null, prospect_company_id: p.id });
  }
  return [...map.values()];
}

const escRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export async function runSourcing(): Promise<Record<string, number | string>> {
  const admin = await getAdmin();
  const since = new Date(Date.now() - 120 * 24 * 3600 * 1000).toISOString();
  const { data: recent } = await admin
    .from("mail_messages")
    .select("id, graph_id, subject, from_email, from_name, received_at, deal_id")
    .eq("folder", "inbox")
    .gte("received_at", since)
    .order("received_at", { ascending: false })
    .limit(1500);
  const pool = (recent ?? []).filter((m) => {
    const dom = (m.from_email ?? "").split("@")[1] ?? "";
    return (
      m.deal_id ||
      NEWSLETTER_DOMAINS.some((d) => dom === d || dom.endsWith(`.${d}`)) ||
      NEWSLETTER_SUBJECT.test(m.subject ?? "")
    );
  });
  if (!pool.length) return { sourcing: 0 };
  const { data: done } = await admin
    .from("sourcing_scanned")
    .select("graph_id")
    .in("graph_id", pool.map((m) => m.graph_id));
  const doneSet = new Set((done ?? []).map((d) => d.graph_id));
  const todo = pool.filter((m) => !doneSet.has(m.graph_id)).slice(0, MESSAGES_PER_RUN);
  if (!todo.length) return { sourcing: 0 };

  const companies = await loadCompanies(admin);
  let news = 0;
  let comps = 0;
  let contacts = 0;

  for (const m of todo) {
    let found = 0;
    let pdfCount = 0;
    let err: string | null = null;
    try {
      const msg = await graphGet<{ body?: { content?: string }; hasAttachments?: boolean }>(
        `/v1.0/me/messages/${encodeURIComponent(m.graph_id)}?$select=body,hasAttachments`,
      );
      let text = htmlToText(msg.body?.content ?? "").slice(0, MAX_TEXT);
      if (msg.hasAttachments) {
        const att = await graphGet<{
          value: { name?: string; contentType?: string; size?: number; contentBytes?: string }[];
        }>(`/v1.0/me/messages/${encodeURIComponent(m.graph_id)}/attachments`);
        for (const a of att.value ?? []) {
          const isPdf = /pdf/i.test(a.contentType ?? "") || /\.pdf$/i.test(a.name ?? "");
          if (!isPdf || !a.contentBytes || (a.size ?? 0) > MAX_PDF_BYTES) continue;
          try {
            const bin = Uint8Array.from(atob(a.contentBytes), (c) => c.charCodeAt(0));
            text += `\n${await pdfText(bin)}`;
            pdfCount += 1;
          } catch (e) {
            console.error("PDF illisible", a.name, e);
          }
        }
      }
      const source = m.from_name || m.from_email || "Email";
      const lowerText = text.toLowerCase();

      // Actualités : société connue citée dans une phrase d'action.
      const newsRows: {
        company: string;
        title: string;
        excerpt: string;
        source: string;
        mail_graph_id: string;
        published_at: string;
        investor_id: string | null;
        prospect_company_id: string | null;
      }[] = [];
      for (const c of companies) {
        if (!lowerText.includes(c.key)) continue;
        const re = new RegExp(`(^|[^\\p{L}])${escRe(c.key)}([^\\p{L}]|$)`, "iu");
        const hit = sentences(text).find((s) => re.test(s) && ACTION_RE.test(s));
        if (!hit) continue;
        newsRows.push({
          company: c.name,
          title: hit.slice(0, 280),
          excerpt: hit.slice(0, 600),
          source: `${source}${m.subject ? ` — ${m.subject}` : ""}`.slice(0, 300),
          mail_graph_id: m.graph_id,
          published_at: m.received_at ?? new Date().toISOString(),
          investor_id: c.investor_id,
          prospect_company_id: c.prospect_company_id,
        });
        if (newsRows.length >= 25) break;
      }
      if (newsRows.length) {
        await admin.from("news_items").upsert(newsRows, { onConflict: "company,mail_graph_id", ignoreDuplicates: true });
        news += newsRows.length;
        found += newsRows.length;
      }

      // Comparables.
      const cRows = extractComparables(text).map((c) => ({
        ...c,
        source: `${source}${m.subject ? ` — ${m.subject}` : ""}`.slice(0, 300),
        mail_graph_id: m.graph_id,
        deal_date: m.received_at,
      }));
      if (cRows.length) {
        await admin.from("comparables").upsert(cRows, { onConflict: "mail_graph_id,excerpt", ignoreDuplicates: true });
        comps += cRows.length;
        found += cRows.length;
      }

      // Nouveaux contacts professionnels cités (emails) → à valider.
      const emails = new Set<string>();
      for (const e of text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g) ?? []) {
        const c = classifyAddress(e);
        if (c) emails.add(c.email);
      }
      const list = [...emails].slice(0, 40);
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
            const domain = e.split("@")[1]!;
            return { email: e, domain, company_name: companyFromDomain(domain), last_seen_at: m.received_at, status: "à valider" };
          });
        if (rows.length) {
          await admin.from("mailscan_candidates").upsert(rows, { onConflict: "email", ignoreDuplicates: true });
          contacts += rows.length;
          found += rows.length;
        }
      }
    } catch (e) {
      err = (e instanceof Error ? e.message : String(e)).slice(0, 400);
    }
    await admin
      .from("sourcing_scanned")
      .upsert({ graph_id: m.graph_id, subject: m.subject, pdf_count: pdfCount, found, error: err }, { onConflict: "graph_id" });
  }
  return { sourcing: todo.length, actus: news, comparables: comps, contacts };
}
