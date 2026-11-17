import { describe, it, expect } from "vitest";
import { locationLabel } from "./taxonomy";
describe("locationLabel", () => {
  it("commercial: ville puis adresse", () => expect(locationLabel("Bureaux", "Lyon", "12 rue X")).toBe("Lyon · 12 rue X"));
  it("hôtel: ville puis adresse", () => expect(locationLabel("City Hôtel (sans fonds)", "Paris", "3 av Y")).toBe("Paris · 3 av Y"));
  it("logement: adresse puis ville", () => expect(locationLabel("Appartement", "Paris", "3 av Y")).toBe("3 av Y · Paris"));
});
import { shortClassLabel } from "./taxonomy";
it("libellé court hôtel", () => expect(shortClassLabel("City Hôtel (murs et fonds)")).toBe("Hôtel"));
import { mergeAutofill } from "./autofill";
it("classe remplie depuis la pièce jointe si vide", () => expect(mergeAutofill({ asset_class: null }, { asset_class: "Bureaux" }, "x")["asset_class"]).toBe("Bureaux"));
it("classe hors liste ignorée", () => expect(mergeAutofill({ asset_class: null }, { asset_class: "Château" }, "x")["asset_class"]).toBeUndefined());
it("classe déjà saisie conservée", () => expect(mergeAutofill({ asset_class: "Maison" }, { asset_class: "Bureaux" }, "x")["asset_class"]).toBeUndefined());
import { classPatch } from "./autofill";
import { guessClassFromName } from "./taxonomy";
describe("classe d'actif par source", () => {
  it("intitulé Hôtel → hôtel", () => expect(guessClassFromName("HOTEL4* MILAN")).toBe("City Hôtel (sans fonds)"));
  it("pièce jointe corrige l'objet", () => expect(classPatch({ asset_class: "City Hôtel (sans fonds)", asset_class_source: "subject" }, "Bureaux", "attachment")).toEqual({ asset_class: "Bureaux", asset_class_source: "attachment" }));
  it("corps corrige l'objet", () => expect(classPatch({ asset_class: "Maison", asset_class_source: "subject" }, "Bureaux", "body")["asset_class"]).toBe("Bureaux"));
  it("objet ne corrige pas la pièce jointe", () => expect(classPatch({ asset_class: "Bureaux", asset_class_source: "attachment" }, "Maison", "subject")).toEqual({}));
  it("saisie manuelle jamais écrasée", () => expect(classPatch({ asset_class: "Maison", asset_class_source: "manual" }, "Bureaux", "attachment")).toEqual({}));
});
