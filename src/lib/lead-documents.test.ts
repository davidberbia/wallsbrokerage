import { describe, expect, it } from "vitest";
import { canRemind, leadReminderDue, leadViewStatus, missingLeadItems } from "./lead-documents";

describe("Lead document reminders", () => {
  it("waits three calendar days", () => {
    expect(leadReminderDue(new Date("2026-11-16T09:00:00Z")).toISOString()).toBe("2026-11-19T09:00:00.000Z");
    const r = { status: "waiting", due_at: "2026-11-19T09:00:00Z", received_at: null, reminded_at: null };
    expect(canRemind(r, new Date("2026-11-19T08:59:59Z"), true)).toBe(false);
    expect(canRemind(r, new Date("2026-11-19T09:00:00Z"), true)).toBe(true);
  });
  it("moves Saturday and Sunday deadlines to Monday", () => {
    expect(leadReminderDue(new Date("2026-11-18T09:00:00Z")).toISOString()).toBe("2026-11-23T09:00:00.000Z");
    expect(leadReminderDue(new Date("2026-11-19T09:00:00Z")).toISOString()).toBe("2026-11-23T09:00:00.000Z");
  });
  it("never sends during a Paris weekend even if UTC is still Friday", () => {
    const r = { status: "waiting", due_at: "2026-11-19T09:00:00Z", received_at: null, reminded_at: null };
    expect(canRemind(r, new Date("2026-11-20T23:30:00Z"), true)).toBe(false);
    expect(canRemind(r, new Date("2026-11-22T10:00:00Z"), true)).toBe(false);
  });
  it("retains Paris time across daylight saving", () => {
    expect(leadReminderDue(new Date("2026-10-23T08:00:00Z")).toISOString()).toBe("2026-10-26T09:00:00.000Z");
  });
  it("stops on a reply, archive, or existing reminder", () => {
    const r = { status: "waiting", due_at: "2026-11-19T09:00:00Z", received_at: null, reminded_at: null };
    const now = new Date("2026-11-23T10:00:00Z");
    expect(canRemind({ ...r, received_at: "2026-11-20T09:00:00Z" }, now, true)).toBe(false);
    expect(canRemind(r, now, false)).toBe(false);
    expect(canRemind({ ...r, reminded_at: "2026-11-19T09:00:00Z" }, now, true)).toBe(false);
  });
  it("separates waiting, recall and archive", () => {
    expect(leadViewStatus("new", { status: "waiting" })).toBe("waiting");
    expect(leadViewStatus("new", { status: "reminded" })).toBe("recall");
    expect(leadViewStatus("archived", { status: "reminded" })).toBe("archived");
  });
  it("only requests tenancy documents for occupied assets", () => {
    expect(missingLeadItems({ price: 100000, surface: 100 }, ["plan.pdf", "photo.jpg"], "Local vacant")).toEqual([]);
    expect(missingLeadItems({ price: 100000, surface: 100, rent: 10000 }, ["plan.pdf", "photo.jpg"], "")).toEqual(["Bail", "État locatif", "Décompte de charges", "Taxe foncière"]);
  });
  it("only requests hotel keys and category for hotels", () => {
    expect(missingLeadItems({ asset_class: "Hôtel", price: 100, surface: 10 }, ["plan.pdf", "photo.jpg"], "")).toEqual(["Nombre de clés / chambres", "Catégorie de l’hôtel"]);
    expect(missingLeadItems({ asset_class: "Restaurant", price: 100, surface: 10 }, ["plan.pdf", "photo.jpg"], "")).toEqual([]);
  });
});
import { guessFirstName, documentMail, mailParts } from "./lead-documents";
describe("prénom reconstitué", () => {
  it("bernard@ donne Bernard", () => expect(guessFirstName(null, "bernard@groupwinimmo.fr")).toBe("Bernard"));
  it("jean.dupont@ donne Jean", () => expect(guessFirstName("", "jean.dupont@x.fr")).toBe("Jean"));
  it("adresses génériques ou initiales : pas de prénom", () => {
    expect(guessFirstName(null, "contact@x.fr")).toBe("");
    expect(guessFirstName(null, "a.dupont@x.fr")).toBe("");
  });
  it("la relance reprend prénom et signature", () => {
    const m = documentMail("Dossier", ["Plans"], false, null, "Bernard", "David Berbia\nWallsbroker");
    expect(m.body.startsWith("Bonjour Bernard,")).toBe(true);
    expect(mailParts(m.body)).toEqual({ firstName: "Bernard", signature: "David Berbia\nWallsbroker" });
  });
});
