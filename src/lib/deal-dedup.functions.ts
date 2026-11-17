// Propositions de fusion des « À relancer » par Gemini (déclenchement manuel uniquement).
import { createServerFn } from "@tanstack/react-start";
import { requireStaffAuth } from "@/lib/staff-middleware";
import { cleanGroups, type MergeGroup } from "@/lib/deal-merge";

const SYSTEM = `Tu aides un courtier en immobilier commercial à repérer les doublons dans ses opportunités.
Chaque ligne est un dossier : id | nom | adresse | société | surface | prix | loyer | e-mails des correspondants.
Regroupe UNIQUEMENT les dossiers qui décrivent manifestement le MÊME actif (même bien, même adresse ou même opération).
Indices forts : même adresse, même ville + même surface ou même montant, mêmes correspondants e-mail sur le même sujet.
Une même ville seule ne suffit jamais. Un même correspondant seul ne suffit pas (il peut proposer plusieurs biens).
Réponds en JSON {"groups":[{"ids":["…","…"],"reason":"une phrase courte en français"}]}. Tableau vide si aucun doublon.`;

export const suggestDealMerges = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .handler(async ({ context }): Promise<MergeGroup[]> => {
    const { callGeminiJson } = await import("@/lib/gemini.server");
    const { data: deals, error } = await context.supabase
      .from("deals")
      .select("id,name,address,company,surface,amount,rent")
      .eq("stage", "Prospection")
      .limit(600);
    if (error) throw new Error(error.message);
    if (!deals || deals.length < 2) return [];
    const ids = deals.map((d) => d.id);
    const emails = new Map<string, Set<string>>();
    for (let i = 0; i < ids.length; i += 200) {
      const { data: mails } = await context.supabase
        .from("mail_messages")
        .select("deal_id,from_email,to_display")
        .in("deal_id", ids.slice(i, i + 200))
        .limit(3000);
      for (const m of mails ?? []) {
        if (!m.deal_id) continue;
        const set = emails.get(m.deal_id) ?? new Set<string>();
        for (const e of `${m.from_email ?? ""} ${m.to_display ?? ""}`.match(/[^\s<>,;"']+@[^\s<>,;"']+/g) ?? []) {
          if (!/wallsbroker|newsletter|no-?reply|postmaster|mailer-daemon|notification/i.test(e)) set.add(e.toLowerCase());
        }
        emails.set(m.deal_id, set);
      }
    }
    const lines = deals.map((d) =>
      [d.id, d.name, d.address ?? "", d.company ?? "", d.surface ?? "", d.amount ?? "", d.rent ?? "", [...(emails.get(d.id) ?? [])].slice(0, 5).join(" ")].join(" | "),
    );
    const out = await callGeminiJson<{ groups?: MergeGroup[] }>({ task: "fusion-relances", system: SYSTEM, prompt: lines.join("\n") });
    return cleanGroups(out?.groups ?? [], new Set(ids));
  });
