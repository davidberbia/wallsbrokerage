import { describe, expect, it } from "vitest";
import { contractValues, fillDocumentXml, missingContractFields } from "./agent-contract";

describe("contrat agent", () => {
  it("la quote-part Wallsbroker complète celle de l'agent à 100 %", () => {
    expect(contractValues({ quote_agent: "60" }, "A B")["quote_wallsbroker"]).toBe("40");
  });
  it("bloque l'envoi tant qu'un champ obligatoire manque", () => {
    expect(missingContractFields({ denomination: "X" })).toContain("SIREN");
  });
  it("échappe les caractères spéciaux dans le Word", () => {
    expect(fillDocumentXml("<w:t>{{denomination}}</w:t>", { denomination: "A & B" })).toBe("<w:t>A &amp; B</w:t>");
  });
});
