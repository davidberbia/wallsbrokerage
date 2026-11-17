import { describe, expect, it } from "vitest";
import { addOneYear, fillTemplate, templateToHtml, withSignatures, templateKind } from "./mandate-template";

describe("fin de mandat", () => {
  it("ajoute un an à la date de début", () => {
    expect(addOneYear("2026-11-16")).toBe("2027-11-16");
  });
  it("gère le 29 février", () => {
    expect(addOneYear("2028-02-29")).toBe("2029-02-28");
  });
});

describe("remplissage", () => {
  it("garde les champs non renseignés visibles", () => {
    expect(fillTemplate("N° {{numero}} {{prix}}", { numero: "202193" })).toBe("N° 202193 {{prix}}");
  });
});

describe("signatures", () => {
  it("remplace les anciennes mentions par celles du Mandant et du Mandataire", () => {
    const html = templateToHtml(withSignatures("Texte\n\n« Lu et approuvé, bon pour mandat » — LE MANDANT\n« Lu et approuvé, mandat accepté » — LE MANDATAIRE"), "t");
    expect(html).toContain("Lu et accepté, Bon pour Mandat");
    expect(html).toContain("Lu et Mandat accepté");
    expect(html).not.toContain("Lu et approuvé");
  });
  it("choisit le modèle location", () => {
    expect(templateKind("Mandat de location")).toBe("location");
  });
});

describe("mise en page", () => {
  const body = "Inscription N° {{numero}}\n\n{{mandant}}, demeurant {{mandant_adresse}},\nci-après dénommé(e) « LE MANDANT », d'une part,\n\n## I - DÉSIGNATION\n\n{{designation}}, situé(e) {{adresse_bien}}.\n\n---\n\n## FORMULAIRE DE RÉTRACTATION\n\nJe vous notifie…";
  const html = templateToHtml(fillTemplate(body, { numero: "202193", mandant: "SCI TEST", designation: "Portefeuille", etat_locatif: "| Adresse | Loyer |\n| 1 rue A | 10 € |" }), "t");
  it("supprime le formulaire de rétractation", () => {
    expect(html).not.toContain("FORMULAIRE DE RÉTRACTATION");
  });
  it("met le Mandant en gras", () => {
    expect(html).toContain("<strong>SCI TEST</strong>");
  });
  it("aligne à droite les lignes ci-après dénommé", () => {
    expect(html).toContain('text-align:right;margin:-6px 0 10px">ci-après');
  });
  it("place les paraphes des deux parties", () => {
    expect(html).toContain("\\inimandant\\");
    expect(html).toContain("\\inimandataire\\");
  });
  it("reprend l'état locatif du portefeuille", () => {
    expect(html).toContain("<td");
    expect(html).toContain("1 rue A");
  });
});
