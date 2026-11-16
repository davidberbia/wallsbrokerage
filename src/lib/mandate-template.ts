// Rendu des modèles de mandats : champs {{clé}}, titres "#"/"##", **texte très apparent**.
export function addOneYear(iso: string): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y + 1, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) dt.setUTCDate(0); // 29 février → 28 février
  return dt.toISOString().slice(0, 10);
}

export function fillTemplate(body: string, values: Record<string, string | null | undefined>): string {
  body = cleanTemplate(body);
  // Médiateur facultatif : sans valeur, la phrase qui le cite est retirée.
  if (!values["mediateur"]) body = body.replace(/^[^\n]*\{\{mediateur\}\}[^\n]*\n?/gm, "");
  // Portefeuille : l'état locatif est inséré sous la désignation.
  const etat = values["etat_locatif"];
  if (etat) body = body.replace(/^([^\n]*\{\{designation\}\}[^\n]*)$/m, `$1\n\n${etat}`);
  return body.replace(/\{\{(\w+)\}\}/g, (all, k: string) => {
    const v = values[k];
    if (!v || !v.trim()) return all;
    return k === "mandant" ? `**${v.trim()}**` : v;
  });
}

/** Retire le formulaire de rétractation et met en gras le nom du Mandataire. */
export function cleanTemplate(body: string): string {
  return body
    .replace(/\n-{3}\s*\n+##\s*FORMULAIRE DE RÉTRACTATION[\s\S]*$/i, "\n")
    .replace(/\n##\s*FORMULAIRE DE RÉTRACTATION[\s\S]*$/i, "\n")
    .replace(/ Il peut utiliser le formulaire ci-dessous ou toute autre déclaration dénuée d'ambiguïté\./g, " Il peut l'exercer par toute déclaration dénuée d'ambiguïté.")
    .replace(/(^|\n)La société WALLSBROKER(?!\*)/g, "$1**La société WALLSBROKER**");
}

export function templateFields(body: string): string[] {
  return [...new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? ""))];
}

export const MENTION_MANDANT = "Lu et accepté, Bon pour Mandat";
export const MENTION_MANDATAIRE = "Lu et Mandat accepté";
export const ANCHOR_MANDANT = "\\sigmandant\\";
export const ANCHOR_MANDATAIRE = "\\sigmandataire\\";
export const ANCHOR_INIT_MANDANT = "\\inimandant\\";
export const ANCHOR_INIT_MANDATAIRE = "\\inimandataire\\";
const SIGNATURES = "[[SIGNATURES]]";

/** Remplace les anciennes mentions des modèles par le bloc de signatures Mandant / Mandataire. */
export function withSignatures(body: string): string {
  const lines = body.split("\n");
  const idx = lines.findIndex((l) => /LE MANDANT\s*$/.test(l) || /^«\s*Lu et/.test(l));
  const kept = lines.filter((l) => !(/^«\s*Lu et/.test(l) && /LE MANDA(NT|TAIRE)\s*$/.test(l)));
  if (idx < 0) return `${body}\n\n${SIGNATURES}`;
  kept.splice(idx, 0, `\n${SIGNATURES}\n`);
  return kept.join("\n");
}

const anchorSpan = (a: string) => `<span style="color:#ffffff;font-size:6pt">${esc(a)}</span>`;
const BOX = "border:1px solid #9a9a9a;border-radius:4px";

function signaturesHtml(): string {
  const cell = (who: string, mention: string, anchor: string) =>
    `<td style="width:50%;vertical-align:top;padding:8px"><strong>${who}</strong><div style="margin:6px 0;min-height:44px">Mention :<br><em>« ${mention} »</em></div><div style="${BOX};height:90px;padding:6px;font-size:9pt;color:#777">Signature<br><br>${anchorSpan(anchor)}</div><div style="margin-top:6px;font-size:10pt">Date : ____________</div></td>`;
  return `<table style="width:100%;margin-top:16px;border-collapse:collapse;page-break-inside:avoid"><tr>${cell("LE MANDANT", MENTION_MANDANT, ANCHOR_MANDANT)}${cell("LE MANDATAIRE — WALLSBROKER", MENTION_MANDATAIRE, ANCHOR_MANDATAIRE)}</tr></table>`;
}

function initialsHtml(): string {
  const cell = (who: string, anchor: string) =>
    `<td style="width:50%;padding:4px 8px"><div style="${BOX};height:44px;padding:4px;font-size:8pt;color:#777">Paraphe ${who}<br>${anchorSpan(anchor)}</div></td>`;
  return `<table style="width:100%;margin-top:12px;border-collapse:collapse"><tr>${cell("Mandant", ANCHOR_INIT_MANDANT)}${cell("Mandataire", ANCHOR_INIT_MANDATAIRE)}</tr></table>`;
}

function tableHtml(block: string): string {
  const rows = block.split("\n").filter((l) => l.trim().startsWith("|")).map((l) => l.trim().replace(/^\||\|$/g, "").split("|").map((c) => esc(c.trim())));
  const [head = [], ...body] = rows;
  const td = "border:1px solid #9a9a9a;padding:4px 6px;font-size:11pt;text-align:left";
  return `<table style="width:100%;border-collapse:collapse;margin:8px 0"><tr>${head.map((c) => `<th style="${td};background:#eeeeee">${c}</th>`).join("")}</tr>${body.map((r) => `<tr>${r.map((c) => `<td style="${td}">${c}</td>`).join("")}</tr>`).join("")}</table>`;
}

/** Choisit le modèle selon le type de mandat et l'exclusivité de l'actif. */
export function templateKind(type?: string | null): string {
  const t = (type ?? "").toLowerCase();
  if (t.includes("fonds")) return "cession_fonds";
  if (t.includes("bail")) return "cession_bail";
  if (t.includes("recherche")) return "recherche";
  if (t.includes("locat")) return "location";
  return "vente";
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const CHARS_PER_LINE = 80;
const LINES_PER_PAGE = 46;

function paragraphHtml(b: string): string {
  const fmt = (x: string) =>
    esc(x).replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>").replace(/\{\{(\w+)\}\}/g, '<span style="background:#fff3a8">[$1]</span>');
  const out: string[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) out.push(`<p>${buf.map(fmt).join("<br>")}</p>`); buf = []; };
  for (const line of b.split("\n")) {
    if (/^ci-après dénommée?/i.test(line.trim())) { flush(); out.push(`<p style="text-align:right;margin-top:-6px">${fmt(line.trim())}</p>`); }
    else buf.push(line);
  }
  flush();
  return out.join("");
}

const blockLines = (b: string) =>
  b.split("\n").reduce((n, l) => n + Math.max(1, Math.ceil(l.length / CHARS_PER_LINE)), 0) + 1;

export function templateToHtml(body: string, title: string): string {
  const blocks = body.split(/\n{2,}/).map((b) => b.trim()).filter(Boolean);
  const parts: string[] = [];
  let used = 0;
  const pageBreak = () => { parts.push(initialsHtml(), '<div style="page-break-after:always"></div>'); used = 0; };
  blocks.forEach((b, i) => {
    if (b === "---") { if (used > 0) pageBreak(); return; }
    let html: string;
    let lines: number;
    if (b === SIGNATURES) { html = signaturesHtml(); lines = 9; }
    else if (b.startsWith("# ")) { html = `<h1>${esc(b.slice(2))}</h1>`; lines = 3; }
    else if (b.startsWith("## ")) { html = `<h2>${esc(b.slice(3))}</h2>`; lines = 3; }
    else if (b.startsWith("|")) { html = tableHtml(b); lines = b.split("\n").length * 2 + 1; }
    else if (i === 0) { html = `<p style="text-align:center"><strong>${esc(b)}</strong></p>`; lines = 2; }
    else { html = paragraphHtml(b); lines = blockLines(b); }
    // Un titre ne reste jamais seul en bas de page.
    const next = blocks[i + 1] ?? "";
    const glue = b.startsWith("#") || next === SIGNATURES ? Math.min(next === SIGNATURES ? 9 : blockLines(next), 8) : 0;
    const need = lines + glue;
    if (used > 0 && used + need > LINES_PER_PAGE) pageBreak();
    parts.push(html);
    used += lines;
  });
  parts.push(initialsHtml());
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Georgia,serif;font-size:13pt;line-height:1.45;max-width:720px;margin:24px auto;padding:0 16px}p{text-align:justify;margin:0 0 10px}h1{text-align:center;font-size:18pt}h2{font-size:14pt;margin-top:18px}</style></head><body>${parts.join("\n")}</body></html>`;
}

export const FEE_PAYERS = ["Mandant", "Acquéreur", "Preneur"] as const;
/** Honoraires lisibles pour les mandats : "5 % HT du prix" ou "25 000 € HT". */
export function feeText(mode?: string | null, value?: number | null): string {
  if (value == null || !mode) return "";
  const n = value.toLocaleString("fr-FR");
  return mode === "pct" ? `${n} % HT du prix` : `${n} € HT`;
}
export function feeChargeText(payer?: string | null): string {
  if (!payer) return "";
  return payer === "Acquéreur" ? "à la charge de l'acquéreur" : `à la charge du ${payer.toLowerCase()}`;
}
