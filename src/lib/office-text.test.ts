import { describe, it, expect } from "vitest";
import * as XLSX from "xlsx";
import JSZip from "jszip";
import { officeText } from "./office-text.server";

describe("officeText", () => {
  it("lit un état locatif Excel", async () => {
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet([["Locataire", "Loyer"], ["Carrefour", 125000]]), "EL");
    const buf = new Uint8Array(XLSX.write(wb, { type: "array", bookType: "xlsx" }));
    expect(await officeText(buf, "etat.xlsx", "")).toContain("Carrefour;125000");
  });
  it("lit un bail Word", async () => {
    const zip = new JSZip();
    zip.file("word/document.xml", "<w:document><w:p><w:r><w:t>Loyer annuel 48 000 €</w:t></w:r></w:p></w:document>");
    const buf = await zip.generateAsync({ type: "uint8array" });
    expect(await officeText(buf, "bail.docx", "")).toContain("Loyer annuel 48 000 €");
  });
});
