import { describe, expect, it } from "vitest";
import { addOneYear, fillTemplate } from "./mandate-template";

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
