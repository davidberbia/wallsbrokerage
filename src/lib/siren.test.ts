import { describe, expect, it } from "vitest";
import { mandantText, pickRepresentative } from "./siren";

describe("siren", () => {
  it("prend le Président avant les membres du conseil de surveillance", () => {
    expect(pickRepresentative([
      { nom: "ZHANG", prenoms: "ZUTONG", qualite: "Membre du conseil de surveillance" },
      { nom: "MARTIN", prenoms: "PAUL", qualite: "Gérant" },
    ])).toEqual({ name: "PAUL MARTIN", role: "Gérant" });
  });
  it("la procuration remplace le représentant légal dans le mandat", () => {
    const t = mandantText("morale", "SCI X", { company_name: "SCI X", siren: "123456789", representative: "Paul Martin", representative_role: "Gérant", proxy_name: "Jean Dupont" });
    expect(t).toContain("Jean Dupont, agissant par procuration");
    expect(t).not.toContain("Paul Martin");
  });
});
