import { describe, expect, it } from "vitest";
import { homeDestination, matchesAssetSearch } from "./list-search";

describe("Accueil", () => {
  it("ouvre les affaires en cours pour les commerciaux", () =>
    expect(homeDestination(true)).toBe("/dossiers"));
  it("conserve le profil pour les acquéreurs", () =>
    expect(homeDestination(false)).toBe("/mon-profil"));
});
describe("Recherche actifs", () => {
  const asset = {
    title: "Commerce",
    city: "Évry",
    address: "12 rue de la République",
    reference: "WB-12",
    postal_code: "91000",
  };
  it("recherche la ville sans accents ni distinction de casse", () => {
    expect(matchesAssetSearch(asset, "EVRY")).toBe(true);
    expect(matchesAssetSearch(asset, "Paris")).toBe(false);
  });
  it("recherche la rue seule ou avec la ville", () => {
    expect(matchesAssetSearch(asset, "republique evry")).toBe(true);
    expect(matchesAssetSearch(asset, "republique paris")).toBe(false);
  });
  it("recherche également référence et code postal", () => {
    expect(matchesAssetSearch(asset, "WB-12 91000")).toBe(true);
    expect(matchesAssetSearch(asset, "92000")).toBe(false);
  });
});
