import { describe, it, expect } from "vitest";
import { agentShares } from "./agent-shares";
describe("agentShares", () => {
  it("CA de David : 100 % Wallsbroker, rien à David ni Ladislas", () => {
    expect(agentShares(1000, { isWallsbroker: true, quoteAgent: 0, broughtByLadislas: false })).toEqual({ wallsbroker: 1000, david: 0, ladislas: 0 });
  });
  it("Alexis / Ladislas 95/5 : les 5 % vont à David", () => {
    expect(agentShares(1000, { isWallsbroker: false, quoteAgent: 95, broughtByLadislas: false })).toEqual({ wallsbroker: 50, david: 50, ladislas: 0 });
  });
  it("Romain 90/10 amené par Ladislas : 5 % / 5 %", () => {
    expect(agentShares(1000, { isWallsbroker: false, quoteAgent: 90, broughtByLadislas: true })).toEqual({ wallsbroker: 100, david: 50, ladislas: 50 });
  });
});
