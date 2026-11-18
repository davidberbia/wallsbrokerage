import { expect, it } from "vitest";
import { brevoEventPatch, canSendPige, replyReferences } from "./pige-brevo";
it("never resends claimed or uncertain messages", () => {
  expect(canSendPige("prepared", null)).toBe(true);
  for (const state of ["sending", "accepted", "uncertain", "rejected"]) expect(canSendPige(state, null)).toBe(false);
  expect(canSendPige("prepared", "2026-11-18T06:00:00Z")).toBe(false);
});
it("only delivery events establish receipt", () => {
  expect(brevoEventPatch("request", "2026-11-18T06:00:00Z")).toBeNull();
  expect(brevoEventPatch("delivered", "2026-11-18T06:00:00Z")).toEqual({ delivered_at: "2026-11-18T06:00:00Z" });
});
it("only opening events establish a signalled reading", () => {
  expect(brevoEventPatch("opened", "2026-11-18T06:00:00Z")).toEqual({ opened_at: "2026-11-18T06:00:00Z" });
  expect(brevoEventPatch("click", "2026-11-18T06:00:00Z")).toBeNull();
});
it("matches reply references exactly rather than by subject", () => {
  expect(replyReferences([{ name: "In-Reply-To", value: "<abc@brevo>" }], "<abc@brevo>")).toBe(true);
  expect(replyReferences([{ name: "References", value: "<prefixabc@brevo>" }], "<abc@brevo>")).toBe(false);
});