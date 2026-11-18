import { describe, expect, it } from "vitest";
import { leadResearchSchema, confirmedLeadFacts } from "./lead-policy";

describe("sources de l'enquête", () => {
  it("accepte un fait lu dans une pièce jointe", () => {
    const r = leadResearchSchema.parse({ facts: [{ field: "occupant", value: "Hôtel X", source: "document: 75_0027.pdf", certainty: "confirmé" }] });
    expect(confirmedLeadFacts(r.facts)).toEqual({ occupant: "Hôtel X" });
  });
  it("écarte un fait sans source sans faire échouer l'enquête", () => {
    const r = leadResearchSchema.safeParse({ summary: "ok", facts: [{ field: "city", value: "Paris", source: "", certainty: "confirmé" }, { field: "price", value: 10, source: "https://a.fr/x", certainty: "confirmé" }] });
    expect(r.success).toBe(true);
    expect(r.success && confirmedLeadFacts(r.data.facts)).toEqual({ price: 10 });
  });
});
