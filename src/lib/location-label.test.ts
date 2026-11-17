import { describe, it, expect } from "vitest";
import { locationLabel } from "./taxonomy";
describe("locationLabel", () => {
  it("commercial: ville puis adresse", () => expect(locationLabel("Bureaux", "Lyon", "12 rue X")).toBe("Lyon · 12 rue X"));
  it("hôtel: ville puis adresse", () => expect(locationLabel("City Hôtel (sans fonds)", "Paris", "3 av Y")).toBe("Paris · 3 av Y"));
  it("logement: adresse puis ville", () => expect(locationLabel("Appartement", "Paris", "3 av Y")).toBe("3 av Y · Paris"));
});
import { guessClassFromName } from "./taxonomy";
describe("guessClassFromName", () => {
  it("hôtel", () => expect(guessClassFromName("HOTEL4* MILAN")).toBe("City Hôtel (sans fonds)"));
  it("bureaux", () => expect(guessClassFromName("Immeuble de bureaux occupé")).toBe("Bureaux"));
});
import { shortClassLabel } from "./taxonomy";
it("libellé court hôtel", () => expect(shortClassLabel("City Hôtel (murs et fonds)")).toBe("Hôtel"));
