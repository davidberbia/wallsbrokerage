// Moteur PDF « modèle B&B » (16:9, charte WALLSBROKER). Rendu dans le navigateur :
// les images passent par un canvas (recadrage exact, conversion JPEG), le PDF par pdf-lib.
import { PDFDocument, rgb, type PDFFont, type PDFImage, type PDFPage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { BrochureData, BrochureMedia, RentalRow } from "./brochure-types";
import { computeAutoPointsCles, computeAverages, fmtNum, isIleDeFrance, parseAmt } from "./brochure-compute";

const W = 960;
const H = 540;
const hex = (h: string) => rgb(parseInt(h.slice(0, 2), 16) / 255, parseInt(h.slice(2, 4), 16) / 255, parseInt(h.slice(4, 6), 16) / 255);
const C = {
  navy: hex("222A35"),
  card: hex("2B3441"),
  line: hex("3A4452"),
  teal: hex("2E8FA8"),
  tealLight: hex("5FB8CC"),
  orange: hex("E07B3E"),
  white: hex("FFFFFF"),
  muted: hex("9AA6B4"),
  cream: hex("F3F0EA"),
  ink: hex("222A35"),
  inkSoft: hex("5B6573"),
};

type Fonts = { light: PDFFont; regular: PDFFont; medium: PDFFont };
type Ctx = { doc: PDFDocument; f: Fonts; n: number };

// ───────── Images (canvas) ─────────
function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => rej(new Error("image illisible"));
    i.src = src;
  });
}

/** Recadre (cover) ou ajuste (contain) une image et l'intègre au PDF. Renvoie le rectangle réellement occupé. */
async function placeImage(
  ctx: Ctx, page: PDFPage, media: BrochureMedia | null | undefined,
  x: number, y: number, w: number, h: number,
  mode: "cover" | "contain" = "cover",
  overlay?: (g: CanvasRenderingContext2D, cw: number, ch: number) => void,
): Promise<boolean> {
  if (!media?.dataUrl) return false;
  let img: HTMLImageElement;
  try { img = await loadImg(media.dataUrl); } catch { return false; }
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height;
  if (!iw || !ih) return false;
  const scale = 2.2;
  let dx = x, dy = y, dw = w, dh = h;
  if (mode === "contain") {
    const r = Math.min(w / iw, h / ih);
    dw = iw * r; dh = ih * r; dx = x + (w - dw) / 2; dy = y + (h - dh) / 2;
  }
  const cw = Math.max(1, Math.round(dw * scale)), ch = Math.max(1, Math.round(dh * scale));
  const cv = document.createElement("canvas");
  cv.width = cw; cv.height = ch;
  const g = cv.getContext("2d")!;
  g.fillStyle = "#ffffff"; g.fillRect(0, 0, cw, ch);
  if (mode === "cover") {
    const r = Math.max(cw / iw, ch / ih);
    const sw = cw / r, sh = ch / r;
    g.drawImage(img, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, cw, ch);
  } else {
    g.drawImage(img, 0, 0, cw, ch);
  }
  overlay?.(g, cw, ch);
  const jpg = cv.toDataURL("image/jpeg", 0.86);
  const pdfImg: PDFImage = await ctx.doc.embedJpg(jpg);
  page.drawImage(pdfImg, { x: dx, y: H - dy - dh, width: dw, height: dh });
  return true;
}

// ───────── Texte ─────────
function clean(font: PDFFont, s: string): string {
  const set = new Set(font.getCharacterSet());
  return String(s ?? "")
    .replace(/[\u202f\u2009]/g, "\u00a0")
    .replace(/[\u2018\u2019]/g, "’")
    .split("")
    .map((ch) => (ch === "\n" || set.has(ch.codePointAt(0)!) ? ch : ch === "\u00a0" ? " " : ""))
    .join("");
}

function wrap(font: PDFFont, s: string, size: number, maxW: number): string[] {
  const out: string[] = [];
  for (const para of clean(font, s).split("\n")) {
    const words = para.split(/ +/);
    let line = "";
    for (const w of words) {
      const t = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(t, size) <= maxW || !line) line = t;
      else { out.push(line); line = w; }
    }
    out.push(line);
  }
  return out;
}

type TOpt = { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; maxW?: number; lh?: number; align?: "left" | "right" | "center"; maxLines?: number };
/** Écrit un texte (y = haut de la première ligne). Renvoie la hauteur utilisée. */
function text(ctx: Ctx, page: PDFPage, s: string, x: number, y: number, o: TOpt = {}): number {
  const font = o.font ?? ctx.f.light;
  const size = o.size ?? 10;
  const lh = o.lh ?? size * 1.45;
  let lines = o.maxW ? wrap(font, s, size, o.maxW) : [clean(font, s)];
  if (o.maxLines && lines.length > o.maxLines) {
    lines = lines.slice(0, o.maxLines);
    lines[lines.length - 1] = (lines[lines.length - 1] ?? "").replace(/\s*\S*$/, "") + "…";
  }
  lines.forEach((ln, i) => {
    const tw = font.widthOfTextAtSize(ln, size);
    const lx = o.align === "right" ? x - tw : o.align === "center" ? x - tw / 2 : x;
    page.drawText(ln, { x: lx, y: H - y - size * 0.82 - i * lh, size, font, color: o.color ?? C.white });
  });
  return lines.length * lh;
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, color: ReturnType<typeof rgb>) {
  page.drawRectangle({ x, y: H - y - h, width: w, height: h, color });
}

// ───────── Gabarits de page ─────────
function newPage(ctx: Ctx, bg: ReturnType<typeof rgb>): PDFPage {
  const p = ctx.doc.addPage([W, H]);
  rect(p, 0, 0, W, H, bg);
  ctx.n += 1;
  return p;
}

function footer(ctx: Ctx, p: PDFPage, dark = true) {
  const col = dark ? C.muted : C.inkSoft;
  text(ctx, p, "WALLSBROKER · Opportunité d’investissement · Document confidentiel et non contractuel", 40, 512, { size: 5.5, color: col });
  text(ctx, p, `— ${String(ctx.n).padStart(2, "0")}`, 920, 512, { size: 6, color: col, align: "right" });
}

function heading(ctx: Ctx, p: PDFPage, title: string, sub: string, x = 40, y = 28, dark = true) {
  rect(p, x, y, 14, 2, C.orange);
  text(ctx, p, title, x, y + 10, { size: 18, color: dark ? C.white : C.ink, font: ctx.f.light });
  if (sub) text(ctx, p, sub, x, y + 34, { size: 7, color: C.teal, font: ctx.f.regular });
}

function sideTitle(ctx: Ctx, p: PDFPage, title: string, sub: string) {
  rect(p, 0, 0, 205, H, C.navy);
  rect(p, 40, 210, 14, 2, C.orange);
  const h = text(ctx, p, title, 40, 222, { size: 17, color: C.white, maxW: 140, lh: 21 });
  if (sub) text(ctx, p, sub, 40, 230 + h, { size: 6.5, color: C.teal, font: ctx.f.regular, maxW: 140 });
  footer(ctx, p);
}

// ───────── Données ─────────
const val = (s?: string) => (s ?? "").toString().trim();
const withUnit = (s: string, u: string) => (!s ? "" : !u || s.includes(u) || (u === "m²" && /m2/i.test(s)) ? s : `${s} ${u}`);
const years = (s?: string) => (!val(s) ? "" : /an/i.test(val(s)) ? val(s) : `${val(s)} ans`);
const cityLine = (d: BrochureData) => [val(d.adresse), [val(d.codePostal), val(d.ville)].filter(Boolean).join(" ")].filter(Boolean).join(" · ");

function metrics(d: BrochureData) {
  const avg = computeAverages(d.locataires || []);
  const auto = computeAutoPointsCles({ locataires: d.locataires || [], prixVente: d.prixVente, honoraires: d.honoraires, codePostal: d.codePostal, nbParkings: d.nbParkings });
  const surface = avg.totalSurface > 0 ? `${fmtNum(avg.totalSurface)} m²` : withUnit(val(d.surface), "m²");
  const loyerN = avg.totalLoyer > 0 ? avg.totalLoyer : parseAmt(d.loyerAnnuel);
  const loyer = Number.isFinite(loyerN) && loyerN > 0 ? `${fmtNum(loyerN)} €` : "";
  const prixN = parseAmt(d.prixVente);
  const honos = parseAmt(d.honoraires) || 0;
  const droitsRate = isIleDeFrance(d.codePostal) ? 0.08 : 0.075;
  const aem = Number.isFinite(prixN) ? prixN * (1 + droitsRate) + honos : NaN;
  const rdt = Number.isFinite(aem) && aem > 0 && loyerN > 0 ? `${fmtNum((loyerN / aem) * 100, 2)} %` : "";
  const tenants = (d.locataires || []).filter((r) => val(r.enseigne) && !/vacant|libre/i.test(r.enseigne));
  return { surface, loyer, loyerN, prixN, honos, droitsRate, aem, rdt, loyerM2: auto.values[1], walb: years(avg.walb), tenants };
}

// ───────── Pages ─────────
async function cover(ctx: Ctx, d: BrochureData) {
  const p = newPage(ctx, C.navy);
  await placeImage(ctx, p, d.photoCouverture, 0, 0, W, H, "cover", (g, cw, ch) => {
    // Voile bleu nuit uniquement (charte), plus dense à gauche et en bas pour la lisibilité.
    const lr = g.createLinearGradient(0, 0, cw, 0);
    lr.addColorStop(0, "rgba(34,42,53,0.92)");
    lr.addColorStop(0.5, "rgba(34,42,53,0.6)");
    lr.addColorStop(1, "rgba(34,42,53,0.05)");
    g.fillStyle = lr; g.fillRect(0, 0, cw, ch);
    const tb = g.createLinearGradient(0, ch * 0.6, 0, ch);
    tb.addColorStop(0, "rgba(34,42,53,0)");
    tb.addColorStop(1, "rgba(34,42,53,0.7)");
    g.fillStyle = tb; g.fillRect(0, 0, cw, ch);
  });
  text(ctx, p, "WALLSBROKER", 40, 36, { size: 11, font: ctx.f.regular });
  rect(p, 40, 52, 92, 0.8, C.white);
  rect(p, 40, 160, 22, 2, C.orange);
  const kind = val(d.typeBien) || "Commerce";
  text(ctx, p, `OPPORTUNITÉ D’INVESTISSEMENT · ${kind.toUpperCase()}`, 40, 172, { size: 7, color: C.orange, font: ctx.f.regular });
  const th = text(ctx, p, val(d.nomSite) || kind, 40, 190, { size: 34, maxW: 470, lh: 38, maxLines: 2 });
  let y = 190 + th;
  if (val(d.ville) && !(val(d.nomSite) || "").toLowerCase().includes(val(d.ville).toLowerCase())) y += text(ctx, p, d.ville, 40, y + 2, { size: 20 }) + 10;
  const addr = cityLine(d);
  if (addr) text(ctx, p, addr, 40, y + 6, { size: 8.5, maxW: 420 });
  // Règle Wallsbrokerage : aucun chiffre en page de garde.
}

function keyPoints(ctx: Ctx, d: BrochureData, m: ReturnType<typeof metrics>) {
  const items: [string, string, string][] = [];
  if (m.surface) items.push([m.surface, "SURFACE TOTALE", m.tenants.length ? `${m.tenants.length} locataire${m.tenants.length > 1 ? "s" : ""}` : ""]);
  if (m.loyer) items.push([m.loyer, "LOYER HC-HT / AN", m.loyerM2 ? `soit ${m.loyerM2}` : ""]);
  if (m.rdt) items.push([m.rdt, "RENDEMENT AEM", "droits et honoraires inclus"]);
  if (m.tenants.length) items.push([String(m.tenants.length), "ENSEIGNES EN PLACE", m.tenants.slice(0, 3).map((t) => t.enseigne).join(" · ")]);
  if (val(d.nbParkings)) items.push([val(d.nbParkings), "PLACES DE PARKING", ""]);
  if (m.walb) items.push([m.walb, "DURÉE FERME RESTANTE", "WALB moyenne"]);
  if (!items.length) return;
  const p = newPage(ctx, C.navy);
  const pts = (d.pointsCles || []).map(val).filter(Boolean);
  heading(ctx, p, "Les points clés de l’investissement", pts[0] || val(d.nomSite));
  const list = items.slice(0, 6);
  const cols = 3, gap = 14, cw = (880 - gap * 2) / cols, chh = 150;
  list.forEach(([v, l, s], i) => {
    const x = 40 + (i % cols) * (cw + gap);
    const y = 90 + Math.floor(i / cols) * (chh + gap);
    rect(p, x, y, cw, chh, C.card);
    rect(p, x, y, cw, 2, C.teal);
    text(ctx, p, v, x + 22, y + 36, { size: 28, maxW: cw - 40, maxLines: 1 });
    text(ctx, p, l, x + 22, y + 80, { size: 7, color: C.tealLight, font: ctx.f.regular });
    if (s) text(ctx, p, s, x + 22, y + 95, { size: 6.5, color: C.muted, maxW: cw - 44, maxLines: 2 });
  });
  footer(ctx, p);
}

async function location(ctx: Ctx, d: BrochureData) {
  if (!d.carteRegion && !val(d.descriptionVille)) return;
  const p = newPage(ctx, C.cream);
  heading(ctx, p, "Localisation", [val(d.ville), val(d.codePostal)].filter(Boolean).join(" · "), 40, 28, false);
  text(ctx, p, val(d.descriptionVille), 40, 110, { size: 8.5, color: C.ink, maxW: 300, lh: 14, maxLines: 18 });
  const acc = (d.accessibilite || []).map(val).filter(Boolean);
  if (acc[0]) {
    rect(p, 40, 380, 1.5, 44, C.teal);
    text(ctx, p, acc[0], 52, 382, { size: 12, color: C.ink, maxW: 280, maxLines: 1 });
    if (acc[1]) text(ctx, p, acc[1], 52, 402, { size: 6.5, color: C.teal, maxW: 280, maxLines: 2 });
  }
  if (!(await placeImage(ctx, p, d.carteRegion, 410, 0, 550, H, "cover"))) rect(p, 410, 0, 550, H, C.card);
  footer(ctx, p, false);
}

async function catchment(ctx: Ctx, d: BrochureData) {
  const r = d.revenus || ({} as BrochureData["revenus"]);
  const rev: [string, string][] = [
    ["Célibataire", r.celibataire], ["Couple avec 1 enfant", r.coupleUnEnfant],
    ["Couple sans enfants", r.coupleSansEnfants], ["Couple avec 2 enfants", r.coupleDeuxEnfants],
    ["Famille monoparentale", r.familleMonoparentale], ["Couple avec 3 enfants", r.coupleTroisEnfants],
  ].map(([a, b]) => [a, val(b)] as [string, string]);
  const hasRev = rev.some(([, v]) => v);
  if (!d.chalandiseImage && !val(d.populationZone1) && !hasRev) return;
  const p = newPage(ctx, C.navy);
  if (!(await placeImage(ctx, p, d.chalandiseImage, 0, 0, 470, H, "cover"))) rect(p, 0, 0, 470, H, C.card);
  const x = 500;
  heading(ctx, p, "Zone de chalandise", `Isochrones ${d.modeChalandise === "pieton" ? "à pied" : "en voiture"}`, x);
  const zones = [[d.dureeZone1, d.populationZone1, C.teal], [d.dureeZone2, d.populationZone2, C.orange]] as const;
  zones.forEach(([min, pop, col], i) => {
    if (!val(pop)) return;
    const cx = x + i * 214;
    rect(p, cx, 90, 200, 80, C.card);
    p.drawCircle({ x: cx + 18, y: H - 108, size: 3, color: col });
    text(ctx, p, `HABITANTS À ${min || "—"} MIN`, cx + 28, 104, { size: 6, color: C.muted, font: ctx.f.regular });
    text(ctx, p, withUnit(val(pop), ""), cx + 16, 126, { size: 22 });
  });
  if (hasRev) {
    text(ctx, p, `REVENUS DES MÉNAGES${val(d.ville) ? ` À ${d.ville.toUpperCase()}` : ""} (NETS / MOIS)`, x, 196, { size: 6.5, color: C.tealLight, font: ctx.f.regular, maxW: 420 });
    rev.forEach(([l, v], i) => {
      const cx = x + (i % 2) * 214, cy = 220 + Math.floor(i / 2) * 34;
      text(ctx, p, l, cx, cy, { size: 7 });
      text(ctx, p, withUnit(v, "€") || "—", cx + 196, cy, { size: 7, align: "right" });
      rect(p, cx, cy + 16, 196, 0.5, C.line);
    });
  }
  footer(ctx, p);
}

async function access(ctx: Ctx, d: BrochureData) {
  if (!d.accessibiliteCarte) return;
  const p = newPage(ctx, C.cream);
  const acc = (d.accessibilite || []).map(val).filter(Boolean);
  heading(ctx, p, "Accessibilité immédiate", acc[0] || val(d.adresse), 40, 28, false);
  rect(p, 176, 96, 608, 384, C.white);
  await placeImage(ctx, p, d.accessibiliteCarte, 180, 100, 600, 376, "cover");
  if (acc.length > 1) {
    let y = 110;
    for (const a of acc.slice(1, 6)) {
      rect(p, 800, y + 3, 6, 1.5, C.orange);
      y += text(ctx, p, a, 812, y, { size: 7, color: C.ink, maxW: 120, maxLines: 3 }) + 10;
    }
  }
  footer(ctx, p, false);
}

function presentation(ctx: Ctx, d: BrochureData, m: ReturnType<typeof metrics>) {
  const rows: RentalRow[] = (d.locataires || []).filter((r) => val(r.enseigne) || val(r.surface) || val(r.loyerAnnuel));
  const desc = val(d.descriptionActif) || (d.pointsCles || []).map(val).filter(Boolean).join(". ");
  if (!rows.length && !desc) return;
  const p = newPage(ctx, C.navy);
  heading(ctx, p, "Présentation de l’actif", [val(d.typeBien), val(d.nomSite)].filter(Boolean).join(" · "));
  const descMax = rows.length > 6 ? 5 : 10;
  text(ctx, p, desc, 40, 90, { size: 8, maxW: 450, lh: 13, maxLines: descMax });
  const facts: [string, string][] = [];
  if (m.surface) facts.push(["SURFACE TOTALE", m.surface]);
  const vac = rows.filter((r) => /vacant|libre/i.test(r.enseigne)).reduce((s, r) => s + (parseAmt(r.surface) || 0), 0);
  if (vac > 0) facts.push(["SURFACE VACANTE", `${fmtNum(vac)} m²`]);
  if (val(d.nbParkings)) facts.push(["STATIONNEMENT", `${val(d.nbParkings)} places`]);
  if (m.walb) facts.push(["WALB MOYENNE", m.walb]);
  facts.slice(0, 4).forEach(([l, v], i) => {
    const y = 92 + i * 30;
    text(ctx, p, l, 560, y, { size: 6.5, color: C.muted, font: ctx.f.regular });
    text(ctx, p, v, 920, y, { size: 8, align: "right" });
    rect(p, 560, y + 16, 360, 0.5, C.line);
  });
  if (!rows.length) return footer(ctx, p);
  const top = rows.length > 6 ? 200 : 260;
  text(ctx, p, "ÉTAT LOCATIF", 40, top, { size: 7, color: C.muted, font: ctx.f.regular });
  const cols: [string, number, (r: RentalRow) => string][] = [
    ["PRENEUR", 40, (r) => r.enseigne],
    ["SURFACE", 250, (r) => withUnit(val(r.surface), "m²")],
    ["LOYER HC-HT", 340, (r) => withUnit(val(r.loyerAnnuel), "€")],
    ["LOYER / M²", 440, (r) => withUnit(val(r.loyerM2), "€")],
    ["DÉBUT", 520, (r) => val(r.debutBail)],
    ["BREAK", 600, (r) => val(r.prochainBreak)],
    ["FIN", 680, (r) => val(r.finBail)],
    ["WALB", 760, (r) => years(r.walb)],
    ["WALT", 840, (r) => years(r.walt)],
  ];
  const ty = top + 16;
  rect(p, 40, ty, 880, 18, C.teal);
  cols.forEach(([h, x]) => text(ctx, p, h, x + 8, ty + 6, { size: 6, font: ctx.f.regular }));
  const rowH = Math.min(22, (470 - ty - 40) / (rows.length + 1));
  const fs = rowH < 18 ? 6.5 : 7.5;
  rows.forEach((r, i) => {
    const y = ty + 18 + i * rowH;
    cols.forEach(([, x, get], ci) => text(ctx, p, get(r) || "—", x + 8, y + (rowH - fs) / 2, { size: fs, color: ci === 2 ? C.orange : C.white, maxW: ci === 0 ? 200 : 76, maxLines: 1 }));
    rect(p, 40, y + rowH, 880, 0.5, C.line);
  });
  if (rows.length > 1 && m.loyer) {
    const y = ty + 18 + rows.length * rowH;
    text(ctx, p, "TOTAL", 48, y + (rowH - fs) / 2, { size: fs, color: C.orange, font: ctx.f.regular });
    text(ctx, p, m.surface, 258, y + (rowH - fs) / 2, { size: fs, color: C.orange });
    text(ctx, p, m.loyer, 348, y + (rowH - fs) / 2, { size: fs, color: C.orange });
  }
  footer(ctx, p);
}

async function sideImages(ctx: Ctx, title: string, sub: string, media: BrochureMedia[]) {
  const list = media.filter((x) => x?.dataUrl);
  for (let i = 0; i < list.length; i += 2) {
    const p = newPage(ctx, C.white);
    sideTitle(ctx, p, title, list[i]?.title?.replace(/^Plan\s*—\s*/i, "") || sub);
    const pair = list.slice(i, i + 2);
    if (pair.length === 1) await placeImage(ctx, p, pair[0], 230, 30, 705, 470, "contain");
    else for (let k = 0; k < 2; k++) await placeImage(ctx, p, pair[k], 230 + k * 360, 40, 345, 450, "contain");
  }
}

async function photos(ctx: Ctx, d: BrochureData) {
  const excl = new Set(d.photosExclues || []);
  const list = (d.photos || []).filter((x) => x?.dataUrl && !excl.has(x.name));
  for (let i = 0; i < list.length; i += 3) {
    const p = newPage(ctx, C.navy);
    heading(ctx, p, "Reportage photos", i === 0 ? val(d.nomSite) : "");
    const g = list.slice(i, i + 3);
    if (g.length === 1) await placeImage(ctx, p, g[0], 40, 90, 880, 400);
    else if (g.length === 2) { await placeImage(ctx, p, g[0], 40, 90, 434, 400); await placeImage(ctx, p, g[1], 486, 90, 434, 400); }
    else {
      await placeImage(ctx, p, g[0], 40, 90, 560, 400);
      await placeImage(ctx, p, g[1], 612, 90, 308, 194);
      await placeImage(ctx, p, g[2], 612, 296, 308, 194);
    }
    footer(ctx, p);
  }
}

function conditions(ctx: Ctx, d: BrochureData, m: ReturnType<typeof metrics>) {
  const p = newPage(ctx, C.navy);
  heading(ctx, p, "Conditions de la vente", val(d.typeVente) || "Vente de gré à gré");
  const fmt = (n: number) => `${fmtNum(n)} €`;
  const rows: [string, string][] = [];
  if (d.nousConsulter || !Number.isFinite(m.prixN)) rows.push(["Prix net vendeur", "Nous consulter"]);
  else {
    rows.push(["Prix net vendeur", fmt(m.prixN)]);
    if (m.honos > 0) rows.push(["Honoraires d’agence", fmt(m.honos)]);
    rows.push([`Droits de mutation (${String(m.droitsRate * 100).replace(".", ",")} %)`, fmt(m.prixN * m.droitsRate)]);
  }
  rows.forEach(([l, v], i) => {
    const y = 120 + i * 40;
    text(ctx, p, l, 40, y, { size: 8.5 });
    text(ctx, p, v, 520, y, { size: 8.5, align: "right" });
    rect(p, 40, y + 22, 480, 0.5, C.line);
  });
  if (!d.nousConsulter && Number.isFinite(m.aem)) {
    const y = 120 + rows.length * 40 + 10;
    rect(p, 40, y, 480, 34, C.teal);
    text(ctx, p, "PRIX ACTE EN MAIN", 56, y + 13, { size: 7.5, font: ctx.f.regular });
    text(ctx, p, fmt(m.aem), 504, y + 9, { size: 14, align: "right" });
  }
  text(ctx, p, "Prix hors droits et hors taxes. Honoraires à la charge de l’acquéreur.", 40, 440, { size: 6, color: C.muted });
  if (m.rdt && !d.nousConsulter) {
    rect(p, 560, 120, 360, 190, C.card);
    rect(p, 560, 120, 360, 2, C.teal);
    text(ctx, p, "RENDEMENT ACTE EN MAIN", 584, 142, { size: 6.5, color: C.tealLight, font: ctx.f.regular });
    text(ctx, p, m.rdt, 584, 168, { size: 44 });
    text(ctx, p, [m.loyer && `${m.loyer} HC-HT`, Number.isFinite(m.aem) && `${fmt(m.aem)} AEM`].filter(Boolean).join(" / "), 584, 236, { size: 6.5, color: C.muted, maxW: 310 });
  }
  footer(ctx, p);
}

async function fixedPage(ctx: Ctx, media: BrochureMedia | null | undefined, fallback: string) {
  // Pages fixes de la brochure B&B si aucune image n'est réglée (ou si le réglage est un PPTX).
  if (!media?.dataUrl || !/^data:image\//.test(media.dataUrl)) media = { dataUrl: fallback, name: fallback };
  const p = newPage(ctx, C.navy);
  await placeImage(ctx, p, media, 0, 0, W, H, "cover");
}

async function loadFonts(doc: PDFDocument): Promise<Fonts> {
  doc.registerFontkit(fontkit);
  const get = async (n: string) => doc.embedFont(await (await fetch(`/fonts/Outfit-${n}.ttf`)).arrayBuffer(), { subset: true });
  return { light: await get("Light"), regular: await get("Regular"), medium: await get("Medium") };
}

/** Génère la brochure PDF modèle B&B pour un actif (+ actifs de portefeuille éventuels). */
export async function renderBrochurePdf(data: BrochureData): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.setTitle(`Brochure ${data.nomSite || data.adresse || ""}`);
  doc.setAuthor("WALLSBROKER");
  const ctx: Ctx = { doc, f: await loadFonts(doc), n: 0 };
  const assets = [data, ...(data.portfolioAssets || []).filter(Boolean)];
  for (const d of assets) {
    const m = metrics(d);
    await cover(ctx, d);
    keyPoints(ctx, d, m);
    await location(ctx, d);
    await catchment(ctx, d);
    await access(ctx, d);
    presentation(ctx, d, m);
    if (d.planMasse) await sideImages(ctx, "Plan de masse", "Implantation", [d.planMasse]);
    await sideImages(ctx, "Plans", "Plans de l’actif", d.plans || []);
    await photos(ctx, d);
    await sideImages(ctx, "Perspectives", "", d.perspectives || []);
    conditions(ctx, d, m);
  }
  await fixedPage(ctx, data.settings?.fixedConfidentialiteSlide, "/brochure/confidentialite.jpg");
  await fixedPage(ctx, data.settings?.fixedAProposSlide, "/brochure/a-propos.jpg");
  return doc.save();
}
