import { describe, expect, it } from "vitest";
import { anonymizeAsset, canInviteNow, inviteQueue, inviteWaitMinutes, kindsForDate, monthPlan } from "./linkedin";

describe("linkedin", () => {
  it("anonymise un actif parisien", () => {
    expect(anonymizeAsset({ asset_class: "Habitation", asset_subclass: "hôtel particulier", surface: 450, postal_code: "75017", city: "Paris", price: 6_500_000 }))
      .toBe("Hôtel particulier de 450 m² à vendre dans le 17e à 6,5 M€ NV");
  });
  it("actifs alternés lundi/mardi, spécialité jeudi/vendredi", () => {
    // Semaine 47 (impaire) : mardi 17 et vendredi 20 nov. 2026 ; semaine 48 (paire) : lundi 23 et jeudi 26.
    expect(kindsForDate(new Date(2026, 10, 16), 5)).toEqual([]);
    expect(kindsForDate(new Date(2026, 10, 17), 5)).toEqual(["actifs"]);
    expect(kindsForDate(new Date(2026, 10, 20), 5)).toEqual(["specialite"]);
    expect(kindsForDate(new Date(2026, 10, 23), 5)).toEqual(["actifs"]);
    expect(kindsForDate(new Date(2026, 10, 26), 5)).toEqual(["specialite"]);
    expect(kindsForDate(new Date(2026, 10, 18), 18)).toEqual(["marche"]);
  });
  it("planning du mois : un actifs et un spécialité par semaine, un point marché", () => {
    const p = monthPlan(new Date(2026, 11, 1), 10);
    expect(p.filter((x) => x.kind === "marche").map((x) => x.date)).toEqual(["2026-12-10"]);
    expect(p.filter((x) => x.kind === "actifs").length).toBe(5);
  });
  it("invitations du plus récent au plus ancien, 10 max", () => {
    const q = inviteQueue([{ id: "a", created_at: "2025-01-01" }, { id: "b", created_at: "2026-01-01" }, { id: "c", created_at: "2026-06-01" }], new Set(["c"]), 10);
    expect(q.map((x) => x.id)).toEqual(["b", "a"]);
    const many = Array.from({ length: 30 }, (_, i) => ({ id: String(i), created_at: `2026-01-${String(i + 1).padStart(2, "0")}` }));
    expect(inviteQueue(many, new Set(), 20).length).toBe(10);
  });
  it("attente aléatoire entre 50 min et 2 h", () => {
    expect(inviteWaitMinutes(0)).toBe(50);
    expect(inviteWaitMinutes(1)).toBe(120);
  });
  it("blocage après 10 invitations ou pendant l'attente", () => {
    const mon = new Date(2026, 10, 16, 10);
    expect(canInviteNow(10, null, mon)).toBe(false);
    expect(canInviteNow(3, new Date(2026, 10, 16, 11).toISOString(), mon)).toBe(false);
    expect(canInviteNow(3, new Date(2026, 10, 16, 9).toISOString(), mon)).toBe(true);
  });
});

import { pipelineLevel } from "./linkedin";
describe("pipelineLevel", () => {
  it("rouge sans aucun post préparé à venir", () => expect(pipelineLevel(["2026-11-10"], "2026-11-19")).toBe("rouge"));
  it("orange s'il ne reste qu'une semaine", () => expect(pipelineLevel(["2026-11-20", "2026-11-26"], "2026-11-19")).toBe("orange"));
  it("normal au-delà d'une semaine", () => expect(pipelineLevel(["2026-11-20", "2026-11-27"], "2026-11-19")).toBe("ok"));
});
