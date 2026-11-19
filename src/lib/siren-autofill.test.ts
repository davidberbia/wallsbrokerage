import { describe, expect, it, vi } from "vitest";
vi.mock("@/lib/siren.functions", () => ({ lookupSiren: vi.fn() }));
import { completeSiren, fillEmpty } from "./siren-autofill";

describe("autofill SIREN", () => {
  it("déclenche seulement à 9 chiffres", () => {
    expect(completeSiren("123 456 789")).toBe("123456789");
    expect(completeSiren("12345678")).toBeNull();
  });
  it("ne remplace jamais un champ déjà saisi", () => {
    expect(fillEmpty({ denomination: "Ma société", adresse: "" }, { denomination: "AUTRE", adresse: "1 rue X" }))
      .toEqual({ denomination: "Ma société", adresse: "1 rue X" });
  });
});
