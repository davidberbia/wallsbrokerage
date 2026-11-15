import { describe, expect, it } from "vitest";
import { acquisitionCost, comparableMetric } from "./comparable-metrics";
describe("ratios des comparables", () => {
  it("location : loyer annuel par m²", () => expect(comparableMetric({kind:"location",rent:24000,surface:100}).value).toBe(240));
  it("hôtel : prix par clé", () => expect(comparableMetric({kind:"vente",asset_class:"City Hôtel",price:2000000,acquisition_details:{keys:40}}).value).toBe(50000));
  it("appartement : prix par m²", () => expect(comparableMetric({kind:"vente",asset_class:"Appartement",price:300000,surface:60}).value).toBe(5000));
  it("honoraires par défaut 3 % HT et TVA", () => expect(acquisitionCost(1000000,{notary_total:80000})).toBe(1116000));
  it("frais réduits éligibles de 1,8 %", () => expect(acquisitionCost(1000000,{reduced_eligible:true,agency_included:true})).toBe(1018000));
  it("pas de rendement exact sans frais connus", () => expect(acquisitionCost(1000000,{})).toBeNull());
  it("aucune division sans clés", () => expect(comparableMetric({kind:"vente",asset_class:"Hôtel",price:2000000}).value).toBeNull());
});