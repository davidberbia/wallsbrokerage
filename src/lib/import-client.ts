// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
// Client-side helpers to extract raw text AND images from PPTX / DOCX / PDF.
import JSZip from "jszip";

export type ImportedMedia = { dataUrl: string; name: string; category: "photos" | "plans" };

function stripXmlTags(xml: string): string {
  return xml
    .replace(/<a:t[^>]*>([\s\S]*?)<\/a:t>/g, "$1\n")
    .replace(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g, "$1 ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x[0-9a-f]+;/gi, " ")
    .replace(/\s+\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .trim();
}

function isPlanText(t: string): boolean {
  return /\b(plan|cadastre|masse|surface|niveau|rdc|r\+1|coupe|élévation|elevation)\b/i.test(t);
}
function isPhotoText(t: string): boolean {
  return /\b(reportage|photo|photos|visuel|extérieur|exterieur|intérieur|interieur|fa[cç]ade)\b/i.test(t);
}

function isReportageSlideText(t: string): boolean {
  return /\breportage\b[\s\S]{0,80}\bphotos?\b/i.test(t);
}

function isLikelyLogoOrIcon(blob: Blob, filename: string): boolean {
  if (blob.size < 15000) return true;
  // Many logos/icons in the reference PPTX are small square/transparent PNGs.
  return /logo|picto|icon/i.test(filename);
}

async function blobToDataUrl(blob: Blob): Promise<string> {
  return await new Promise((res) => {
    const fr = new FileReader();
    fr.onload = () => res(fr.result as string);
    fr.readAsDataURL(blob);
  });
}

export async function extractPptxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const slideFiles = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .sort((a, b) => parseInt(a.match(/slide(\d+)/)![1]) - parseInt(b.match(/slide(\d+)/)![1]));
  const parts: string[] = [];
  for (const name of slideFiles) {
    const xml = await zip.files[name].async("string");
    parts.push(`--- SLIDE ${name.match(/slide(\d+)/)![1]} ---\n${stripXmlTags(xml)}`);
  }
  return parts.join("\n\n");
}

export async function extractDocxText(file: File): Promise<string> {
  const zip = await JSZip.loadAsync(file);
  const doc = zip.file("word/document.xml");
  if (!doc) throw new Error("Fichier DOCX invalide (word/document.xml manquant)");
  const xml = await doc.async("string");
  return stripXmlTags(xml);
}

async function extractPptxImages(file: File): Promise<ImportedMedia[]> {
  const zip = await JSZip.loadAsync(file);
  // Map each slide → its list of media targets via rels
  const slideNums = Object.keys(zip.files)
    .filter((n) => /^ppt\/slides\/slide\d+\.xml$/.test(n))
    .map((n) => parseInt(n.match(/slide(\d+)/)![1]))
    .sort((a, b) => a - b);

  const seen = new Set<string>();
  const out: ImportedMedia[] = [];
  for (const n of slideNums) {
    const xmlFile = zip.file(`ppt/slides/slide${n}.xml`);
    const relFile = zip.file(`ppt/slides/_rels/slide${n}.xml.rels`);
    if (!xmlFile || !relFile) continue;
    const slideText = stripXmlTags(await xmlFile.async("string"));
    const rels = await relFile.async("string");
    const targets = [...rels.matchAll(/Target="\.\.\/media\/([^"]+)"/g)].map((m) => m[1]);
    const isPlan = isPlanText(slideText);
    const isPhoto = isPhotoText(slideText) && isReportageSlideText(slideText);
    // N'extraire les médias que des slides explicitement photos/plans.
    // Évite d'importer les cartes, logos, pictos et portraits équipe comme reportage photos.
    if (!isPlan && !isPhoto) continue;
    for (const t of targets) {
      if (seen.has(t)) continue;
      if (!/\.(png|jpe?g|webp)$/i.test(t)) continue;
      seen.add(t);
      const f = zip.file(`ppt/media/${t}`);
      if (!f) continue;
      const blob = await f.async("blob");
      if (isLikelyLogoOrIcon(blob, t)) continue;
      const dataUrl = await blobToDataUrl(blob);
      out.push({
        dataUrl,
        name: t,
        category: isPlan && !isPhoto ? "plans" : "photos",
      });
    }
  }
  return out;
}

async function extractDocxImages(file: File): Promise<ImportedMedia[]> {
  const zip = await JSZip.loadAsync(file);
  const out: ImportedMedia[] = [];
  const mediaNames = Object.keys(zip.files).filter((n) => /^word\/media\/.+\.(png|jpe?g|webp)$/i.test(n));
  for (const n of mediaNames) {
    const blob = await zip.file(n)!.async("blob");
    if (blob.size < 15000) continue;
    const dataUrl = await blobToDataUrl(blob);
    out.push({ dataUrl, name: n.split("/").pop()!, category: "photos" });
  }
  return out;
}

async function extractPdfImages(file: File): Promise<{ images: ImportedMedia[]; text: string }> {
  // Render each PDF page as a JPEG, categorize by page-text keywords.
  const pdfjs = await import("pdfjs-dist");
  // Vite serves the worker as a static asset via ?url.
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  (pdfjs as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
  const buf = await file.arrayBuffer();
  const loadingTask = pdfjs.getDocument({ data: buf } as Parameters<typeof pdfjs.getDocument>[0]);
  const doc = await loadingTask.promise;
  const out: ImportedMedia[] = [];
  const textParts: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    const page = await doc.getPage(p);
    const tc = await page.getTextContent();
    const pageText = tc.items.map((it) => ("str" in it ? (it as { str: string }).str : "")).join(" ");
    textParts.push(`--- PAGE ${p} ---\n${pageText}`);

    // Only render pages that look like photos or plans
    const isPhoto = isPhotoText(pageText);
    const isPlan = isPlanText(pageText);
    if (!isPhoto && !isPlan) continue;

    const viewport = page.getViewport({ scale: 1.6 });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
    const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
    out.push({
      dataUrl,
      name: `page-${p}.jpg`,
      category: isPlan && !isPhoto ? "plans" : "photos",
    });
  }
  return { images: out, text: textParts.join("\n\n") };
}

export async function fileToBase64(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    bin += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(bin);
}

export type ExtractedFile =
  | { kind: "text"; text: string; filename: string; images: ImportedMedia[] }
  | { kind: "pdf"; base64: string; filename: string; images: ImportedMedia[] };

export async function extractAny(file: File): Promise<ExtractedFile> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".pptx")) {
    const [text, images] = await Promise.all([extractPptxText(file), extractPptxImages(file)]);
    return { kind: "text", text, filename: file.name, images };
  }
  if (name.endsWith(".docx")) {
    const [text, images] = await Promise.all([extractDocxText(file), extractDocxImages(file)]);
    return { kind: "text", text, filename: file.name, images };
  }
  if (name.endsWith(".pdf")) {
    // Image extraction from PDF is best-effort — a pdfjs runtime failure must
    // NOT block the AI-based text import. Continue with an empty images list.
    let images: ImportedMedia[] = [];
    try {
      const res = await extractPdfImages(file);
      images = res.images;
    } catch (e) {
      console.warn("PDF image extraction failed, continuing without images:", e);
    }
    const base64 = await fileToBase64(file);
    return { kind: "pdf", base64, filename: file.name, images };
  }
  throw new Error("Format non supporté (PPTX, DOCX ou PDF).");
}
