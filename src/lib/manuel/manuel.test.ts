import { describe, expect, it } from "vitest";
import { FAQ, MANUAL_TABS } from "./content";
import { searchManual, tabForPath } from "./search";

describe("Manuel du CRM", () => {
  it("chaque question de la FAQ renvoie à un paragraphe existant", () => {
    for (const f of FAQ) expect(MANUAL_TABS.find((t) => t.slug === f.tab)?.sections.some((s) => s.id === f.section), f.q).toBe(true);
  });
  it("la recherche gratuite trouve le paragraphe du numéro de mandat", () => {
    expect(searchManual(MANUAL_TABS, "Comment avoir un numéro de mandat ?")[0]).toMatchObject({ tab: "mandats", section: "numero" });
  });
  it("le bouton d'aide reconnaît l'onglet de la page", () => {
    expect(tabForPath(MANUAL_TABS, "/prospects")?.slug).toBe("contacts");
    expect(tabForPath(MANUAL_TABS, "/formation/mandat")?.slug).toBe("formation");
  });
});
