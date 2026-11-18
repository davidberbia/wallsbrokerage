import { describe, it, expect } from "vitest";
import { ASSET_FAMILIES, familyOf } from "./taxonomy";

describe("familles du serveur", () => {
  it("10 familles", () => expect(ASSET_FAMILIES).toHaveLength(10));
  it("hôtel → Hôtels", () => expect(familyOf("City Hôtel (murs et fonds)")).toBe("Hôtels"));
  it("logistique → Activité - Logistique", () => expect(familyOf("Logistique")).toBe("Activité - Logistique"));
  it("Habitation → Habitation", () => expect(familyOf("Habitation")).toBe("Habitation"));
});
