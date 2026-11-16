// Rendu des modèles de mandats : champs {{clé}}, titres "#"/"##", **texte très apparent**.
export function addOneYear(iso: string): string {
  const [y = 0, m = 1, d = 1] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y + 1, m - 1, d));
  if (dt.getUTCMonth() !== m - 1) dt.setUTCDate(0); // 29 février → 28 février
  return dt.toISOString().slice(0, 10);
}

export function fillTemplate(body: string, values: Record<string, string | null | undefined>): string {
  return body.replace(/\{\{(\w+)\}\}/g, (all, k: string) => {
    const v = values[k];
    return v && v.trim() ? v : all;
  });
}

export function templateFields(body: string): string[] {
  return [...new Set([...body.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1] ?? ""))];
}

export const MENTION_MANDANT = "Lu et accepté, Bon pour Mandat";
export const MENTION_MANDATAIRE = "Lu et Mandat accepté";
export const ANCHOR_MANDANT = "\\sigmandant\\";
export const ANCHOR_MANDATAIRE = "\\sigmandataire\\";
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

function signaturesHtml(): string {
  const cell = (who: string, mention: string, anchor: string) =>
    `<td style="width:50%;vertical-align:top;padding:8px"><strong>${who}</strong><br><em>« ${mention} »</em><div style="height:70px"></div><span style="color:#ffffff;font-size:6pt">${esc(anchor)}</span></td>`;
  return `<table style="width:100%;margin-top:16px;border-collapse:collapse"><tr>${cell("LE MANDANT", MENTION_MANDANT, ANCHOR_MANDANT)}${cell("LE MANDATAIRE — WALLSBROKER", MENTION_MANDATAIRE, ANCHOR_MANDATAIRE)}</tr></table>`;
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

export function templateToHtml(body: string, title: string): string {
  const html = body
    .split(/\n{2,}/)
    .map((block) => {
      const b = block.trim();
      if (!b) return "";
      if (b === SIGNATURES) return signaturesHtml();
      if (b === "---") return '<hr style="page-break-after:always">';
      if (b.startsWith("# ")) return `<h1>${esc(b.slice(2))}</h1>`;
      if (b.startsWith("## ")) return `<h2>${esc(b.slice(3))}</h2>`;
      let t = esc(b).replace(/\*\*([\s\S]+?)\*\*/g, '<strong style="font-size:1.05em">$1</strong>');
      t = t.replace(/\{\{(\w+)\}\}/g, '<span style="background:#fff3a8">[$1]</span>');
      return `<p>${t.replace(/\n/g, "<br>")}</p>`;
    })
    .join("\n");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>body{font-family:Georgia,serif;font-size:11pt;line-height:1.45;max-width:720px;margin:24px auto;padding:0 16px}h1{text-align:center;font-size:16pt}h2{font-size:12pt;margin-top:18px}</style></head><body>${html}</body></html>`;
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
