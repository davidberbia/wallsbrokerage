// Synthèse quotidienne : rappels, relances, appels suggérés, dossiers dormants,
// récap financier et sourcing. 100 % règles, aucune IA.
import { APP_URL, escapeHtml, getAdmin } from "@/lib/automation.server";
import { OWN_DOMAINS } from "@/lib/mailscan.server";

const DAY = 24 * 3600 * 1000;
const CLOSED = ["Signé", "Perdu"];
const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const dshort = (v: string | null) =>
  v ? new Date(v).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", timeZone: "Europe/Paris" }) : "—";
const own = (e: string | null) => OWN_DOMAINS.includes((e ?? "").split("@")[1] ?? "");
const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export type Digest = { html: string; speech: string; counts: Record<string, number> };

export async function buildDigest(listenUrl: string | null): Promise<Digest> {
  const admin = await getAdmin();
  const now = Date.now();
  const iso = (ms: number) => new Date(ms).toISOString();

  const { data: deals } = await admin
    .from("deals")
    .select("id, name, stage, company, amount, fee_amount, fee_pct, probability, expected_payment_at, paid_at, last_activity_at, updated_at");
  const allDeals = deals ?? [];
  const open = allDeals.filter((d) => !CLOSED.includes(d.stage));
  const openIds = new Set(open.map((d) => d.id));
  const dealName = new Map(allDeals.map((d) => [d.id, d.name]));

  // 1. Mails importants sans réponse (3 / 7 / 15 jours).
  const { data: inbound } = await admin
    .from("mail_messages")
    .select("id, deal_id, subject, from_email, from_name, received_at, web_link")
    .eq("folder", "inbox")
    .not("deal_id", "is", null)
    .gte("received_at", iso(now - 20 * DAY))
    .lte("received_at", iso(now - 3 * DAY))
    .order("received_at", { ascending: false });
  const latest = new Map<string, NonNullable<typeof inbound>[number]>();
  for (const m of inbound ?? []) {
    if (!m.deal_id || !openIds.has(m.deal_id) || !m.from_email || own(m.from_email)) continue;
    const k = `${m.deal_id}|${m.from_email}`;
    if (!latest.has(k)) latest.set(k, m);
  }
  const unanswered: { m: NonNullable<typeof inbound>[number]; tier: number; days: number }[] = [];
  for (const m of latest.values()) {
    const { count } = await admin
      .from("mail_messages")
      .select("id", { count: "exact", head: true })
      .eq("folder", "sentitems")
      .contains("participants", [m.from_email!])
      .gt("received_at", m.received_at!);
    if (count) continue;
    const days = Math.floor((now - new Date(m.received_at!).getTime()) / DAY);
    const tier = days >= 15 ? 15 : days >= 7 ? 7 : 3;
    const { data: already } = await admin
      .from("followup_reminders")
      .select("id")
      .eq("mail_id", m.id)
      .eq("tier", tier)
      .maybeSingle();
    if (already) continue;
    unanswered.push({ m, tier, days });
  }

  // 2. Prospects à relancer : brochure envoyée il y a 7 à 30 jours, sans réponse.
  const { data: sends } = await admin
    .from("brochure_sends")
    .select("email_to, sent_at, opened_at, investors(full_name, company, phone), prospect_contacts(full_name, phone, prospect_companies(name)), assets(title)")
    .in("status", ["envoyé", "ouvert", "délivré"])
    .not("email_to", "is", null)
    .gte("sent_at", iso(now - 30 * DAY))
    .lte("sent_at", iso(now - 7 * DAY))
    .order("opened_at", { ascending: false, nullsFirst: false })
    .limit(60);
  type SendRow = {
    email_to: string;
    sent_at: string;
    opened_at: string | null;
    investors: { full_name: string; company: string | null; phone: string | null } | null;
    prospect_contacts: { full_name: string; phone: string | null; prospect_companies: { name: string } | null } | null;
    assets: { title: string } | null;
  };
  const relaunch: SendRow[] = [];
  const seen = new Set<string>();
  for (const s of (sends ?? []) as unknown as SendRow[]) {
    const em = s.email_to.toLowerCase();
    if (seen.has(em) || own(em)) continue;
    seen.add(em);
    const { count } = await admin
      .from("mail_messages")
      .select("id", { count: "exact", head: true })
      .eq("folder", "inbox")
      .eq("from_email", em)
      .gt("received_at", s.sent_at);
    if (count) continue;
    relaunch.push(s);
    if (relaunch.length >= 10) break;
  }

  // 3. Appels suggérés selon l'actualité (7 derniers jours).
  const { data: news } = await admin
    .from("news_items")
    .select("company, title, source, published_at, investors(full_name, phone), prospect_companies(prospect_contacts(full_name, phone))")
    .gte("published_at", iso(now - 7 * DAY))
    .order("published_at", { ascending: false })
    .limit(30);
  type NewsRow = {
    company: string;
    title: string;
    source: string | null;
    published_at: string;
    investors: { full_name: string; phone: string | null } | null;
    prospect_companies: { prospect_contacts: { full_name: string; phone: string | null }[] } | null;
  };
  const calls: { company: string; title: string; who: string | null; phone: string | null; date: string }[] = [];
  const seenCo = new Set<string>();
  for (const n of (news ?? []) as unknown as NewsRow[]) {
    if (seenCo.has(n.company)) continue;
    seenCo.add(n.company);
    const pc = n.prospect_companies?.prospect_contacts?.find((c) => c.phone) ?? n.prospect_companies?.prospect_contacts?.[0];
    calls.push({
      company: n.company,
      title: n.title,
      who: n.investors?.full_name ?? pc?.full_name ?? null,
      phone: n.investors?.phone ?? pc?.phone ?? null,
      date: n.published_at,
    });
    if (calls.length >= 8) break;
  }

  // 4. Dossiers inactifs depuis 14 jours.
  const dormant = open
    .map((d) => ({ d, days: Math.floor((now - new Date(d.last_activity_at ?? d.updated_at).getTime()) / DAY) }))
    .filter((x) => x.days >= 14)
    .sort((a, b) => b.days - a.days);

  // 5. Récap financier.
  const fee = (d: (typeof allDeals)[number]) =>
    Number(d.fee_amount ?? (d.fee_pct && d.amount ? (Number(d.amount) * Number(d.fee_pct)) / 100 : 0)) || 0;
  const byStage = new Map<string, { n: number; amount: number; fees: number }>();
  let totalFees = 0;
  let weighted = 0;
  for (const d of open) {
    const s = byStage.get(d.stage) ?? { n: 0, amount: 0, fees: 0 };
    s.n += 1;
    s.amount += Number(d.amount ?? 0);
    s.fees += fee(d);
    byStage.set(d.stage, s);
    totalFees += fee(d);
    weighted += (fee(d) * (d.probability ?? 50)) / 100;
  }
  const upcoming = allDeals
    .filter((d) => d.expected_payment_at && !d.paid_at && d.stage !== "Perdu")
    .sort((a, b) => a.expected_payment_at!.localeCompare(b.expected_payment_at!));
  const inDays = (d: string, n: number) => new Date(d).getTime() <= now + n * DAY;
  const due30 = upcoming.filter((d) => inDays(d.expected_payment_at!, 30)).reduce((a, d) => a + fee(d), 0);
  const due90 = upcoming.filter((d) => inDays(d.expected_payment_at!, 90)).reduce((a, d) => a + fee(d), 0);
  const late = upcoming.filter((d) => new Date(d.expected_payment_at!).getTime() < now);

  // 6. Sourcing des dernières 24 h.
  const [{ data: comps }, { count: newContacts }] = await Promise.all([
    admin
      .from("comparables")
      .select("kind, city, surface, price, rent, price_m2, asset_class, excerpt")
      .gte("created_at", iso(now - DAY))
      .order("created_at", { ascending: false })
      .limit(8),
    admin
      .from("mailscan_candidates")
      .select("id", { count: "exact", head: true })
      .eq("status", "à valider")
      .gte("created_at", iso(now - DAY)),
  ]);

  // ---------- HTML ----------
  const td = 'style="padding:7px 9px;border-bottom:1px solid #e3e7ec;vertical-align:top;font-size:13px;"';
  const th = 'style="padding:7px 9px;text-align:left;background:#eef2f5;font-size:12px;"';
  const table = (heads: string[], rows: string[][], empty: string) =>
    rows.length
      ? `<table role="presentation" cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;color:#16212f;"><tr>${heads
          .map((h) => `<th ${th}>${h}</th>`)
          .join("")}</tr>${rows.map((r) => `<tr>${r.map((c) => `<td ${td}>${c}</td>`).join("")}</tr>`).join("")}</table>`
      : `<p style="color:#6b7684;font-size:13px;margin:4px 0;">${empty}</p>`;
  const section = (n: number, title: string, body: string) =>
    `<h3 style="font-size:15px;margin:26px 0 8px;color:#16212f;border-bottom:1px solid #16212f;padding-bottom:4px;">${n}. ${title}</h3>${body}`;
  const e = (s: string | null | undefined) => escapeHtml(s ?? "");

  const dateLabel = new Date().toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Paris" });
  const html = `<div style="font-family:Arial,Helvetica,sans-serif;background:#ffffff;padding:22px;max-width:780px;color:#16212f;">
<p style="letter-spacing:.14em;text-transform:uppercase;font-size:11px;color:#2a7f99;margin:0;">Walls Brokerage — Synthèse du jour</p>
<h2 style="margin:6px 0 4px;font-size:20px;">${e(dateLabel)}</h2>
<p style="margin:0 0 12px;color:#5d6773;font-size:14px;">${plural(unanswered.length, "mail sans réponse", "mails sans réponse")} · ${plural(relaunch.length, "relance suggérée", "relances suggérées")} · ${plural(calls.length, "appel suggéré", "appels suggérés")} · ${plural(dormant.length, "dossier dormant", "dossiers dormants")}</p>
${listenUrl ? `<p style="margin:10px 0 4px;"><a href="${listenUrl}" style="background:#16212f;color:#ffffff;padding:11px 18px;border-radius:4px;text-decoration:none;display:inline-block;font-size:14px;">▶ Écouter la synthèse</a></p>` : ""}
${section(1, "Mails importants sans réponse", table(
  ["Dossier", "De", "Objet", "Attente"],
  unanswered.map(({ m, days, tier }) => [
    e(dealName.get(m.deal_id!) ?? ""),
    e(m.from_name || m.from_email),
    m.web_link ? `<a href="${e(m.web_link)}" style="color:#2a7f99;">${e(m.subject || "(sans objet)")}</a>` : e(m.subject),
    `<b style="color:${tier >= 15 ? "#8b1e2d" : tier >= 7 ? "#a4622a" : "#16212f"};">${days} j</b>${tier >= 15 ? " — dernier rappel" : ""}`,
  ]),
  "Aucun mail en attente de réponse. Bravo.",
))}
${section(2, "Prospects à relancer", table(
  ["Contact", "Société", "Actif envoyé", "Envoi", "Lu"],
  relaunch.map((s) => [
    e(s.investors?.full_name ?? s.prospect_contacts?.full_name ?? s.email_to) + `<span style="display:block;color:#6b7684;font-size:12px;">${e(s.email_to)}${(s.investors?.phone ?? s.prospect_contacts?.phone) ? ` · ${e(s.investors?.phone ?? s.prospect_contacts?.phone)}` : ""}</span>`,
    e(s.investors?.company ?? s.prospect_contacts?.prospect_companies?.name ?? ""),
    e(s.assets?.title ?? ""),
    dshort(s.sent_at),
    s.opened_at ? `<b style="color:#1f7a4d;">oui, ${dshort(s.opened_at)}</b>` : "non",
  ]),
  "Aucune relance nécessaire.",
))}
${section(3, "Appels suggérés selon l'actualité", table(
  ["Société", "Actualité", "Qui appeler"],
  calls.map((c) => [
    `<b>${e(c.company)}</b><span style="display:block;color:#6b7684;font-size:12px;">${dshort(c.date)}</span>`,
    e(c.title),
    c.who ? `${e(c.who)}${c.phone ? `<br><a href="tel:${e(c.phone.replace(/\s/g, ""))}" style="color:#2a7f99;">${e(c.phone)}</a>` : ""}` : "—",
  ]),
  "Aucune actualité notable cette semaine sur vos contacts.",
))}
${section(4, "Dossiers inactifs depuis 14 jours", table(
  ["Dossier", "Étape", "Sans activité"],
  dormant.map(({ d, days }) => [e(d.name), e(d.stage), `${days} j`]),
  "Tous les dossiers en cours sont actifs.",
))}
${section(5, "Récap financier", `
<p style="font-size:14px;margin:4px 0 10px;">Honoraires potentiels en cours : <b>${eur(totalFees)}</b> · pondérés : <b>${eur(weighted)}</b><br>
Encaissements prévus sous 30 j : <b>${eur(due30)}</b> · sous 90 j : <b>${eur(due90)}</b>${late.length ? ` · <b style="color:#8b1e2d;">${plural(late.length, "encaissement en retard", "encaissements en retard")}</b>` : ""}</p>
${table(["Étape", "Dossiers", "Montant des actifs", "Honoraires"], [...byStage.entries()].map(([s, v]) => [e(s), String(v.n), eur(v.amount), eur(v.fees)]), "Aucun dossier en cours.")}
<p style="font-size:13px;margin:12px 0 4px;"><b>Prochaines échéances d'encaissement</b></p>
${table(["Échéance", "Dossier", "Honoraires"], upcoming.slice(0, 8).map((d) => [dshort(d.expected_payment_at), e(d.name), eur(fee(d))]), "Aucune échéance renseignée — ajoutez-les dans les fiches dossiers.")}`)}
${section(6, "Sourcing des dernières 24 h", `
<p style="font-size:13px;margin:4px 0 8px;">${plural(newContacts ?? 0, "nouveau contact détecté", "nouveaux contacts détectés")} à valider · ${plural(comps?.length ?? 0, "nouveau comparable", "nouveaux comparables")}</p>
${table(["Type", "Ville", "Surface", "Valeur", "Détail"], (comps ?? []).map((c) => [
  c.kind === "location" ? "Location" : "Vente",
  e(c.city ?? "—"),
  c.surface ? `${Math.round(Number(c.surface)).toLocaleString("fr-FR")} m²` : "—",
  c.kind === "location" ? (c.price_m2 ? `${Math.round(Number(c.price_m2))} €/m²/an` : "—") : c.price ? eur(Number(c.price)) : "—",
  e(c.excerpt.slice(0, 180)),
]), "Aucun nouveau comparable.")}`)}
<p style="margin-top:26px;color:#6b7684;font-size:12px;">Synthèse générée automatiquement par le CRM Walls Brokerage à partir de votre boîte Outlook. <a href="${APP_URL}/dossiers" style="color:#2a7f99;">Ouvrir les dossiers</a> · <a href="${APP_URL}/comparables" style="color:#2a7f99;">Comparables</a> · <a href="${APP_URL}/contacts-detectes" style="color:#2a7f99;">Contacts détectés</a></p>
</div>`;

  // ---------- Texte parlé façon Jarvis ----------
  const hour = Number(new Date().toLocaleString("fr-FR", { hour: "numeric", hour12: false, timeZone: "Europe/Paris" }));
  const parts: string[] = [];
  parts.push(`${hour < 18 ? "Bonjour" : "Bonsoir"} David. Voici votre point du ${dateLabel}.`);
  if (unanswered.length) {
    parts.push(`${plural(unanswered.length, "message important attend", "messages importants attendent")} votre réponse.`);
    for (const { m, days } of unanswered.slice(0, 5))
      parts.push(`${m.from_name || m.from_email}, sur le dossier ${dealName.get(m.deal_id!)}, depuis ${days} jours.`);
  } else parts.push("Aucun message en souffrance. Votre boîte est sous contrôle.");
  if (relaunch.length) {
    parts.push(`Je vous suggère de relancer ${plural(relaunch.length, "contact", "contacts")}.`);
    for (const s of relaunch.slice(0, 4))
      parts.push(`${s.investors?.full_name ?? s.prospect_contacts?.full_name ?? s.email_to}${s.opened_at ? ", qui a ouvert la brochure sans répondre" : ""}.`);
  }
  if (calls.length) {
    parts.push(`Côté actualité, ${plural(calls.length, "opportunité d'appel", "opportunités d'appel")}.`);
    for (const c of calls.slice(0, 3)) parts.push(`${c.company} : ${c.title.slice(0, 160)}${c.who ? `. Je vous propose d'appeler ${c.who}` : ""}.`);
  }
  if (dormant.length)
    parts.push(`${plural(dormant.length, "dossier sommeille", "dossiers sommeillent")} depuis plus de deux semaines, dont ${dormant[0]!.d.name}.`);
  parts.push(`Sur le plan financier, ${eur(totalFees)} d'honoraires potentiels sont en jeu, dont ${eur(due30)} attendus dans les trente prochains jours.`);
  if (late.length) parts.push(`Attention, ${plural(late.length, "encaissement est", "encaissements sont")} en retard.`);
  if ((comps?.length ?? 0) || newContacts)
    parts.push(`Enfin, j'ai relevé ${plural(comps?.length ?? 0, "comparable", "comparables")} et ${plural(newContacts ?? 0, "nouveau contact", "nouveaux contacts")} dans vos emails.`);
  parts.push("Ce sera tout pour le moment. Excellente journée, monsieur.");

  return {
    html,
    speech: parts.join(" ").replace(/€/g, " euros"),
    counts: { unanswered: unanswered.length, relaunch: relaunch.length, calls: calls.length, dormant: dormant.length },
    // Les rappels sont marqués par l'appelant après envoi réussi.
    ...({ _reminders: unanswered.map((u) => ({ mail_id: u.m.id, tier: u.tier })) } as object),
  } as Digest & { _reminders: { mail_id: string; tier: number }[] };
}
