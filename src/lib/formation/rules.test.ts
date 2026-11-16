import { describe, expect, it } from "vitest";
import { checkModule, progressPercent, scoreFinal } from "./rules";
import { MODULES } from "./index";

const qs = Array.from({ length: 10 }, (_, i) => ({ q: `q${i}`, options: ["a", "b"], answer: 0, explain: "" }));

describe("formation", () => {
  it("valide à 80 %", () => {
    expect(scoreFinal(qs, [0, 0, 0, 0, 0, 0, 0, 0, 1, 1]).passed).toBe(true);
  });
  it("échoue sous 80 %", () => {
    expect(scoreFinal(qs, [0, 0, 0, 0, 0, 0, 0, 1, 1, 1]).passed).toBe(false);
  });
  it("refuse moins de 10 questions finales", () => {
    expect(checkModule({ slug: "x", title: "", summary: "", minutes: 1, steps: [], final: qs.slice(0, 9) })).not.toEqual([]);
  });
  it("progression en %", () => {
    expect(progressPercent({ slug: "x", title: "", summary: "", minutes: 1, steps: Array(3).fill({ kind: "page", title: "", body: [] }), final: qs }, 2)).toBe(50);
  });
  it("tous les modules respectent les règles", () => {
    for (const m of MODULES) expect([m.slug, checkModule(m)]).toEqual([m.slug, []]);
  });
});
