import { describe, it, expect } from "vitest";
import { matchAsset, categorize, completeComparable } from "./nas-match";

const assets = [
  { id: "a", title: "Murs Sochaux", city: "Sochaux", address: "12 rue de Montbéliard" },
  { id: "b", title: "Boutique", city: "Paris", address: "45 rue du Faubourg Saint-Honoré" },
  { id: "c", title: "Bureaux", city: "Paris", address: "8 avenue de l'Opéra" },
];

describe("rattachement NAS", () => {
  it("rattache un dossier d'adresse parisienne à la bonne fiche", () => {
    expect(matchAsset(assets, "Paris", "45 Rue du Faubourg Saint Honoré")).toEqual({ kind: "one", id: "b" });
  });
  it("rattache un dossier ville seule quand un seul actif existe dans la ville", () => {
    expect(matchAsset(assets, "SOCHAUX", "Sochaux")).toEqual({ kind: "one", id: "a" });
  });
  it("ne fusionne pas en cas de doute : à rattacher", () => {
    expect(matchAsset(assets, "Paris", "Paris").kind).toBe("many");
  });
  it("aucun actif connu : nouvelle fiche", () => {
    expect(matchAsset(assets, "Lyon", "3 place Bellecour")).toEqual({ kind: "none" });
  });
  it("classe plans, photos et documents", () => {
    expect(categorize("Plan RDC.pdf")).toBe("plan");
    expect(categorize("IMG_001.JPG")).toBe("photo");
    expect(categorize("Bail commercial.pdf")).toBe("document");
  });
  it("surface pondérée à 65 % quand elle manque", () => {
    expect(completeComparable({ surface: 100, rent: 20000 })).toMatchObject({ weighted_surface: 65, rent_m2: 200 });
  });
});
