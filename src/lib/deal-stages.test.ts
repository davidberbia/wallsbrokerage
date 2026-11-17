import { describe, expect, it } from "vitest";
import { dealFee, inVintage, suiviColumn, suiviTotals } from "./deal-stages";

describe("Suivi des affaires", () => {
  it("conserve les honoraires prévus d'un dossier perdu dans son total séparé", () => {
    const lost = { stage: "Perdu", fee_amount: 12500 };
    expect(dealFee(lost)).toBe(12500);
    expect(suiviTotals([lost]).annule).toBe(12500);
  });
  it("additionne les honoraires perdus annoncés, sans montant = zéro", () => {
    expect(suiviTotals([
      { stage: "Perdu", fee_amount: 12500 },
      { stage: "Perdu", fee_amount: 7500 },
      { stage: "Perdu", fee_amount: null },
    ]).annule).toBe(20000);
  });
  it("exclut les honoraires perdus du réel et du pondéré", () => {
    const totals = suiviTotals([{ stage: "Perdu", fee_amount: 12500 }]);
    expect(totals.reel).toBe(0);
    expect(totals.pondere).toBe(0);
    expect(totals.encours).toBe(0);
    expect(totals.encaisse).toBe(0);
    expect(totals.facture).toBe(0);
  });
  it("ne reporte pas les honoraires perdus dans une autre année", () => {
    expect(inVintage({ vintage: 2025, stage: "Perdu" }, 2026)).toBe(false);
    expect(inVintage({ vintage: 2026, stage: "Perdu" }, 2026)).toBe(true);
  });
  it("acte payé = encaissé, acte non payé = facturé reste à encaisser", () => {
    expect(suiviColumn({ stage: "Vendu", paid_at: "2023-12-31" })).toBe("encaisse");
    expect(suiviColumn({ stage: "Vendu", paid_at: null })).toBe("facture");
    expect(suiviColumn({ stage: "Perdu" })).toBe("annule");
  });
  it("pondéré : promesse 75 %, LOI 50 %, annulé exclu du réel", () => {
    const t = suiviTotals([
      { stage: "Vendu", paid_at: "2023-01-01", fee_amount: 30000 },
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
