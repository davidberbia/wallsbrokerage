import { describe, expect, it } from "vitest";
import { canChangeLeadStage, confirmedLeadFacts } from "./lead-policy";

describe("Leads", () => {
  it("blocks a status change without a class", () => {
    expect(canChangeLeadStage("Prospection", "Avis de valeur", null)).toBe(false);
    expect(canChangeLeadStage("Prospection", "Disponible", "  ")).toBe(false);
    expect(canChangeLeadStage("Prospection", "Avis de valeur", "Bureaux")).toBe(true);
  });
  it("never fills an owner from an uncertain match", () => {
    expect(confirmedLeadFacts([{ field: "owner_company", value: "SCI Exemple", source: "https://annuaire-entreprises.data.gouv.fr/", certainty: "à vérifier" }])).toEqual({});
  });
  it("retains a confirmed publicly sourced fact", () => {
    expect(confirmedLeadFacts([{ field: "address", value: "12 rue de Paris", source: "https://adresse.data.gouv.fr/", certainty: "confirmé" }])).toEqual({ address: "12 rue de Paris" });
  });
  it("does not restore a conflicting fact when it appears a third time", () => {
    const fact = {field:"keys_count",source:"https://example.org/",certainty:"confirmé" as const};
    expect(confirmedLeadFacts([{...fact,value:29},{...fact,value:31},{...fact,value:29}])).toEqual({});
  });
});