// Extraction du texte des fichiers Word, Excel, PowerPoint, CSV et texte pour lecture automatique.
import JSZip from "jszip";
import * as XLSX from "xlsx";

const MAX_CHARS = 120_000;
const xmlText = (xml: string) =>
  xml.replace(/<\/(w:p|a:p|w:tr)>/g, "\n").replace(/<w:tab\/>|<\/w:tc>/g, "\t").replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");

export function officeKind(name: string, mime: string): "word" | "excel" | "ppt" | "text" | "legacy" | null {
  const ext = name.toLowerCase().split(".").pop() ?? "";
  if (ext === "docx" || mime.includes("wordprocessingml")) return "word";
  if (["xlsx", "xlsm", "xls", "ods"].includes(ext) || mime.includes("spreadsheet") || mime.includes("ms-excel")) return "excel";
  if (ext === "pptx" || mime.includes("presentationml")) return "ppt";
  if (["csv", "txt", "tsv"].includes(ext) || mime.startsWith("text/")) return "text";
  if (ext === "doc" || ext === "ppt" || mime === "application/msword" || mime.includes("ms-powerpoint")) return "legacy";
  return null;
}

export async function officeText(bytes: Uint8Array, name: string, mime: string): Promise<string | null> {
  const kind = officeKind(name, mime);
  if (!kind) return null;
  let out = "";
  if (kind === "excel") {
    const wb = XLSX.read(bytes, { type: "array" });
    out = wb.SheetNames.map((s) => `### Feuille ${s}\n${XLSX.utils.sheet_to_csv(wb.Sheets[s]!, { FS: ";" })}`).join("\n\n");
  } else if (kind === "word" || kind === "ppt") {
    const zip = await JSZip.loadAsync(bytes);
    const files = Object.keys(zip.files)
      .filter((f) => kind === "word" ? /^word\/(document|header\d*|footer\d*)\.xml$/.test(f) : /^ppt\/slides\/slide\d+\.xml$/.test(f))
      .sort((a, b) => (parseInt(a.replace(/\D/g, "")) || 0) - (parseInt(b.replace(/\D/g, "")) || 0));
    for (const f of files) out += `${kind === "ppt" ? `### ${f.split("/").pop()}\n` : ""}${xmlText(await zip.file(f)!.async("string"))}\n`;
  } else if (kind === "text") {
    out = new TextDecoder().decode(bytes);
  } else {
    // Anciens formats binaires : récupération des chaînes lisibles.
    out = (new TextDecoder("latin1").decode(bytes).match(/[\x20-\x7E\xC0-\xFF]{4,}/g) ?? []).join(" ");
    out += " " + (new TextDecoder("utf-16le").decode(bytes).match(/[\x20-\x7E\xC0-\xFF]{4,}/g) ?? []).join(" ");
  }
  out = out.replace(/[ \t]+\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
  return out ? out.slice(0, MAX_CHARS) : null;
}
