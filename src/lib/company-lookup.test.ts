import { describe, it, expect } from "vitest";
import { pickCompany } from "./company-lookup";
import { descriptionPatch } from "./autofill";
const list = [{ siren: "123456789", nom_complet: "HOTEL LUTECE SAS" }, { siren: "987654321", nom_complet: "LUTECE IMMO SAS" }, { siren: "555555555", nom_complet: "LUTECE" }, { siren: "666666666", nom_complet: "LUTECE SARL" }];
describe("annuaire des entreprises", () => {
  it("SIREN exact", () => expect(pickCompany(list, "123 456 789", null)?.siren).toBe("123456789"));
  it("SIREN absent de la liste → rien", () => expect(pickCompany(list, "111111111", null)).toBeNull());
  it("nom ambigu → rien", () => expect(pickCompany(list, null, "Lutèce")).toBeNull());
  it("nom exact", () => expect(pickCompany(list, null, "Lutece Immo")?.siren).toBe("987654321"));
});
describe("description", () => {
  const txt = "Hôtel quatre étoiles de 162 chambres situé au cœur de Milan, proche du Duomo.";
  it("remplit si vide", () => expect(descriptionPatch("", txt)).toBe(txt));
  it("remplace la note automatique", () => expect(descriptionPatch("teaser\nHôtel", txt)).toBe(txt));
  it("ne touche pas un texte saisi", () => expect(descriptionPatch("Vu le propriétaire mardi", txt)).toBeNull());
});
it("remplace la note « Origine : »", () => expect(descriptionPatch("Origine : teaser\nType : Hôtel", "Hôtel quatre étoiles de 162 chambres situé au cœur de Milan.")).not.toBeNull());
