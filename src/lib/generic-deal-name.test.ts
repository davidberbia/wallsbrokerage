import { describe, expect, it } from "vitest";
import { isGenericDealName } from "./deal-stages";
describe("isGenericDealName", () => {
  it("rejette un mot seul", () => { expect(isGenericDealName("Hôtel")).toBe(true); expect(isGenericDealName("Immeuble")).toBe(true); expect(isGenericDealName("Hôtel 4*")).toBe(true); });
  it("accepte un nom précis", () => { expect(isGenericDealName("Domaine dans les Corbières")).toBe(false); expect(isGenericDealName("Hôtel 5* Paris 8ème")).toBe(false); });
});
