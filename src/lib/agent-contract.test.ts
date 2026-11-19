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
  it("ne demande plus l'assurance RC pro et insère la clause Wallsbroker", () => {
    expect(missingContractFields({})).not.toContain("Assureur RC pro");
    expect(contractValues({}, "A B")["assurance"]).toContain("décharge expressément WALLSBROKER");
  });
  it("engage l'agent à son immatriculation RSAC et décharge Wallsbroker", () => {
    const a = contractValues({}, "A B")["assurance"] ?? "";
    expect(a).toContain("Registre spécial des agents commerciaux (RSAC)");
    expect(a).toContain("à ses seuls frais");
    expect(a.match(/décharge expressément WALLSBROKER/g)).toHaveLength(2);
  });
});

import { contractValues as cv2 } from "./agent-contract";
import { test as t2, expect as e2 } from "vitest";
t2("la date de signature reprend la date de début du contrat", () => {
  const v = cv2({ date_effet: "2025-01-01" }, "X");
  e2(v.date_signature).toBe("1er janvier 2025");
  e2(v.date_effet).toBe("1er janvier 2025");
});
