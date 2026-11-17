import { describe, expect, it } from "vitest";
import { cityKey, cleanGroups, mergeDealFields } from "./deal-merge";

describe("Fusion des affaires à relancer", () => {
  it("même ville malgré accents et tirets", () => {
    expect(cityKey("Rte de Bourgogne, Dammarie-les-Lys")).toBe(cityKey("Av. Ampère, Dammarie-lès-Lys"));
  });
  it("complète sans écraser et garde l'adresse la plus précise", () => {
    const r = mergeDealFields(
      { id: "a", address: "Dammarie-les-Lys", surface: 500, amount: null, notes: "A" },
      [{ id: "b", address: "Route de Bourgogne, Dammarie-les-Lys", surface: 900, amount: 2000000, notes: "B" }],
    );
    expect(r["surface"]).toBeUndefined();
    expect(r["amount"]).toBe(2000000);
    expect(r["address"]).toBe("Route de Bourgogne, Dammarie-les-Lys");
    expect(r["notes"]).toBe("A\n\nB");
  });
});

describe("Propositions de fusion IA", () => {
  it("écarte les ids inconnus, les groupes d'un seul dossier et les doublons entre groupes", () => {
    const known = new Set(["a", "b", "c", "d"]);
    const r = cleanGroups([
      { ids: ["a", "b", "zz"], reason: "x" },
      { ids: ["b", "c"], reason: "y" },
      { ids: ["c", "d"], reason: "z" },
    ], known);
    expect(r).toEqual([{ ids: ["a", "b"], reason: "x" }, { ids: ["c", "d"], reason: "z" }]);
  });
});
