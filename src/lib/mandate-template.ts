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
    return ["mandant", "honoraires", "charge_honoraires"].includes(k) ? `**${v.trim()}**` : v;
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

const HAND = "font-family:'Segoe Script','Bradley Hand','Brush Script MT','Lucida Handwriting',cursive;font-size:15pt;color:#1a2a6c";

function signaturesHtml(): string {
  const cell = (who: string, mention: string, anchor: string, align: string) =>
    `<td style="width:50%;vertical-align:top;padding:4px 8px;text-align:${align};${BASE}"><strong>${who}</strong><div style="height:80px;padding-top:8px">${anchorSpan(anchor)}</div><div style="${HAND};text-align:${align}">${mention}</div></td>`;
  return `<div style="page-break-inside:avoid"><table style="width:100%;border-collapse:collapse"><tr>${cell("LE MANDANT", "Bon pour mandat", ANCHOR_MANDANT, "left")}${cell("LE MANDATAIRE", "Mandat accepté", ANCHOR_MANDATAIRE, "right")}</tr></table><p style="${BASE};margin:8px 0 0">Mots rayés nuls :</p></div>`;
}

function initialsHtml(): string {
  const box = (anchor: string) => `<td style="width:52px;height:34px;border:1px solid #000000;padding:2px">${anchorSpan(anchor)}</td>`;
  return `<table style="width:100%;margin:14px 0 0;border-collapse:collapse"><tr>${box(ANCHOR_INIT_MANDANT)}<td></td>${box(ANCHOR_INIT_MANDATAIRE)}</tr></table>`;
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

const CHARS_PER_LINE = 95;
const LINES_PER_PAGE = 50;

const BASE = "font-family:'Times New Roman',Times,serif;font-size:12pt;line-height:1.35;color:#000000";
const P = `${BASE};text-align:justify;margin:0 0 10px`;

const fmt = (x: string) =>
  esc(x).replace(/\*\*([\s\S]+?)\*\*/g, "<strong>$1</strong>").replace(/\{\{(\w+)\}\}/g, '<span style="background:#fff3a8">[$1]</span>');
const RIGHT = `${BASE};text-align:right;margin:0 0 4px`;

function paragraphHtml(b: string): string {
  const out: string[] = [];
  let buf: string[] = [];
  const flush = () => { if (buf.length) out.push(`<p style="${P}">${buf.map(fmt).join("<br>")}</p>`); buf = []; };
  for (const raw of b.split("\n")) {
    const line = raw.trim();
    if (/^ci-après dénommée?/i.test(line)) {
      flush();
      const m = line.match(/^(.*?),?\s*(d'une part|d'autre part)[.,]?$/i);
      if (m) out.push(`<p style="${RIGHT};margin-top:10px">${fmt(m[1] ?? "")},</p><p style="${RIGHT};margin-bottom:14px">${fmt((m[2] ?? "").replace(/^d/, "D"))},</p>`);
      else out.push(`<p style="${RIGHT};margin:10px 0 14px">${fmt(line)}</p>`);
    } else if (/^[a-z]\)\s/.test(line)) {
      flush();
      out.push(`<p style="${P};margin:0 0 4px 18px;padding-left:18px;text-indent:-18px">${fmt(line)}</p>`);
    } else buf.push(raw);
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
  let sigPage = false; // pas de paraphes sur la page des signatures
  const pageBreak = () => { if (!sigPage) parts.push(initialsHtml()); parts.push('<div style="page-break-after:always"></div>'); used = 0; sigPage = false; };
  blocks.forEach((b, i) => {
    if (b === "---") { if (used > 0) pageBreak(); return; }
    let html: string;
    let lines: number;
    if (b === SIGNATURES) { html = signaturesHtml(); lines = 12; }
    else if (b.startsWith("# ")) { html = `<h1 style="${BASE};text-align:center;font-size:18pt;font-weight:bold;text-transform:uppercase;margin:18px 0 6px">${esc(b.slice(2))}</h1>`; lines = 3; }
    else if (/^Mandat établi/i.test(b)) { html = `<p style="${BASE};text-align:center;font-style:italic;font-size:11pt;margin:0 0 4px">${fmt(b)}</p><p style="${BASE};text-align:center;margin:0 0 24px">________________</p>`; lines = 4; }
    else if (/^##\s*ENTRE LES SOUSSIGN/i.test(b)) { html = `<p style="${BASE};font-weight:bold;margin:12px 0">${esc(b.slice(3).replace(/\s*:?$/, ""))} :</p>`; lines = 2; }
    else if (b.startsWith("## ")) { html = `<p style="${BASE};font-weight:bold;margin:16px 0 6px">${esc(b.slice(3))}</p>`; lines = 2; }
    else if (/^ET$/.test(b)) { html = `<p style="${BASE};font-weight:bold;margin:6px 0 12px">ET</p>`; lines = 2; }
    else if (/^IL A [EÉ]T[EÉ] CONVENU/i.test(b)) { html = `<p style="${BASE};text-align:center;font-weight:bold;text-decoration:underline;margin:22px 0 14px">${esc(b)}</p>`; lines = 3; }
    else if (/^Fait à/.test(b)) { html = `<p style="${BASE};text-align:center;margin:18px 0 22px">${fmt(b)}</p>`; lines = 3; }
    else if (b.startsWith("|")) { html = tableHtml(b); lines = b.split("\n").length * 2 + 1; }
    else if (i === 0) { html = `<p style="${BASE};text-align:center;font-size:10pt;margin:0 0 14px">${fmt(b)}</p>`; lines = 2; }
    else { html = paragraphHtml(b); lines = blockLines(b); }
    // Un titre ne reste jamais seul en bas de page.
    const next = blocks[i + 1] ?? "";
    const glue = b.startsWith("#") || next === SIGNATURES ? Math.min(next === SIGNATURES ? 12 : blockLines(next), 8) : 0;
    const need = lines + glue;
    if (used > 0 && used + need > LINES_PER_PAGE) pageBreak();
    parts.push(html);
    used += lines;
    if (b === SIGNATURES) sigPage = true;
  });
  if (!sigPage) parts.push(initialsHtml());
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:"Times New Roman",Times,serif;font-size:12pt;max-width:680px;margin:24px auto;padding:0 24px}</style></head><body style="${BASE};max-width:680px;margin:24px auto;padding:0 24px">${parts.join("\n")}</body></html>`;
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
