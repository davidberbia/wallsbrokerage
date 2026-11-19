import { describe, expect, it } from "vitest";
import { agentInviteEmail } from "./agent-invite";
describe("agentInviteEmail", () => {
  it("sans contrat signé : accès au CRM et mandats via le CRM", () => {
    const { subject, html } = agentInviteEmail("Ladislas", "https://x/y");
    expect(subject).toBe("Vos accès au CRM Wallsbroker");
    expect(html).not.toContain("est signé");
    expect(html).toContain("Créez un nouvel actif");
    expect(html).toContain('href="https://x/y"');
    expect(html).toContain("Activer mon compte");
  });
  it("contrat signé : le mail l'annonce et joint la copie", () => {
    const { subject, html } = agentInviteEmail("Ladislas", "https://x/y", true);
    expect(subject).toBe("Votre contrat est signé : voici vos accès au CRM Wallsbroker");
    expect(html).toContain("Votre contrat d'agent commercial est signé");
    expect(html).toContain("copie jointe");
  });
});
