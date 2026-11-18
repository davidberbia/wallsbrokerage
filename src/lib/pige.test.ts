import { describe, it, expect } from "vitest";
import { pigeActive, pigeDue } from "./pige";
describe("Pige lifecycle", () => {
  it("returns after exactly seven calendar days", () => {
    const sent = new Date("2026-11-18T10:00:00Z");
    expect(pigeDue(sent).toISOString()).toBe("2026-11-25T10:00:00.000Z");
    const p = { started_at: sent.toISOString(), due_at: pigeDue(sent).toISOString(), completed_at: null };
    expect(pigeActive(p, new Date("2026-11-25T09:59:59Z"))).toBe(true);
    expect(pigeActive(p, new Date("2026-11-25T10:00:00Z"))).toBe(false);
  });
  it("does not remove an unsent lead from quick review", () => {
    expect(pigeActive({ started_at: null, due_at: null, completed_at: null })).toBe(false);
  });
});