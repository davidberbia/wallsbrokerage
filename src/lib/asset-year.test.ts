import { describe, expect, it } from "vitest";
import { assetYears, matchesAssetYear } from "./asset-year";

describe("année du dossier serveur", () => {
  it("filtre sur 2023 même si la fiche a été créée en 2026", () => {
    const asset = { nas_year: 2023, created_at: "2026-11-18" };
    expect(matchesAssetYear(asset, "2023")).toBe(true);
    expect(matchesAssetYear(asset, "2026")).toBe(false);
  });
  it("ne déduit pas d’année pour une fiche manuelle", () => {
    const asset = { nas_year: null, created_at: "2026-11-18" };
    expect(matchesAssetYear(asset, "none")).toBe(true);
    expect(matchesAssetYear(asset, "2026")).toBe(false);
    expect(matchesAssetYear(asset, "all")).toBe(true);
  });
  it("propose les années connues sans doublon", () => {
    expect(assetYears([{ nas_year: 2023 }, { nas_year: 2026 }, { nas_year: 2023 }, {}])).toEqual([2026, 2023]);
  });
});