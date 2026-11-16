import { describe, expect, it } from "vitest";
import { publicAddress } from "./public-address";
describe("publicAddress", () => {
  it("garde l'adresse complète par défaut", () => expect(publicAddress("12 rue de Rivoli", false, false)).toBe("12 rue de Rivoli"));
  it("masque le numéro", () => expect(publicAddress("12 bis, rue de Rivoli", true, false)).toBe("rue de Rivoli"));
  it("masquer la rue masque aussi le numéro", () => expect(publicAddress("12 rue de Rivoli", false, true)).toBeNull());
});
