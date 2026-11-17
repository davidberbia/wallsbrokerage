import { describe, it, expect } from "vitest";
import { correspondents, byDomain } from "./correspondents";

describe("correspondents", () => {
  it("masque uniquement l'adresse de l'utilisateur connecté", () => {
    const r = correspondents(["d.berbia@wallsbroker.com", "Ladislas <l.crausz@wallsbroker.com>"], ["d.berbia@wallsbroker.com"]);
    expect(r).toEqual(["l.crausz@wallsbroker.com"]);
  });
  it("masque aussi l'adresse personnelle du compte agent", () => {
    expect(correspondents(["romain@gmail.com, x@foncia.fr"], ["romain@gmail.com"])).toEqual(["x@foncia.fr"]);
  });
  it("écarte les newsletters et no-reply", () => {
    expect(correspondents(["noreply@site.fr; a@b.fr"], [])).toEqual(["a@b.fr"]);
  });
  it("regroupe les collègues d'un même domaine", () => {
    expect(byDomain(["a@x.fr", "b@y.fr", "c@x.fr"])[0]).toEqual(["x.fr", ["a@x.fr", "c@x.fr"]]);
  });
});
