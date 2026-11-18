import { describe, it, expect } from "vitest";
import { stripSenderContacts, addressKey } from "./lead-policy";

describe("verrou confrère", () => {
  it("efface un contact qui est l'expéditeur du mail", () => {
    const r = stripSenderContacts({ contact_name: "Bernard Buisson", contact_email: "b.buisson@winimmo.fr", contact_phone: "0600000000" }, [{ email: "b.buisson@winimmo.fr", name: "Bernard BUISSON" }]);
    expect(r).toEqual({ contact_name: null, contact_email: null, contact_phone: null });
  });
  it("efface un e-mail du même cabinet que l'expéditeur", () => {
    expect(stripSenderContacts({ contact_email: "contact@winimmo.fr" }, [{ email: "b.buisson@winimmo.fr" }]).contact_email).toBeNull();
  });
  it("garde le contact de l'hôtel", () => {
    expect(stripSenderContacts({ contact_name: "Éric Tronconi", contact_email: "contact@hotelbusby.com" }, [{ email: "b.buisson@winimmo.fr", name: "Bernard Buisson" }]).contact_email).toBe("contact@hotelbusby.com");
  });
  it("ne bloque pas un domaine de messagerie grand public", () => {
    expect(stripSenderContacts({ contact_email: "proprio@gmail.com" }, [{ email: "agent@gmail.com" }]).contact_email).toBe("proprio@gmail.com");
  });
});

describe("clé d'adresse anti-doublon", () => {
  it("rapproche deux écritures de la même adresse", () => {
    expect(addressKey("188 rue de Crimée, 75019 Paris")).toBe(addressKey("188, Rue de Crimee 75019 PARIS"));
  });
  it("sans numéro, pas de clé", () => { expect(addressKey("Parc Technologique, Villefontaine")).toBeNull(); });
});
