import { describe, it, expect } from "vitest";
import { searchClass, isBigCity } from "./comparables.functions";

describe("règles de recherche des comparables", () => {
  it("habitation passe par DVF", () => expect(searchClass("Appartement")).toBe("Habitation"));
  it("bureaux", () => expect(searchClass("Bureaux")).toBe("Bureaux"));
  it("activité / logistique", () => expect(searchClass("Entrepôt logistique")).toBe("Logistique"));
  it("commerce de périphérie", () => expect(searchClass("Commerce", "peripherie")).toBe("Commerce périphérie"));
  it("commerce de centre-ville par défaut", () => expect(searchClass("Commerce", "centre-ville")).toBe("Commerce centre-ville"));
  it("Lyon dépasse 100 000 habitants", () => expect(isBigCity("Lyon")).toBe(true));
  it("Sochaux est sous 100 000 habitants", () => expect(isBigCity("Sochaux")).toBe(false));
});
