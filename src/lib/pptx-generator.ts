// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import PptxGenJSImport from "pptxgenjs";
import type PptxGenJSType from "pptxgenjs";
import { deflateSync } from "node:zlib";
const PptxGenJS = ((PptxGenJSImport as unknown as { default?: typeof PptxGenJSImport }).default ?? PptxGenJSImport) as typeof PptxGenJSImport;
type Slide = PptxGenJSType.Slide;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TableRow = any;
import type { BrochureData } from "./brochure-types";

// WALLSBROKER palette
const NAVY = "222A35";
const NAVY_LIGHT = "2E3A4A";
const TEAL = "2E8FA8";
const TEAL_LIGHT = "5FB8CC";
const ORANGE = "E07B3E";
const GREEN = "2E8FA8"; // teal charte (étiquette page de garde)
const WHITE = "FFFFFF";
const MUTED = "B8C2CC";
const DARK_TEXT = "1E2735";
const LIGHT_BG = "F7F8F7";

// Calibri (police système, toujours disponible sous Windows/Office)
const FONT = "Calibri Light";
const FONT_BOLD = "Calibri";

const MAP_PIN_DATA_URL = `data:image/svg+xml;base64,${btoa(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path d="M24 3C14.6 3 7 10.6 7 20c0 12.8 17 25 17 25s17-12.2 17-25C41 10.6 33.4 3 24 3Z" fill="#f97316" stroke="#ffffff" stroke-width="3"/><circle cx="24" cy="20" r="6" fill="#ffffff"/></svg>`)}`;

/** Ajoute les 8 filets orange traversants de la charte WALLSBROKER. */
function addOrangeDiagonals(slide: Slide, y = 3.05, opts: { x?: number; w?: number; spacing?: number } = {}) {
  const startX = opts.x ?? -0.25;
  const width = opts.w ?? 13.9;
  const spacing = opts.spacing ?? 0.13;
  for (let i = 0; i < 8; i++) {
    slide.addShape("line", {
      x: startX,
      y: y + i * spacing,
      w: width,
      h: 0.48,
      line: { color: ORANGE, width: 0.55, transparency: 10 + i * 2 },
    });
  }
}

function addFooter(slide: Slide) {
  slide.addText(
    [
      { text: "WALLSBROKER", options: { bold: true, color: WHITE, fontSize: 8, fontFace: FONT_BOLD } },
      { text: " - Opportunité d'investissement\n", options: { color: WHITE, fontSize: 8 } },
      { text: "Document confidentiel et non contractuel", options: { color: MUTED, fontSize: 7 } },
    ],
    { x: 0.3, y: 7.05, w: 4, h: 0.4, fontFace: FONT }
  );
}

function addFooterLight(slide: Slide) {
  slide.addText(
    [
      { text: "WALLSBROKER", options: { bold: true, color: TEAL, fontSize: 8, fontFace: FONT_BOLD } },
      { text: " - Opportunité d'investissement\n", options: { color: TEAL, fontSize: 8 } },
      { text: "Document confidentiel et non contractuel", options: { color: TEAL, fontSize: 7 } },
    ],
    { x: 0.3, y: 7.05, w: 4, h: 0.4, fontFace: FONT }
  );
}

function addTitleBar(slide: Slide, title: string, opts: { x?: number; y?: number; w?: number; h?: number; fontSize?: number; align?: "left" | "center" } = {}) {
  const x = opts.x ?? 3.3;
  const y = opts.y ?? 0.62;
  const w = opts.w ?? 6.75;
  const h = opts.h ?? 0.36;
  slide.addShape("rect", {
    x, y, w, h,
    fill: { color: TEAL },
    line: { color: TEAL, width: 0 },
  });
  slide.addText(title, {
    x, y: y - 0.01, w, h: h + 0.04,
    fontFace: FONT, fontSize: opts.fontSize ?? 17, bold: false, color: WHITE,
    align: opts.align ?? "center", valign: "middle",
  });
}

function addStackedTitle(slide: Slide, lines: string[], x: number, y: number, w = 3.4) {
  lines.forEach((line, i) => {
    const estimated = Math.max(1.7, Math.min(w, line.length * 0.22 + 0.35));
    const lineW = i === lines.length - 1 ? w : estimated;
    slide.addShape("rect", { x, y: y + i * 0.42, w: lineW, h: 0.36, fill: { color: TEAL }, line: { color: TEAL, width: 0 } });
    slide.addText(line, { x: x + 0.05, y: y + i * 0.42, w: lineW - 0.1, h: 0.36, fontFace: FONT_BOLD, fontSize: 14, color: WHITE, bold: true, valign: "middle", align: "left" });
  });
}

function addSplitPlanTitle(slide: Slide, title: string) {
  slide.background = { color: WHITE };
  const bandW = 2.15;
  slide.addShape("rect", { x: 0, y: 0, w: bandW, h: 7.5, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
  addFooter(slide);
  slide.addText(title.toUpperCase().replace(/ /g, "\n"), {
    x: 0.18, y: 2.45, w: bandW - 0.32, h: 2.1, fontFace: FONT, fontSize: 20, color: WHITE, bold: false, valign: "middle", breakLine: false,
  });
}

function pngCrc32(data: Buffer): number {
  let crc = 0xffffffff;
  for (const byte of data) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function pngChunk(type: string, data: Buffer): Buffer {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(pngCrc32(Buffer.concat([typeBuffer, data])));
  return Buffer.concat([length, typeBuffer, data, crc]);
}

/**
 * Raster transparent gradient used on the cover.
 * A PNG is deliberate here: SVG opacity gradients are flattened incorrectly by
 * some PowerPoint-to-PDF converters and turn into a uniform grey veil.
 */
function coverGradientPng(direction: "right-to-left" | "left-to-right"): string {
  const width = 1600;
  const height = 8;
  const stops = [
    { at: 0, color: [13, 32, 51], alpha: 0.98 },
    { at: 0.35, color: [19, 74, 92], alpha: 0.88 },
    { at: 0.7, color: [46, 143, 168], alpha: 0.55 },
    { at: 1, color: [244, 248, 249], alpha: 0 },
  ];
  const raw = Buffer.alloc((width * 4 + 1) * height);

  for (let y = 0; y < height; y++) {
    const row = y * (width * 4 + 1);
    raw[row] = 0;
    for (let x = 0; x < width; x++) {
      const physical = x / (width - 1);
      const t = direction === "right-to-left" ? 1 - physical : physical;
      const upperIndex = stops.findIndex((stop) => stop.at >= t);
      const upper = stops[Math.max(1, upperIndex)];
      const lower = stops[Math.max(0, upperIndex - 1)];
      const amount = upper.at === lower.at ? 0 : (t - lower.at) / (upper.at - lower.at);
      const offset = row + 1 + x * 4;
      for (let channel = 0; channel < 3; channel++) {
        raw[offset + channel] = Math.round(lower.color[channel] + (upper.color[channel] - lower.color[channel]) * amount);
      }
      raw[offset + 3] = Math.round((lower.alpha + (upper.alpha - lower.alpha) * amount) * 255);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const png = Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk("IHDR", ihdr),
    pngChunk("IDAT", deflateSync(raw, { level: 9 })),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
  return `data:image/png;base64,${png.toString("base64")}`;
}

function addCoverGradient(slide: Slide, direction: "right-to-left" | "left-to-right") {
  // Overlay ne couvre que 2/3 de la largeur du slide, côté texte.
  // right-to-left : image à gauche → overlay sur les 2/3 droits, opaque à droite.
  // left-to-right : image à droite → overlay sur les 2/3 gauches, opaque à gauche.
  const overlayW = 13.33 * (2 / 3);
  const overlayX = direction === "right-to-left" ? 13.33 - overlayW : 0;
  slide.addImage({ data: coverGradientPng(direction), x: overlayX, y: 0, w: overlayW, h: 7.5 });
}

function isPptxMediaLite(media: { dataUrl?: string; name?: string } | null | undefined): boolean {
  if (!media?.dataUrl) return false;
  if (/presentationml|officedocument/.test(media.dataUrl.slice(0, 200))) return true;
  if (media.name && /\.pptx?$/i.test(media.name)) return true;
  return false;
}

function addFixedImageSlide(slide: Slide, media: { dataUrl: string; name?: string } | null | undefined): boolean {
  if (!media?.dataUrl) return false;
  // If a pptx template is provided, the slide is appended later by the merger — skip image render.
  if (isPptxMediaLite(media)) return true;
  slide.background = { color: WHITE };
  slide.addImage({ data: media.dataUrl, x: 0, y: 0, w: 13.33, h: 7.5, sizing: { type: "cover", w: 13.33, h: 7.5 } });
  return true;
}

function addMapPin(slide: Slide, mapX: number, mapY: number, mapW: number, mapH: number) {
  const w = 0.36;
  const h = 0.36;
  slide.addImage({ data: MAP_PIN_DATA_URL, x: mapX + mapW / 2 - w / 2, y: mapY + mapH / 2 - h, w, h, sizing: { type: "contain", w, h } });
}


function projectMapLabel({ lat, lng }: { lat: number; lng: number }, center: { lat: number; lng: number; zoom: number }, mapX: number, mapY: number, mapW: number, mapH: number) {
  const scale = 256 * 2 ** center.zoom;
  const toPixel = (p: { lat: number; lng: number }) => {
    const siny = Math.min(Math.max(Math.sin((p.lat * Math.PI) / 180), -0.9999), 0.9999);
    return {
      x: ((p.lng + 180) / 360) * scale,
      y: (0.5 - Math.log((1 + siny) / (1 - siny)) / (4 * Math.PI)) * scale,
    };
  };
  const c = toPixel(center);
  const p = toPixel({ lat, lng });
  const sourceWidth = 1000 * (mapW / mapH);
  const x = mapX + mapW / 2 + ((p.x - c.x) / sourceWidth) * mapW;
  const y = mapY + mapH / 2 + ((p.y - c.y) / 1000) * mapH;
  return { x, y };
}

function addEnvironmentLabels(
  slide: Slide,
  labels: NonNullable<BrochureData["envMapLabels"]>,
  mapX: number,
  mapY: number,
  mapW: number,
  mapH: number,
  center?: { lat: number; lng: number; zoom: number },
) {
  if (!center || !labels.length) return;
  labels.slice(0, 36).forEach((label) => {
    if (!Number.isFinite(label.lat) || !Number.isFinite(label.lng) || !label.name) return;
    const p = projectMapLabel(label, center, mapX, mapY, mapW, mapH);
    if (p.x < mapX + 0.1 || p.x > mapX + mapW - 0.1 || p.y < mapY + 0.1 || p.y > mapY + mapH - 0.1) return;
    const w = Math.min(1.32, Math.max(0.52, label.name.length * 0.058));
    slide.addShape("roundRect", {
      x: p.x - w / 2, y: p.y - 0.11, w, h: 0.22,
      fill: { color: WHITE, transparency: 2 }, line: { color: MUTED, transparency: 15, width: 0.35 }, rectRadius: 0.04,
    });
    slide.addText(label.name, {
      x: p.x - w / 2 + 0.03, y: p.y - 0.09, w: w - 0.06, h: 0.17,
      fontFace: FONT_BOLD, fontSize: 5.3, color: NAVY, align: "center", valign: "middle", fit: "shrink",
    });
  });
}

function addKeyIcon(slide: Slide, i: number, x: number, y: number, size = 1.35) {
  const cx = x + size / 2;
  const cy = y + size / 2;
  if (i === 0) {
    // Surface
    slide.addShape("line", { x, y: y + size, w: size, h: 0, line: { color: WHITE, width: 1.6 } });
    slide.addShape("line", { x, y, w: 0, h: size, line: { color: WHITE, width: 1.6 } });
    slide.addShape("line", { x: x + size - 0.16, y: y + size - 0.16, w: 0.16, h: 0.16, line: { color: WHITE, width: 1.6 } });
    slide.addShape("line", { x: x + 0.16, y, w: -0.16, h: 0.16, line: { color: WHITE, width: 1.6 } });
    slide.addText("m²", { x: x + 0.38, y: y + 0.43, w: 0.7, h: 0.35, fontFace: FONT, fontSize: 24, color: WHITE, align: "center" });
  } else if (i === 1) {
    // Loyer / m2
    [[0.18, 0.12, "¥"], [0, 0.73, "€"], [0.72, 0.52, "$"]].forEach(([dx, dy, txt]) => {
      slide.addShape("ellipse", { x: x + Number(dx), y: y + Number(dy), w: 0.68, h: 0.68, fill: { color: NAVY, transparency: 100 }, line: { color: WHITE, width: 1.4 } });
      slide.addText(String(txt), { x: x + Number(dx), y: y + Number(dy) + 0.08, w: 0.68, h: 0.35, fontFace: FONT, fontSize: 18, color: WHITE, align: "center" });
    });
  } else if (i === 2) {
    // Revenu locatif
    [0, 0.28, 0.56, 0.84].forEach((dy) => slide.addShape("ellipse", { x: x + 0.05, y: y + dy, w: 0.75, h: 0.25, fill: { color: NAVY, transparency: 100 }, line: { color: WHITE, width: 1.4 } }));
    slide.addShape("line", { x: x + 0.05, y: y + 0.12, w: 0, h: 0.84, line: { color: WHITE, width: 1.2 } });
    slide.addShape("line", { x: x + 0.8, y: y + 0.12, w: 0, h: 0.84, line: { color: WHITE, width: 1.2 } });
    [0.45, 0.74, 1.02].forEach((dy) => slide.addShape("ellipse", { x: x + 0.78, y: y + dy, w: 0.72, h: 0.25, fill: { color: NAVY, transparency: 100 }, line: { color: WHITE, width: 1.4 } }));
    slide.addShape("line", { x: x + 0.78, y: y + 0.57, w: 0, h: 0.58, line: { color: WHITE, width: 1.2 } });
    slide.addShape("line", { x: x + 1.5, y: y + 0.57, w: 0, h: 0.58, line: { color: WHITE, width: 1.2 } });
    slide.addShape("ellipse", { x: cx - 0.25, y: y + 0.72, w: 0.5, h: 0.5, fill: { color: NAVY }, line: { color: WHITE, width: 1.2 } });
    slide.addText("€", { x: cx - 0.25, y: y + 0.79, w: 0.5, h: 0.25, fontFace: FONT, fontSize: 16, color: WHITE, align: "center" });
  } else if (i === 3) {
    // Rendement
    slide.addShape("ellipse", { x: cx - 0.6, y: cy - 0.6, w: 1.2, h: 1.2, fill: { color: NAVY, transparency: 100 }, line: { color: WHITE, width: 2 } });
    slide.addText("%", { x: cx - 0.5, y: cy - 0.35, w: 1, h: 0.7, fontFace: FONT_BOLD, fontSize: 32, color: WHITE, align: "center", valign: "middle" });
  } else if (i === 4) {
    // Parking
    slide.addShape("rect", { x: cx - 0.5, y: cy - 0.55, w: 1, h: 1.1, fill: { color: WHITE, transparency: 100 }, line: { color: WHITE, width: 2 } });
    slide.addText("P", { x: cx - 0.4, y: cy - 0.45, w: 0.8, h: 0.9, fontFace: FONT_BOLD, fontSize: 40, color: WHITE, align: "center", valign: "middle" });
  } else {
    // WALB / Temps
    slide.addShape("ellipse", { x: cx - 0.6, y: cy - 0.6, w: 1.2, h: 1.2, fill: { color: NAVY, transparency: 100 }, line: { color: WHITE, width: 1.6 } });
    slide.addShape("line", { x: cx, y: cy - 0.45, w: 0, h: 0.45, line: { color: WHITE, width: 2 } });
    slide.addShape("line", { x: cx, y: cy, w: 0.35, h: 0, line: { color: WHITE, width: 2 } });
  }
}

function addDarkBackground(slide: Slide) {
  slide.background = { color: NAVY };
}

function parseAmount(value?: string): number {
  if (!value) return NaN;
  const normalized = String(value)
    .replace(/[^\d,.-]/g, "")
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(\D|$))/g, "")
    .replace(",", ".");
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : NaN;
}

function formatNumber(value: number, digits = 0): string {
  return Number.isFinite(value) ? value.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits }) : "";
}

function valueOrComputed(raw: string | undefined, computed: number, suffix = ""): string {
  const trimmed = (raw || "").trim();
  if (trimmed) return trimmed;
  const formatted = formatNumber(computed, suffix === " %" ? 2 : 0);
  return formatted ? `${formatted}${suffix}` : "";
}

function formatSalePriceForConditions(raw: string, nousConsulter: boolean): string {
  if (nousConsulter) return "Nous consulter";
  const trimmed = raw.trim();
  if (!trimmed) return "";
  const withEuro = /€|eur/i.test(trimmed) ? trimmed : `${trimmed} €`;
  return /hors droits|hors taxes/i.test(withEuro) ? withEuro : `${withEuro} Hors droits et Hors taxes`;
}

export async function generateBrochurePptx(data: BrochureData): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5
  pptx.title = `Brochure ${data.nomSite || data.adresse}`;
  pptx.company = "WALLSBROKER";

  const extraAssets = (data.portfolioAssets || []).filter(Boolean);
  const allAssets = [data, ...extraAssets];

  for (const asset of allAssets) {
    await addAssetSlides(pptx, asset);
  }

  if (extraAssets.length) {
    await addPortfolioSummarySlide(pptx, allAssets);
  }

  addTeamSlide(pptx, data);

  const out = await pptx.write({ outputType: "nodebuffer" });
  return out as Buffer;
}

async function addAssetSlides(pptx: PptxGenJSType, data: BrochureData): Promise<void> {
  const coverRight = data.photoCouverturePosition === "right";


  // ─────────────────── SLIDE 1: COUVERTURE ───────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: NAVY };

    // Photo pleine page avec voile dégradé teal → navy, comme les références.
    const imgSide = { x: 0, y: 0, w: 13.33, h: 7.5 };
    if (data.photoCouverture) {
      s.addImage({
        data: data.photoCouverture.dataUrl,
        ...imgSide,
        sizing: { type: "cover", w: imgSide.w, h: imgSide.h },
      });
    } else {
      s.addShape("rect", { ...imgSide, fill: { color: NAVY_LIGHT }, line: { color: NAVY_LIGHT, width: 0 } });
      s.addText("Photo de couverture", { ...imgSide, color: MUTED, fontSize: 14, align: "center", valign: "middle", fontFace: FONT });
    }
    addCoverGradient(s, coverRight ? "left-to-right" : "right-to-left");
    // (contour orange retiré à la demande)

    // Textes
    const tx = coverRight ? 1.05 : 8.55;
    const tw = 4.0;
    s.addText(
      [
        { text: (data.typeBien || "ENSEMBLE COMMERCIAL").toUpperCase() + "\n", options: { color: ORANGE, bold: true, fontSize: 20, fontFace: FONT_BOLD } },
        { text: data.surface ? `${data.surface}${/m²|m2/i.test(data.surface) ? "" : " m²"}` : "", options: { color: WHITE, bold: true, fontSize: 20, fontFace: FONT_BOLD } },
      ],
      { x: tx, y: 1.88, w: tw, h: 0.95, fontFace: FONT, valign: "top", align: "left" }
    );
    s.addText(
      [
        { text: (data.nomSite || "") + "\n", options: { color: WHITE, bold: true, fontSize: 12.5, fontFace: FONT_BOLD } },
        { text: [data.adresse, [data.codePostal, data.ville].filter(Boolean).join(" ")].filter(Boolean).join(", "), options: { color: WHITE, fontSize: 12.5 } },
      ],
      { x: tx, y: 2.92, w: tw, h: 1.0, fontFace: FONT }
    );

    // Ruban WALLSBROKER orange, positionné bas droite.
    s.addShape("rect", {
      x: 9.2, y: 6.4, w: 4.13, h: 0.62,
      fill: { color: GREEN }, line: { color: GREEN, width: 0 },
    });
    s.addText(
      [
        { text: "WALLSBROKER\n", options: { bold: true, fontSize: 13, color: WHITE, fontFace: FONT_BOLD } },
        { text: "OPPORTUNITÉ D’INVESTISSEMENT", options: { fontSize: 10.5, color: WHITE } },
      ],
      { x: 9.32, y: 6.48, w: 3.8, h: 0.45, fontFace: FONT, align: "left", valign: "middle" }
    );
  }

  // ─────────────────── SLIDE 2: POINTS CLÉS ───────────────────
  {
    const s = pptx.addSlide();
    addDarkBackground(s);
    addTitleBar(s, "LES POINTS CLÉS DE L'INVESTISSEMENT");

    const allPictos = data.settings?.pointsClesPictos || [];
    const points = data.pointsCles
      .map((p, idx) => ({ p, idx }))
      .filter(({ p }) => p && p.trim())
      .slice(0, 6);

    if (points.length) {
      // Répartition sur 1 ou 2 lignes :
      // 1-3 → 1 ligne ; 4 → 2×2 ; 5 → 3+2 ; 6 → 2×3.
      const n = points.length;
      let rowLayout: number[];
      if (n <= 4) rowLayout = [n];
      else if (n === 5) rowLayout = [3, 2];
      else rowLayout = [3, 3];
      const rowsCount = rowLayout.length;
      const pictoSize = rowsCount === 2 ? 1.25 : 1.85;
      const pictoLabels = data.settings?.pointsClesPictosLabels || [];
      // Zone verticale disponible entre titre et footer
      const zoneY0 = 1.7;
      const zoneH = 5.15;
      const rowH = zoneH / rowsCount;
      let cursor = 0;
      rowLayout.forEach((cols, rowIdx) => {
        const cellW = 11.8 / cols;
        const rowY = zoneY0 + rowIdx * rowH;
        const pictoY = rowY + (rowH - pictoSize - 1.0) / 2;
        const textY = pictoY + pictoSize + 0.1;
        for (let i = 0; i < cols; i++) {
          const { p: pt, idx: origIdx } = points[cursor + i];
          const x = 0.78 + i * cellW;
          const picto = allPictos[origIdx];
          if (picto) {
            s.addImage({
              data: picto.dataUrl,
              x: x + (cellW - pictoSize) / 2, y: pictoY, w: pictoSize, h: pictoSize,
              sizing: { type: "contain", w: pictoSize, h: pictoSize },
            });
          } else {
            addKeyIcon(s, origIdx, x + (cellW - pictoSize * 0.9) / 2, pictoY, pictoSize * 0.9);
          }
          const pictoLabel = (pictoLabels[origIdx] || "").replace(/^Picto\s+/i, "").trim();
          s.addText(pt, {
            x: x + 0.1, y: textY, w: cellW - 0.2, h: 0.5,
            fontFace: "Futura PT", fontSize: rowsCount === 2 ? 20 : 24, bold: false, color: ORANGE, align: "center", valign: "middle",
            fit: "shrink",
          });
          if (pictoLabel) {
            s.addText(pictoLabel, {
              x: x + 0.1, y: textY + 0.5, w: cellW - 0.2, h: 0.4,
              fontFace: "Futura PT", fontSize: rowsCount === 2 ? 14 : 18, color: WHITE, align: "center", valign: "top", fit: "shrink",
            });
          }
        }
        cursor += cols;
      });
    } else {
      s.addText("Points clés à compléter", {
        x: 1, y: 3, w: 11.33, h: 1, fontFace: FONT, fontSize: 16, color: MUTED, align: "center",
      });
    }
    addFooter(s);
  }

  // ─────────────────── SLIDE 3: LOCALISATION ───────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    const mapX = 0.5, mapY = 1.3, mapW = 6.8, mapH = 5.5;
    const navyW = mapX + mapW + mapX;
    s.addShape("rect", { x: 0, y: 0, w: navyW, h: 7.5, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    // Titre centré sur la zone bleue
    addTitleBar(s, "LOCALISATION", { x: 0.5, y: 0.62, w: navyW - 1.0 });
    // Stries limitées strictement à la zone bleue
    addOrangeDiagonals(s, 3.05, { x: 0, w: navyW });

    // Cadre Google Maps à gauche avec contour orange
    if (data.carteRegion) {
      s.addImage({ data: data.carteRegion.dataUrl, x: mapX, y: mapY, w: mapW, h: mapH, sizing: { type: "cover", w: mapW, h: mapH } });
      addMapPin(s, mapX, mapY, mapW, mapH);
    } else {
      s.addShape("rect", { x: mapX, y: mapY, w: mapW, h: mapH, fill: { color: NAVY_LIGHT }, line: { color: ORANGE, width: 0 } });
      s.addText("Carte Google Maps", { x: mapX, y: mapY, w: mapW, h: mapH, color: MUTED, fontSize: 12, align: "center", valign: "middle", fontFace: FONT });
    }
    // Contour orange autour du cadre carte
    s.addShape("rect", { x: mapX, y: mapY, w: mapW, h: mapH, fill: { color: WHITE, transparency: 100 }, line: { color: ORANGE, width: 1.5 } });

    // Croquis carte de France à droite, centré en haut (taille réduite)
    const franceMap = data.settings?.franceMap;
    const franceW = 2.2, franceH = 2.2;
    const franceX = navyW + ((13.33 - navyW) - franceW) / 2;
    const franceY = 1.25;
    if (franceMap) {
      s.addImage({ data: franceMap.dataUrl, x: franceX, y: franceY, w: franceW, h: franceH, sizing: { type: "contain", w: franceW, h: franceH } });
      s.addShape("ellipse", {
        x: franceX + franceW / 2 - 0.09, y: franceY + franceH / 2 - 0.09, w: 0.18, h: 0.18,
        fill: { color: ORANGE }, line: { color: ORANGE, width: 0 },
      });
    }

    // Zone texte centrée horizontalement sur la partie blanche (texte justifié)
    const whiteX = navyW;
    const whiteW = 13.33 - navyW;
    s.addText(data.descriptionVille || `Le bien se situe à ${data.ville || "..."}.`, {
      x: whiteX + 0.35, y: franceY + franceH + 0.25, w: whiteW - 0.7, h: 2.0,
      fontFace: FONT, fontSize: 11, color: NAVY, valign: "top", align: "justify", paraSpaceAfter: 4, fit: "shrink",
    });
    addFooterLight(s);
  }

  // ─────────────────── SLIDE 4: ZONE DE CHALANDISE + REVENUS (mirroir de la slide Localisation) ───────────────────
  {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    // Zone navy sur la droite (mirroir de Localisation)
    const navyW2 = 7.8;
    const navyX2 = 13.33 - navyW2; // 5.53
    s.addShape("rect", { x: navyX2, y: 0, w: navyW2, h: 7.5, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    // Titre centré sur la zone bleue (à droite)
    addTitleBar(s, "ZONE DE CHALANDISE", { x: navyX2 + 0.5, y: 0.62, w: navyW2 - 1.0 });
    // Stries limitées strictement à la zone bleue
    addOrangeDiagonals(s, 3.05, { x: navyX2, w: navyW2 });

    // Isochrone dans la zone bleue, centrée
    const mapW2 = 6.8;
    const mapH2 = 4.3;
    const mapX2 = navyX2 + (navyW2 - mapW2) / 2;
    const mapY2 = 1.3;
    if (data.chalandiseImage) {
      s.addImage({ data: data.chalandiseImage.dataUrl, x: mapX2, y: mapY2, w: mapW2, h: mapH2, sizing: { type: "contain", w: mapW2, h: mapH2 } });
    } else {
      s.addShape("rect", { x: mapX2, y: mapY2, w: mapW2, h: mapH2, fill: { color: NAVY_LIGHT }, line: { color: ORANGE, width: 1.2 } });
      s.addText("Isochrone non fournie", { x: mapX2, y: mapY2, w: mapW2, h: mapH2, color: MUTED, fontSize: 12, align: "center", valign: "middle", fontFace: FONT });
    }

    // Tableau sous l'isochrone (dans la zone bleue)
    const tableRows = [
      [
        { text: "", options: { bold: true, color: WHITE, fill: { color: NAVY_LIGHT } } },
        { text: `Zone primaire (${data.dureeZone1}mn)`, options: { bold: true, color: WHITE, fill: { color: TEAL } } },
        { text: `Zone secondaire (${data.dureeZone2}mn)`, options: { bold: true, color: WHITE, fill: { color: TEAL } } },
      ],
      [
        { text: "Population", options: { bold: true, color: WHITE, fill: { color: NAVY_LIGHT } } },
        { text: data.populationZone1 || "-", options: { color: WHITE, fill: { color: NAVY } } },
        { text: data.populationZone2 || "-", options: { color: WHITE, fill: { color: NAVY } } },
      ],
    ];
    s.addTable(tableRows, {
      x: mapX2, y: mapY2 + mapH2 + 0.15, w: mapW2, fontFace: FONT, fontSize: 10,
      border: { type: "solid", pt: 1, color: TEAL },
    });

    // Revenus détaillés à gauche : titre + cadre aligné avec la zone de chalandise
    const revBoxW = Math.min(navyX2 - 0.7, 4.6);
    const revBoxH = 5.5;
    const revBoxX = (navyX2 - revBoxW) / 2;
    const revBoxY = 1.3;

    // Titre "SALAIRES MOYENS" au-dessus du cadre, aligné avec le titre de droite
    addTitleBar(s, "SALAIRES MOYENS", { x: revBoxX, y: 0.62, w: revBoxW, h: 0.36, fontSize: 17 });

    s.addShape("roundRect", {
      x: revBoxX, y: revBoxY, w: revBoxW, h: revBoxH,
      fill: { color: WHITE, transparency: 100 }, line: { color: NAVY, width: 1.5 }, rectRadius: 0.16,
    });
    s.addText(`REVENUS DÉTAILLÉS DES MÉNAGES\nÀ ${(data.ville || "").toUpperCase()}`, {
      x: revBoxX + 0.2, y: revBoxY + 0.2, w: revBoxW - 0.4, h: 0.85,
      fontFace: FONT_BOLD, fontSize: 13, bold: true, color: ORANGE, align: "center",
    });

    const revLines: Array<[string, string]> = [
      ["Célibataire", data.revenus.celibataire],
      ["Couple sans enfants", data.revenus.coupleSansEnfants],
      ["Famille monoparentale", data.revenus.familleMonoparentale],
      ["Couple avec 1 enfant", data.revenus.coupleUnEnfant],
      ["Couple avec 2 enfants", data.revenus.coupleDeuxEnfants],
      ["Couple avec 3 enfants", data.revenus.coupleTroisEnfants],
    ];
    const revPictos = data.settings?.revenusPictos || [];
    const rowH = (revBoxH - 1.15) / revLines.length;
    const rowStartY = revBoxY + 1.05;
    revLines.forEach(([label, val], i) => {
      const y = rowStartY + i * rowH;
      const picto = revPictos[i];
      const innerX = revBoxX + 0.25;
      const innerW = revBoxW - 0.5;
      const pictoSize = 0.62;
      if (picto?.dataUrl) {
        const pictoY = y + (rowH - pictoSize) / 2;
        s.addShape("ellipse", {
          x: innerX, y: pictoY, w: pictoSize, h: pictoSize,
          fill: { color: TEAL }, line: { color: TEAL, width: 0 },
        });
        s.addImage({
          data: picto.dataUrl,
          x: innerX + 0.08, y: pictoY + 0.08, w: pictoSize - 0.16, h: pictoSize - 0.16,
          sizing: { type: "contain", w: pictoSize - 0.16, h: pictoSize - 0.16 },
        });
      }
      s.addText(
        [
          { text: `${label} : `, options: { color: NAVY, fontSize: 11, bold: true } },
          { text: val || "—", options: { color: ORANGE, fontSize: 11, bold: true, fontFace: FONT_BOLD } },
        ],
        { x: picto?.dataUrl ? innerX + pictoSize + 0.12 : innerX, y, w: picto?.dataUrl ? innerW - pictoSize - 0.12 : innerW, h: rowH, fontFace: FONT, valign: "middle", fit: "shrink" }
      );
    });

    addFooterLight(s);
  }


  // ─────────────────── SLIDE 5: ENVIRONNEMENT COMMERCIAL (optionnel, APRÈS chalandise) ───────────────────
  if (data.includeEnvironnement) {
    const s = pptx.addSlide();
    s.background = { color: WHITE };
    s.addShape("rect", { x: 0, y: 0, w: 8.75, h: 7.5, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    addOrangeDiagonals(s, 3.05, { x: 0, w: 8.75, spacing: 0.13 });

    // Grande carte de proximité : le cadrage reprend exactement l'aperçu du générateur.
    const envMapY = 1.02;
    const envMapH = 5.72;
    const envMapX = 0.28;
    const envMapW = 8.15;
    if (data.envCarte) {
      s.addImage({ data: data.envCarte.dataUrl, x: envMapX, y: envMapY, w: envMapW, h: envMapH, sizing: { type: "cover", w: envMapW, h: envMapH } });
      s.addShape("rect", { x: envMapX, y: envMapY, w: envMapW, h: envMapH, fill: { color: WHITE, transparency: 100 }, line: { color: ORANGE, width: 1.5 } });
      addMapPin(s, envMapX, envMapY, envMapW, envMapH);
      addEnvironmentLabels(s, data.envMapLabels || [], envMapX, envMapY, envMapW, envMapH, data.mapsSettings?.environnement);
    } else {
      s.addShape("rect", { x: envMapX, y: envMapY, w: envMapW, h: envMapH, fill: { color: NAVY_LIGHT }, line: { color: ORANGE, width: 1.5 } });
    }

    // Titre unique remonté en haut de la zone blanche
    const whiteZoneX = 8.75;
    const whiteZoneW = 13.33 - whiteZoneX;
    const titleW = 4.05;
    const titleX = whiteZoneX + (whiteZoneW - titleW) / 2;
    s.addShape("rect", { x: titleX, y: 0.28, w: titleW, h: 0.48, fill: { color: TEAL }, line: { color: TEAL, width: 0 } });
    s.addText("ENVIRONNEMENT COMMERCIAL", {
      x: titleX, y: 0.28, w: titleW, h: 0.48,
      fontFace: FONT_BOLD, fontSize: 15, color: WHITE, bold: true, align: "center", valign: "middle",
    });

    const panelX = whiteZoneX + 0.24;
    const panelW = whiteZoneW - 0.48;
    const panelGap = 0.16;
    const panelH = (5.72 - panelGap * 2) / 3;
    const panels = [
      {
        title: data.envType === "centre-ville" ? "FLUX PIÉTON" : "TRAFIC ROUTIER",
        text: data.envTrafic,
      },
      { title: "CA DE LA ZONE & HYPERMARCHÉ", text: data.envCA },
      { title: "PROJETS À VENIR", text: data.envProjets },
    ];
    panels.forEach((panel, index) => {
      const y = 1.02 + index * (panelH + panelGap);
      s.addShape("roundRect", {
        x: panelX, y, w: panelW, h: panelH,
        fill: { color: WHITE }, line: { color: NAVY, width: 1.05 }, rectRadius: 0.12,
      });
      s.addText(panel.title, {
        x: panelX + 0.2, y: y + 0.12, w: panelW - 0.4, h: 0.3,
        fontFace: FONT_BOLD, fontSize: 10.2, color: ORANGE, bold: true, valign: "middle",
      });
      s.addText(panel.text || "À compléter", {
        x: panelX + 0.2, y: y + 0.48, w: panelW - 0.4, h: panelH - 0.62,
        fontFace: FONT, fontSize: 8.5, color: panel.text ? NAVY : MUTED,
        valign: "top", align: "justify", paraSpaceAfter: 3, fit: "shrink",
      });
    });

    addFooterLight(s);
  }



  // ─────────────────── SLIDE 6: ACCESSIBILITÉ IMMÉDIATE ───────────────────
  {
    const s = pptx.addSlide();
    addDarkBackground(s);
    addTitleBar(s, "ACCESSIBILITÉ IMMÉDIATE");
    addOrangeDiagonals(s, 2.75);
    const accMap = data.accessibiliteCarte || data.envCarte || data.carteRegion;
    if (accMap) {
      s.addImage({ data: accMap.dataUrl, x: 2.9, y: 1.48, w: 7.55, h: 4.9, sizing: { type: "cover", w: 7.55, h: 4.9 } });
      s.addShape("rect", { x: 2.9, y: 1.48, w: 7.55, h: 4.9, fill: { color: WHITE, transparency: 100 }, line: { color: ORANGE, width: 1.5 } });
      addMapPin(s, 2.9, 1.48, 7.55, 4.9);
    } else {
      s.addShape("rect", { x: 2.9, y: 1.45, w: 7.55, h: 4.95, fill: { color: NAVY_LIGHT }, line: { color: ORANGE, width: 1.5 } });
    }
    addFooter(s);
  }

  // ─────────────────── SLIDE 7: ÉTAT LOCATIF (tableau centré, sans filets ni intercalaire) ───────────────────
  {
    const s = pptx.addSlide();
    addDarkBackground(s);
    addTitleBar(s, "PRÉSENTATION DU SITE");
    // Pas de filets orange sur cette slide (à la demande).

    const headerRow = ["Enseignes", "Surface", "Loyer annuel HC-HT", "Loyer/m²/an", "Début de bail", "Prochain Break", "WALB", "Fin du bail", "WALT"].map(
      (h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: TEAL }, fontSize: 11, align: "center" as const, fontFace: FONT_BOLD, valign: "middle" as const } })
    );
    const { computeRowDurations, computeAverages, fmtNum: fmtN, parseAmt: pAmt } = await import("./brochure-compute");
    const dataRows = data.locataires.map((row) => {
      const auto = computeRowDurations(row);
      const walb = (row.walb && row.walb.trim()) ? row.walb : auto.walb;
      const walt = (row.walt && row.walt.trim()) ? row.walt : auto.walt;
      // Loyer/m² TOUJOURS recalculé = Loyer annuel HC-HT / Surface (règle unique pour toutes les lignes).
      const surf = pAmt(row.surface);
      const loy = pAmt(row.loyerAnnuel);
      const loyerM2 = Number.isFinite(surf) && surf > 0 && Number.isFinite(loy) && loy > 0
        ? `${Math.round(loy / surf)} €/m²/an`
        : (row.loyerM2 || "");
      return [
        row.enseigne, row.surface, row.loyerAnnuel, loyerM2, row.debutBail, row.prochainBreak, walb, row.finBail, walt,
      ].map((v) => ({ text: v || "-", options: { color: WHITE, fill: { color: NAVY_LIGHT }, fontSize: 10, align: "center" as const } }));
    });

    const rows: TableRow[] = [headerRow as unknown as TableRow, ...(dataRows as unknown as TableRow[])];
    if (data.nbLocataires > 1) {
      const avg = computeAverages(data.locataires);
      const avgM2 = avg.totalSurface > 0 ? Math.round(avg.totalLoyer / avg.totalSurface) : 0;
      const totalRow = [
        "TOTAL",
        avg.totalSurface ? `${fmtN(avg.totalSurface)} m²` : "-",
        avg.totalLoyer ? `${fmtN(avg.totalLoyer)} €` : "-",
        avgM2 ? `${avgM2} €/m²/an` : "-",
        "", "", avg.walb || "", "", avg.walt || "",
      ].map((v) => ({ text: v, options: { bold: true, color: WHITE, fill: { color: ORANGE }, fontSize: 10, align: "center" as const, fontFace: FONT_BOLD } }));
      rows.push(totalRow as unknown as TableRow);
    }

    // Tableau centré horizontalement (marges équivalentes gauche/droite)
    const tableW = 12.86;
    const tableX = (13.33 - tableW) / 2;
    const tableY = 3.2;
    s.addTable(rows, {
      x: tableX, y: tableY, w: tableW, fontFace: FONT,
      colW: [1.65, 1.45, 1.9, 1.3, 1.52, 1.58, 0.98, 1.5, 0.98],
      border: { type: "solid", pt: 1, color: TEAL },
    });
    addFooter(s);
  }

  // ─────────────────── SLIDE 8: REPORTAGE PHOTOS ───────────────────
  // Seules les photos cochées « Reportage » dans le générateur sont exportées.
  const reportagePhotos = data.photos.filter((p) => !(data.photosExclues || []).includes(p.name));
  if (reportagePhotos.length) {
    const s = pptx.addSlide();
    addDarkBackground(s);
    s.addText("REPORTAGE PHOTOS", {
      x: 0.35, y: 0.45, w: 12.65, h: 0.7,
      fontFace: "Futura PT", fontSize: 54, bold: false, color: NAVY, outline: { color: ORANGE, size: 1.15 },
      align: "center", valign: "middle", fit: "shrink",
    });
    const n = reportagePhotos.length;
    // Zone photos : presque toute la largeur, hauteur maximisée.
    const area = { x: 0.4, y: 2.25, w: 12.53, h: 2.75 };
    if (n === 0) {
      [0, 1, 2].forEach((_, i) => {
        const cw = (area.w - 0.2 * 2) / 3;
        s.addShape("rect", { x: area.x + i * (cw + 0.2), y: area.y, w: cw, h: area.h, fill: { color: NAVY_LIGHT }, line: { color: ORANGE, width: 1.5 } });
        s.addText("Photo", { x: area.x + i * (cw + 0.2), y: area.y + area.h / 2 - 0.15, w: cw, h: 0.3, fontFace: FONT, fontSize: 12, color: MUTED, align: "center" });
      });
    } else if (n === 1) {
      s.addImage({ data: reportagePhotos[0].dataUrl, x: area.x, y: area.y, w: area.w, h: area.h, sizing: { type: "cover", w: area.w, h: area.h } });
      s.addShape("rect", { x: area.x, y: area.y, w: area.w, h: area.h, fill: { color: WHITE, transparency: 100 }, line: { color: ORANGE, width: 1.5 } });
    } else if (n === 2) {
      const cw = (area.w - 0.2) / 2;
      reportagePhotos.forEach((p, i) => {
        const px = area.x + i * (cw + 0.2);
        s.addImage({ data: p.dataUrl, x: px, y: area.y, w: cw, h: area.h, sizing: { type: "cover", w: cw, h: area.h } });
        s.addShape("rect", { x: px, y: area.y, w: cw, h: area.h, fill: { color: WHITE, transparency: 100 }, line: { color: ORANGE, width: 1.5 } });
      });
    } else if (n === 3) {
      const cw = (area.w - 0.2 * 2) / 3;
      reportagePhotos.slice(0, 3).forEach((p, i) => {
        const px = area.x + i * (cw + 0.2);
        s.addImage({ data: p.dataUrl, x: px, y: area.y, w: cw, h: area.h, sizing: { type: "cover", w: cw, h: area.h } });
        s.addShape("rect", { x: px, y: area.y, w: cw, h: area.h, fill: { color: WHITE, transparency: 100 }, line: { color: ORANGE, width: 1.5 } });
      });
    } else if (n === 6) {
      // 2 lignes de 3 photos centrées verticalement sur la page, sans empiéter sur le titre
      const cw = (area.w - 0.2 * 2) / 3;
      const rowH = area.h; // 2.75
      const gap = 0.2;
      const totalH = 2 * rowH + gap;
      const titleEnd = 0.45 + 0.7;
      const footerY = 7.05;
      const availH = footerY - titleEnd;
      const startY = titleEnd + (availH - totalH) / 2; // centré entre titre et footer
      [0, 1].forEach((row) => {
        reportagePhotos.slice(row * 3, row * 3 + 3).forEach((p, i) => {
          const px = area.x + i * (cw + 0.2);
          const py = startY + row * (rowH + gap);
          s.addImage({ data: p.dataUrl, x: px, y: py, w: cw, h: rowH, sizing: { type: "cover", w: cw, h: rowH } });
          s.addShape("rect", { x: px, y: py, w: cw, h: rowH, fill: { color: WHITE, transparency: 100 }, line: { color: ORANGE, width: 1.5 } });
        });
      });
    } else {
      const cols = n === 4 ? 2 : n <= 6 ? 3 : 4;
      const rows = Math.ceil(n / cols);
      const cw = (area.w - 0.2 * (cols - 1)) / cols;
      const ch = (area.h - 0.2 * (rows - 1)) / rows;
      reportagePhotos.forEach((p, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const px = area.x + col * (cw + 0.2);
        const py = area.y + row * (ch + 0.2);
        s.addImage({ data: p.dataUrl, x: px, y: py, w: cw, h: ch, sizing: { type: "cover", w: cw, h: ch } });
        s.addShape("rect", { x: px, y: py, w: cw, h: ch, fill: { color: WHITE, transparency: 100 }, line: { color: ORANGE, width: 1.5 } });
      });
    }
    addFooter(s);
  }


  // ─────────────────── SLIDE PLAN DE MASSE (bloc 9 — 1 seul) ───────────────────
  if (data.planMasse) {
    const s = pptx.addSlide();
    addSplitPlanTitle(s, "PLAN DE MASSE");
    s.addImage({ data: data.planMasse.dataUrl, x: 2.35, y: 0.35, w: 10.6, h: 6.8, sizing: { type: "contain", w: 10.6, h: 6.8 } });
  }

  // ─────────────────── SLIDES PLAN(S) (bloc 10 — illimité, titre saisi) ───────────────────
  if (data.plans.length) {
    data.plans.slice(0, 20).forEach((p, i) => {
      const s = pptx.addSlide();
      const fallback = i === 0 ? "PLAN" : i === 1 ? "PLAN AMÉNAGEMENT" : i === 2 ? "PLAN COUPE" : i === 3 ? "FAÇADES" : `PLAN ${i + 1}`;
      const title = (p.title && p.title.trim()) ? p.title.trim().toUpperCase() : fallback;
      addSplitPlanTitle(s, title);
      s.addImage({ data: p.dataUrl, x: 2.35, y: 0.35, w: 10.6, h: 6.8, sizing: { type: "contain", w: 10.6, h: 6.8 } });
    });
  }

  // ─────────────────── SLIDES PERSPECTIVES (une par média, format identique aux plans) ───────────────────
  if (data.perspectives.length) {
    data.perspectives.slice(0, 20).forEach((p, i) => {
      const s = pptx.addSlide();
      const fallback = i === 0 ? "PERSPECTIVE" : `PERSPECTIVE ${i + 1}`;
      const title = (p.title && p.title.trim()) ? p.title.trim().toUpperCase() : fallback;
      addSplitPlanTitle(s, title);
      s.addImage({ data: p.dataUrl, x: 2.35, y: 0.35, w: 10.6, h: 6.8, sizing: { type: "contain", w: 10.6, h: 6.8 } });
    });
  }

  // ─────────────────── SLIDE 12: CONDITIONS DE LA VENTE ───────────────────
  {
    const s = pptx.addSlide();
    addDarkBackground(s);
    addOrangeDiagonals(s);

    // Cadre blanc contour orange, centré, avec titre en haut à gauche du cadre.
    const cardW = 7.6;
    const cardH = 3.2;
    const cardX = (13.33 - cardW) / 2;
    const cardY = 2.15;
    s.addShape("rect", {
      x: cardX, y: cardY, w: cardW, h: cardH,
      fill: { color: WHITE }, line: { color: ORANGE, width: 2 },
    });
    // Un seul rectangle orange sur une seule ligne, placé au-dessus du cadre blanc, aligné à gauche
    const singleLabelW = 2.65;
    const labelY = cardY - 0.55;
    s.addShape("rect", { x: cardX, y: labelY, w: singleLabelW, h: 0.4, fill: { color: ORANGE }, line: { color: ORANGE, width: 0 } });
    s.addText("CONDITIONS DE LA VENTE", {
      x: cardX + 0.08, y: labelY, w: singleLabelW - 0.16, h: 0.4,
      fontFace: FONT_BOLD, fontSize: 12, color: WHITE, bold: true, valign: "middle", align: "left",
    });
    const lines: Array<{ text: string; options: { color: string; fontSize: number; bold?: boolean; fontFace?: string; breakLine?: boolean } }> = [];
    if (data.typeVente) {
      lines.push({ text: `${data.typeVente}\n`, options: { color: NAVY, fontSize: 15, bold: true, fontFace: FONT_BOLD } });
    }
    const prixDisplay = formatSalePriceForConditions(data.prixVente || "", data.nousConsulter);
    const honosDisplay = (data.honoraires || "").trim();
    if (prixDisplay) {
      lines.push({ text: `Prix net vendeur : `, options: { color: NAVY, fontSize: 15 } });
      lines.push({ text: prixDisplay + "\n", options: { color: ORANGE, fontSize: 15, bold: true, fontFace: FONT_BOLD } });
    }
    if (honosDisplay) {
      lines.push({ text: `Honoraires : ${honosDisplay}`, options: { color: NAVY, fontSize: 15 } });
    }
    s.addText(lines, { x: cardX + 0.4, y: cardY + 0.4, w: cardW - 0.8, h: cardH - 0.8, fontFace: FONT, align: "center", valign: "middle", paraSpaceAfter: 8, fit: "shrink" });
    addFooter(s);
  }

  // ─────────────────── SLIDE 13: CONFIDENTIALITÉ ───────────────────
  if (!isPptxMediaLite(data.settings?.fixedConfidentialiteSlide)) {
    const s = pptx.addSlide();
    if (addFixedImageSlide(s, data.settings?.fixedConfidentialiteSlide)) {
      // slide fixe fournie en bibliothèque (image)
    } else {
    addDarkBackground(s);
    addStackedTitle(s, ["CONFIDENTIALITÉ", "ET EXCLUSION", "DE", "RESPONSABILITÉ"], 1.55, 0.42, 3.5);
    const left = `Cette brochure contient des informations confidentielles sur le bien objet des présentes. Elle est fournie uniquement dans la perspective d’être examinée par un acheteur potentiel et ne doit pas être mise à la disposition d’une personne quelconque à l’exception des conseils de l’acquéreur, devant être informés par l’acheteur potentiel du caractère confidentiel.

Les éléments inclus dans cette brochure reposent sur des informations obtenues auprès du vendeur et d’autres sources qu’ils considèrent comme raisonnablement fiables. Cependant, aucune garantie n’est assurée concernant l’exhaustivité et l’exactitude des informations contenues ici. Cette brochure ne constitue pas une recommandation relative à la valeur de l’actif. Les acheteurs éventuels doivent se fier à leurs propres investigations, à leur propre évaluation et à leur propre jugement quant à l’intérêt d’acquérir le Bien.`;
    const right = `La présente brochure ne confère aucun droit de négociation, exclusif ou non, ni entraîne une obligation de négociation.

Dès lors, le vendeur se réserve expressément le droit de rejeter toute expression d’intérêt et/ou de mettre fin à des discussions avec toute partie et à tout instant, avec ou sans avertissement, avant la régularisation d’un contrat formel.

Le vendeur ne se soumet à aucun engagement ou aucune obligation légale vis-à-vis d’une entité quelconque examinant la brochure ou formulant une offre pour le Bien, à moins que cette offre n’ait été approuvée par l’ensemble des actionnaires et qu’un accord écrit ne soit entré en vigueur.

Ce document se fonde sur des éléments en notre possession ou qui ont été fournis, et dont nous pensons qu’ils sont fiables. Bien que nous ayons déployé tous nos efforts pour nous assurer de leur exactitude et de leur caractère complet, nous ne pouvons garantir l’absence de toute erreur.

Nous souhaitons que de telles erreurs soient portées à notre connaissance afin d’apporter les corrections nécessaires. Le vendeur ne saurait en tout état de cause être tenu responsable de tout dommage direct ou indirect ou de toute perte subie à raison d’une inexactitude ou d’une incorrection de ce document.`;
    s.addText(left, { x: 1.55, y: 2.55, w: 5.1, h: 4.5, fontFace: FONT, fontSize: 10.5, color: WHITE, valign: "top", paraSpaceAfter: 8, align: "justify", fit: "shrink" });
    s.addText(right, { x: 6.85, y: 2.55, w: 5.1, h: 4.5, fontFace: FONT, fontSize: 10.5, color: WHITE, valign: "top", paraSpaceAfter: 8, align: "justify", fit: "shrink" });
    addFooter(s);
    }
  }

  // ─────────────────── SLIDE COMPARABLES (optionnelle) ───────────────────
  if (data.includeComparables && data.comparables.length) {
    const addComparablesSlide = (title: string, rowsData: typeof data.comparables, kind: "location" | "prix") => {
    const s = pptx.addSlide();
    addDarkBackground(s);
    addTitleBar(s, title);
    addOrangeDiagonals(s);
      const sorted = [...rowsData].sort((a, b) =>
      (b.dateSignature || "").localeCompare(a.dateSignature || ""),
    ).slice(0, 12);
      const header = kind === "location"
        ? ["Date", "Enseigne", "CP", "Ville", "Surface", "Surf. pond.", "Loyer / an", "€ / m²", "€ / m²p"]
        : ["Date", "Enseignes", "CP", "Ville", "Surface", "Loyer / an", "€ / m²", "Prix", "Prix / m²", "Rdt"];
    const rows: TableRow[] = [
      header.map((h) => ({
        text: h,
          options: { bold: true, color: WHITE, fill: { color: TEAL }, align: "center", fontSize: 9, fontFace: FONT_BOLD },
      })),
        ...sorted.map((c) => {
          const surface = parseAmount(c.surface);
          const surfacePonderee = parseAmount(c.surfacePonderee);
          const loyer = parseAmount(c.loyerAnnuel);
          const prix = parseAmount(c.prixVente);
          const loyerM2 = valueOrComputed(c.loyerM2, loyer / surface);
          const loyerM2Pondere = valueOrComputed(c.loyerM2Pondere, loyer / surfacePonderee);
          const prixM2 = valueOrComputed(c.prixM2, prix / surface);
          const rendement = valueOrComputed(c.rendement, (loyer / prix) * 100, " %");
          if (kind === "location") {
            return [
              { text: c.dateSignature || "", options: { color: MUTED, align: "center", fontSize: 8 } },
              { text: c.enseigne || "", options: { color: WHITE, bold: true, fontSize: 8.5 } },
              { text: c.codePostal || "", options: { color: WHITE, align: "center", fontSize: 8 } },
              { text: c.ville || "", options: { color: WHITE, fontSize: 8 } },
              { text: c.surface || "", options: { color: WHITE, align: "right", fontSize: 8 } },
              { text: c.surfacePonderee || "", options: { color: WHITE, align: "right", fontSize: 8 } },
              { text: c.loyerAnnuel || "", options: { color: WHITE, align: "right", fontSize: 8 } },
              { text: loyerM2, options: { color: ORANGE, align: "right", bold: true, fontSize: 8 } },
              { text: loyerM2Pondere, options: { color: ORANGE, align: "right", bold: true, fontSize: 8 } },
            ];
          }
          return [
            { text: c.dateSignature || "", options: { color: MUTED, align: "center", fontSize: 8 } },
            { text: c.enseigne || "", options: { color: WHITE, bold: true, fontSize: 8 } },
            { text: c.codePostal || "", options: { color: WHITE, align: "center", fontSize: 8 } },
            { text: c.ville || "", options: { color: WHITE, fontSize: 8 } },
            { text: c.surface || "", options: { color: WHITE, align: "right", fontSize: 8 } },
            { text: c.loyerAnnuel || "", options: { color: WHITE, align: "right", fontSize: 8 } },
            { text: loyerM2, options: { color: ORANGE, align: "right", bold: true, fontSize: 8 } },
            { text: c.prixVente || "", options: { color: WHITE, align: "right", fontSize: 8 } },
            { text: prixM2, options: { color: ORANGE, align: "right", bold: true, fontSize: 8 } },
            { text: rendement, options: { color: ORANGE, align: "right", bold: true, fontSize: 8 } },
          ];
        }),
    ];
    s.addTable(rows, {
      x: 0.5, y: 1.2, w: 12.3,
        colW: kind === "location"
          ? [0.9, 2.0, 0.65, 1.2, 1.0, 1.0, 1.45, 0.9, 0.9]
          : [0.85, 1.85, 0.6, 1.05, 0.9, 1.3, 0.85, 1.35, 0.9, 0.65],
      fontFace: FONT, border: { type: "solid", color: NAVY_LIGHT, pt: 1 },
    });
    addFooter(s);
    };

    const locationComparables = data.comparables.filter((c) => (c.kind || "location") === "location");
    const priceComparables = data.comparables.filter((c) => c.kind === "prix");
    if (locationComparables.length) addComparablesSlide("COMPARABLES LOCATIFS", locationComparables, "location");
    if (priceComparables.length) addComparablesSlide("COMPARABLES PRIX DE VENTE", priceComparables, "prix");
  }
}

/** Slide finale de synthèse : tous les états locatifs du portefeuille dans un seul tableau. */
async function addPortfolioSummarySlide(pptx: PptxGenJSType, assets: BrochureData[]): Promise<void> {
  const { computeRowDurations, fmtNum: fmtN, parseAmt: pAmt } = await import("./brochure-compute");
  const s = pptx.addSlide();
  addDarkBackground(s);
  addTitleBar(s, "SYNTHÈSE DU PORTEFEUILLE");

  const headerRow = ["Ville", "Enseignes", "Surface", "Loyer annuel HC-HT", "Loyer/m²/an", "Début de bail", "Prochain Break", "WALB", "Fin du bail", "WALT"].map(
    (h) => ({ text: h, options: { bold: true, color: WHITE, fill: { color: TEAL }, fontSize: 10, align: "center" as const, fontFace: FONT_BOLD, valign: "middle" as const } })
  );

  let totalSurface = 0;
  let totalLoyer = 0;
  const dataRows: TableRow[] = [];
  for (const asset of assets) {
    const ville = asset.ville || asset.nomSite || asset.adresse || "-";
    for (const row of asset.locataires || []) {
      if (!row.enseigne && !row.surface && !row.loyerAnnuel) continue;
      const auto = computeRowDurations(row);
      const walb = (row.walb && row.walb.trim()) ? row.walb : auto.walb;
      const walt = (row.walt && row.walt.trim()) ? row.walt : auto.walt;
      const surf = pAmt(row.surface);
      const loy = pAmt(row.loyerAnnuel);
      if (Number.isFinite(surf) && surf > 0) totalSurface += surf;
      if (Number.isFinite(loy) && loy > 0) totalLoyer += loy;
      const loyerM2 = Number.isFinite(surf) && surf > 0 && Number.isFinite(loy) && loy > 0
        ? `${Math.round(loy / surf)} €/m²/an`
        : (row.loyerM2 || "");
      dataRows.push(
        [ville, row.enseigne, row.surface, row.loyerAnnuel, loyerM2, row.debutBail, row.prochainBreak, walb, row.finBail, walt]
          .map((v) => ({ text: v || "-", options: { color: WHITE, fill: { color: NAVY_LIGHT }, fontSize: 9, align: "center" as const } })) as unknown as TableRow
      );
    }
  }

  const rows: TableRow[] = [headerRow as unknown as TableRow, ...dataRows];
  const avgM2 = totalSurface > 0 ? Math.round(totalLoyer / totalSurface) : 0;
  rows.push(
    [
      "TOTAL",
      `${dataRows.length} bail(s)`,
      totalSurface ? `${fmtN(totalSurface)} m²` : "-",
      totalLoyer ? `${fmtN(totalLoyer)} €` : "-",
      avgM2 ? `${avgM2} €/m²/an` : "-",
      "", "", "", "", "",
    ].map((v) => ({ text: v, options: { bold: true, color: WHITE, fill: { color: ORANGE }, fontSize: 9.5, align: "center" as const, fontFace: FONT_BOLD } })) as unknown as TableRow
  );

  const tableW = 12.86;
  s.addTable(rows, {
    x: (13.33 - tableW) / 2, y: 1.7, w: tableW, fontFace: FONT,
    colW: [1.45, 1.5, 1.25, 1.65, 1.2, 1.32, 1.36, 0.85, 1.3, 0.98],
    border: { type: "solid", pt: 1, color: TEAL },
    autoPage: false,
  });
  addFooter(s);
}

function addTeamSlide(pptx: PptxGenJSType, data: BrochureData): void {
  // ─────────────────── SLIDE FINALE: ÉQUIPE / À PROPOS ───────────────────
  if (!isPptxMediaLite(data.settings?.fixedAProposSlide)) {

    const team = (data.settings?.team || []).filter((m) => m.name || m.email);
    const s = pptx.addSlide();
    if (addFixedImageSlide(s, data.settings?.fixedAProposSlide)) {
      // slide fixe fournie en bibliothèque (image)
    } else {
    s.background = { color: NAVY };
    s.addShape("rect", { x: 0, y: 0, w: 6.25, h: 7.5, fill: { color: LIGHT_BG }, line: { color: LIGHT_BG, width: 0 } });
    s.addShape("rect", { x: 6.28, y: 0, w: 0.08, h: 7.5, fill: { color: NAVY }, line: { color: NAVY, width: 0 } });
    s.addText("À PROPOS", { x: 0.85, y: 0.72, w: 4.5, h: 0.45, fontFace: FONT, fontSize: 18, color: TEAL, align: "center" });
    s.addText("Le cabinet WALLSBROKER est spécialisé dans l’immobilier commercial.", {
      x: 0.85, y: 1.45, w: 4.7, h: 0.9, fontFace: FONT, fontSize: 14, color: TEAL, align: "justify", fit: "shrink",
    });
    s.addText("Commerces de centre-ville et de proximité, parcs d’activités commerciales, centres commerciaux, WALLSBROKER agit aussi bien pour le compte de groupes institutionnels français et étrangers que pour celui de propriétaires privés et accompagne les enseignes dans leur stratégie de développement.", {
      x: 0.85, y: 2.5, w: 4.55, h: 2.4, fontFace: FONT, fontSize: 11, color: DARK_TEXT, align: "justify", paraSpaceAfter: 4, fit: "shrink",
    });
    s.addText("Nos métiers\n4 segments majeurs :", { x: 0.85, y: 5.0, w: 3.8, h: 0.6, fontFace: FONT, fontSize: 14, color: TEAL });
    s.addText("•   Commercialisation\n•   Conseil en implantation\n•   Montage et développement\n•   Conseil en investissement", {
      x: 0.85, y: 5.8, w: 4.4, h: 1.0, fontFace: FONT, fontSize: 10.5, color: DARK_TEXT, fit: "shrink",
    });
    addFooterLight(s);

    const slots = [
      { x: 7.55, y: 0.28 }, { x: 11.15, y: 0.28 },
      { x: 7.55, y: 2.82 }, { x: 11.15, y: 2.82 },
      { x: 7.55, y: 5.42 }, { x: 11.15, y: 5.42 },
    ];
    s.addText("PARIS", { x: 9.55, y: 2.83, w: 1.2, h: 0.35, fontFace: FONT, fontSize: 15, color: ORANGE, align: "center" });
    s.addText("LISBONNE", { x: 9.35, y: 5.45, w: 1.7, h: 0.35, fontFace: FONT, fontSize: 15, color: ORANGE, align: "center" });
    team.slice(0, 6).forEach((m, i) => {
      const slot = slots[i];
      const photo = { x: slot.x + 0.35, y: slot.y, w: 1.1, h: 1.1 };
      if (m.photo) s.addImage({ data: m.photo.dataUrl, ...photo, sizing: { type: "cover", w: photo.w, h: photo.h } });
      else s.addShape("rect", { ...photo, fill: { color: WHITE }, line: { color: WHITE, width: 1 } });
      s.addShape("rect", { ...photo, fill: { color: WHITE, transparency: 100 }, line: { color: WHITE, width: 1.5 } });
      s.addText(
        [
          { text: `${m.name || ""}\n`, options: { color: ORANGE, fontSize: 11.5, fontFace: FONT, bold: false } },
          { text: `${m.role || ""}\n`, options: { color: WHITE, fontSize: 8.5 } },
          { text: `${m.email || ""}${m.phone ? "\n" + m.phone : ""}`, options: { color: WHITE, fontSize: 8.2 } },
        ],
        { x: slot.x - 0.25, y: slot.y + 1.18, w: 2.3, h: 0.75, fontFace: FONT, align: "center", fit: "shrink" }
      );
    });
    }
  }
}

