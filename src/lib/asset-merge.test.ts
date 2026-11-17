import { describe, expect, it } from "vitest";
import { mergeAssetFields } from "./asset-merge";

describe("Fusion des actifs", () => {
  it("complète les champs vides sans écraser", () => {
    const r = mergeAssetFields(
      { id: "a", surface: 800, price: null, reference: null, description: "A" },
      [{ id: "b", surface: 900, price: 2000000, reference: "202170", description: "B" }],
    );
    expect(r["surface"]).toBeUndefined();
    expect(r["price"]).toBe(2000000);
    expect(r["reference"]).toBe("202170");
    expect(r["description"]).toBe("A\n\nB");
  });
  it("cumule les lots de portefeuille", () => {
    const r = mergeAssetFields({ id: "a", portfolio_lots: [{ city: "X" }] }, [{ id: "b", is_portfolio: true, portfolio_lots: [{ city: "Y" }] }]);
    expect((r["portfolio_lots"] as unknown[]).length).toBe(2);
    expect(r["is_portfolio"]).toBe(true);
  });
});
