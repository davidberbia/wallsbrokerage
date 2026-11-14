import { describe, it, expect } from "vitest";
import { subjectFor } from "./subject";
describe("objet email", () => {
  it("n'ajoute pas la ville si déjà dans le nom", () => {
    expect(subjectFor({ title: "MÉRIGNAC - COMMERCES & LOISIRS", city: "Mérignac" })).toBe("Opportunité d'investissement — MÉRIGNAC - COMMERCES & LOISIRS");
  });
  it("ajoute la ville sinon", () => {
    expect(subjectFor({ title: "Retail park", city: "Lyon" })).toBe("Opportunité d'investissement — Retail park (Lyon)");
  });
});
