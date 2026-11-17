import { describe, expect, it } from "vitest";
import { dealPatchFromAsset, mergeAutofill, planCategory } from "./autofill";

describe("planCategory", () => {
  it("plan de masse à part", () => expect(planCategory("plan_masse", null)).toBe("Plan de masse"));
  it("plan nommé par niveau", () => expect(planCategory("plan", "rez-de-chaussée")).toBe("Plan rez-de-chaussée"));
  it("plan premier étage conservé", () => expect(planCategory("plan", "Plan 1er étage")).toBe("Plan 1er étage"));
});

describe("mergeAutofill", () => {
  it("n'écrase jamais une valeur saisie", () => {
    const p = mergeAutofill({ surface: 500, city: null }, { surface: 800, city: "Lyon" }, "bail.pdf");
    expect(p["surface"]).toBeUndefined();
    expect(p["city"]).toBe("Lyon");
    expect(p["autofill_sources"]).toEqual(["bail.pdf"]);
  });
  it("ajoute la taxe foncière à la description", () => {
    const p = mergeAutofill({ description: "Bel actif" }, { property_tax: 12000 }, "tf.pdf");
    expect(p["description"]).toBe("Bel actif\n\nTaxe foncière : 12000 €/an");
  });
});

describe("hôtels et ligne du dossier", () => {
  it("remplit nombre de clés et chiffre d'affaires", () => {
    const p = mergeAutofill({}, { keys_count: 42, revenue: 1500000 }, "mail");
    expect(p["keys_count"]).toBe(42);
    expect(p["revenue"]).toBe(1500000);
  });
  it("complète la ligne sans écraser", () => {
    const p = dealPatchFromAsset({ surface: 300, address: null }, { surface: 900, city: "Nice", price: 2000000 });
    expect(p).toEqual({ address: "Nice", amount: 2000000 });
  });
});
