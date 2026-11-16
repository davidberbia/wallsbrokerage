import { describe, expect, it } from "vitest";
import { agentInviteEmail } from "./agent-invite";
describe("agentInviteEmail", () => {
  it("demande la signature du contrat et les mandats via le CRM", () => {
    const { html } = agentInviteEmail("Ladislas", "https://x/y");
    expect(html).toContain("signer en ligne votre contrat d'agent commercial immobilier");
    expect(html).toContain("Créez un nouvel actif");
    expect(html).toContain('href="https://x/y"');
  });
});
