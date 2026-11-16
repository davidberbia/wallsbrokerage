import { describe, expect, it } from "vitest";
import { inVintage, suiviColumn, suiviTotals } from "./deal-stages";

describe("Suivi des affaires", () => {
  it("acte payé = encaissé, acte non payé = facturé reste à encaisser", () => {
    expect(suiviColumn({ stage: "Acte", paid_at: "2023-12-31" })).toBe("encaisse");
    expect(suiviColumn({ stage: "Acte", paid_at: null })).toBe("facture");
    expect(suiviColumn({ stage: "Perdu" })).toBe("annule");
  });
  it("pondéré : promesse 75 %, LOI 50 %, annulé exclu du réel", () => {
    const t = suiviTotals([
      { stage: "Acte", paid_at: "2023-01-01", fee_amount: 30000 },
      { stage: "Promesse", fee_amount: 40000 },
      { stage: "LOI acceptée", fee_amount: 50000 },
      { stage: "Perdu", fee_amount: 100000 },
    ]);
    expect(t.reel).toBe(120000);
    expect(t.pondere).toBe(30000 + 30000 + 25000);
    expect(t.annule).toBe(100000);
  });
  it("une affaire historique non reportée ne remplit pas les années suivantes", () => {
    expect(inVintage({ vintage: 2023, stage: "Promesse", carry_over: false }, 2026)).toBe(false);
    expect(inVintage({ vintage: 2025, stage: "Promesse" }, 2026)).toBe(true);
  });
});
