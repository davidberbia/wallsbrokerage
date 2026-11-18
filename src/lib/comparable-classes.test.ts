import { describe, expect, it } from "vitest";
import { COMPARABLE_CLASSES, normalizeAssetClass } from "./comparable-classes";

describe("normalizeAssetClass", () => {
  it("ne connaît que les 6 classes, dans l'ordre alphabétique", () => {
    expect([...COMPARABLE_CLASSES]).toEqual([
      "Activité",
      "Bureaux",
      "Commerce centre-ville",
      "Commerce périphérie",
      "Habitation",
      "Logistique",
    ]);
  });

  it("regroupe les anciennes typologies libres", () => {
    expect(normalizeAssetClass("Boulangerie")).toBe("Commerce centre-ville");
    expect(normalizeAssetClass("Hôtel")).toBe("Commerce centre-ville");
    expect(normalizeAssetClass("Cabinet Médical / Centre Dentaire")).toBe("Commerce centre-ville");
    expect(normalizeAssetClass("Supermarché")).toBe("Commerce périphérie");
    expect(normalizeAssetClass("Club De Sport")).toBe("Commerce périphérie");
    expect(normalizeAssetClass("Centre D'affaire")).toBe("Bureaux");
    expect(normalizeAssetClass("Activité / Logistique")).toBe("Logistique");
    expect(normalizeAssetClass("Industrial Warehouse")).toBe("Logistique");
    expect(normalizeAssetClass("Acti")).toBe("Activité");
    expect(normalizeAssetClass("Coliving")).toBe("Habitation");
    expect(normalizeAssetClass("Habitation")).toBe("Habitation");
  });

  it("laisse vide ce qui est hors champ", () => {
    expect(normalizeAssetClass("Terrain")).toBeNull();
    expect(normalizeAssetClass("Divers")).toBeNull();
    expect(normalizeAssetClass("")).toBeNull();
    expect(normalizeAssetClass(null)).toBeNull();
  });
});
