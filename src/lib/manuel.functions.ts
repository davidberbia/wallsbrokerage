import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffAuth } from "@/lib/staff-middleware";
import { MANUAL_TABS } from "@/lib/manuel/content";
import { searchManual } from "@/lib/manuel/search";
import type { ManualTab } from "@/lib/manuel/types";

export const MANUAL_BUDGET_EUR = 5;

export type ManualAnswer = {
  answer: string;
  ref: { tab: string; section: string; title: string } | null;
  added: boolean;
  mode: "ia" | "recherche";
};

async function manualSpent(): Promise<number> {
  const { getAdmin } = await import("@/lib/automation.server");
  const admin = await getAdmin();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await admin.from("ai_usage").select("cost_eur").eq("task", "manuel").gte("created_at", start.toISOString());
  return (data ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0);
}

function merge(rows: { id: string; tab: string; title: string; body: string }[]): ManualTab[] {
  return MANUAL_TABS.map((t) => ({
    ...t,
    sections: [
      ...t.sections,
      ...rows.filter((r) => r.tab === t.slug).map((r) => ({ id: `q-${r.id.slice(0, 8)}`, title: r.title, body: r.body.split("\n").filter(Boolean), auto: true })),
    ],
  }));
}

export const listManualAdditions = createServerFn({ method: "GET" })
  .middleware([requireStaffAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("manual_sections").select("id,tab,title,body").order("created_at");
    return data ?? [];
  });

export const getManualBudget = createServerFn({ method: "GET" })
  .middleware([requireStaffAuth])
  .handler(async () => ({ spent: await manualSpent(), budget: MANUAL_BUDGET_EUR }));

export const askManual = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d: unknown) => z.object({ question: z.string().min(3).max(600), tab: z.string().max(60).optional() }).parse(d))
  .handler(async ({ data, context }): Promise<ManualAnswer> => {
    const { data: rows } = await context.supabase.from("manual_sections").select("id,tab,title,body");
    const tabs = merge(rows ?? []);
    const fallback = (prefix: string): ManualAnswer => {
      const hit = searchManual(tabs, data.question, 1)[0];
      return hit
        ? { answer: `${prefix}Le paragraphe le plus proche est « ${hit.title} » (${hit.tabLabel}).`, ref: hit, added: false, mode: "recherche" }
        : { answer: `${prefix}Je n'ai pas trouvé de paragraphe correspondant.`, ref: null, added: false, mode: "recherche" };
    };
    if ((await manualSpent()) >= MANUAL_BUDGET_EUR) return fallback(`Plafond IA du Manuel (${MANUAL_BUDGET_EUR} €) atteint ce mois-ci. `);

    const { CRM_REFERENCE } = await import("@/lib/manuel/reference.server");
    const text = tabs
      .filter((t) => !t.admin)
      .concat(tabs.filter((t) => t.admin))
      .map((t) => `## [${t.slug}] ${t.label}${t.admin ? " (réservé à l'administrateur)" : ""}\n${t.sections.map((s) => `### {${t.slug}#${s.id}} ${s.title}\n${s.body.join("\n")}`).join("\n")}`)
      .join("\n\n");
    const system = `Tu es l'aide du CRM Wallsbrokerage. Tu réponds en français, en 2 à 5 phrases simples, UNIQUEMENT à partir du Manuel ci-dessous. N'invente jamais de bouton ni de fonction.
Réponds en JSON : {"answer": string, "ref": "onglet#section" ou null, "new_section": null ou {"tab": slug d'onglet existant, "title": string court, "body": [2 à 4 phrases]}}.
- Si un paragraphe répond : "ref" = son identifiant entre accolades, "new_section" = null.
- Si la réponse n'est pas dans le Manuel mais figure dans l'INVENTAIRE DU CRM : rédige "new_section" (ce paragraphe sera ajouté au Manuel, ton simple, libellés de boutons entre « ») et réponds.
- Sinon : ne dis jamais que la fonction n'existe pas ; dis que ce point n'est pas encore documenté et qu'il a été transmis pour compléter le Manuel, "ref" et "new_section" à null.

MANUEL :
${text}

INVENTAIRE DU CRM (référence interne, à ne pas citer tel quel) :
${CRM_REFERENCE}`;
    const { callGeminiJson } = await import("@/lib/gemini.server");
    type Out = { answer?: string; ref?: string | null; new_section?: { tab: string; title: string; body: string[] } | null };
    let out: Out | null = null;
    try {
      out = await callGeminiJson<Out>({ task: "manuel", system, prompt: `Page : ${data.tab ?? "inconnue"}\nQuestion : ${data.question}` });
    } catch {
      return fallback("L'IA est indisponible pour le moment. ");
    }
    if (!out?.answer) return fallback("");
    const find = (ref?: string | null) => {
      const [tab, section] = (ref ?? "").replace(/[{}]/g, "").split("#");
      const t = tabs.find((x) => x.slug === tab);
      const s = t?.sections.find((x) => x.id === section);
      return t && s ? { tab: t.slug, section: s.id, title: s.title } : null;
    };
    const ns = out.new_section;
    if (ns && tabs.some((t) => t.slug === ns.tab) && ns.title && ns.body?.length) {
      const { getAdmin } = await import("@/lib/automation.server");
      const admin = await getAdmin();
      const { data: ins } = await admin
        .from("manual_sections")
        .insert({ tab: ns.tab, title: ns.title.slice(0, 120), body: ns.body.join("\n").slice(0, 2000), question: data.question })
        .select("id")
        .single();
      if (ins) return { answer: out.answer, ref: { tab: ns.tab, section: `q-${ins.id.slice(0, 8)}`, title: ns.title }, added: true, mode: "ia" };
    }
    const ref = find(out.ref);
    if (!ref) await context.supabase.from("ai_suggestions").insert({ page: `manuel:${data.tab ?? ""}`, suggestion: `Manuel à compléter : ${data.question}` });
    return { answer: out.answer, ref, added: false, mode: "ia" };
  });
