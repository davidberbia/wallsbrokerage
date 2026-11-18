import { describe, expect, it } from "vitest";
import { anonymizeAsset, inviteQueue, kindForDate } from "./linkedin";

describe("linkedin", () => {
  it("anonymise un actif parisien", () => {
    expect(anonymizeAsset({ asset_class: "Habitation", asset_subclass: "hôtel particulier", surface: 450, postal_code: "75017", city: "Paris", price: 6_500_000 }))
      .toBe("Hôtel particulier de 450 m² à vendre dans le 17e à 6,5 M€ NV");
  });
  it("jour mensuel prioritaire, lundi actifs, mercredi spécialité", () => {
    expect(kindForDate(new Date(2026, 10, 16), 5)).toBe("actifs");
    expect(kindForDate(new Date(2026, 10, 18), 5)).toBe("specialite");
    expect(kindForDate(new Date(2026, 10, 16), 16)).toBe("marche");
  });
  it("invitations du plus récent au plus ancien", () => {
    const q = inviteQueue([{ id: "a", created_at: "2025-01-01" }, { id: "b", created_at: "2026-01-01" }, { id: "c", created_at: "2026-06-01" }], new Set(["c"]), 10);
    expect(q.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
