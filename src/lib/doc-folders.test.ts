import { describe, it, expect } from "vitest";
import { docFolder } from "./doc-folders";
describe("docFolder", () => {
  it("range baux, Kbis, états locatifs et Excel dans Baux", () => {
    for (const n of ["Bail commercial.pdf", "Avenant 2.pdf", "Kbis.pdf", "Etat locatif.pdf", "loyers.xlsx", "Décompte charges.pdf"]) expect(docFolder(n)).toBe("Baux");
  });
  it("range les plans et cadastres dans Plans", () => {
    expect(docFolder("Plan RDC.pdf")).toBe("Plans");
    expect(docFolder("cadastre.pdf")).toBe("Plans");
  });
  it("laisse teasers et présentations à la racine", () => {
    expect(docFolder("Teaser vendeur.pdf")).toBe("racine");
    expect(docFolder("Présentation actif.pdf")).toBe("racine");
  });
});
