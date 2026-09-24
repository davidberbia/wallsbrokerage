import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertStaff(supabase: any, userId: string, brokerOnly = false) {
  const { data: b } = await supabase.rpc("has_role", { _user_id: userId, _role: "broker" });
  if (b) return;
  if (!brokerOnly) {
    const { data: v } = await supabase.rpc("has_role", { _user_id: userId, _role: "viewer" });
    if (v) return;
  }
  throw new Error("Accès refusé");
}

const CHAT_SYSTEM = `Tu es l'assistante IA de Wallsbroker, intégrée au CRM de David Berbia, courtier en immobilier commercial (commerces, bureaux, locaux d'activité, investissement) en France.
Tu l'aides au quotidien : questions sur l'immobilier commercial (baux commerciaux, droit au bail, rendements, fiscalité, due diligence, marché), rédaction de mails, travail administratif, lecture des données du CRM fournies ci-dessous.
Réponds en français, de façon claire et concise. Si tu ne sais pas, dis-le.
Si David te demande une amélioration de l'outil ou si tu en vois une utile pour la page affichée, ajoute à la fin une ligne commençant exactement par "SUGGESTION:" suivie de la demande d'amélioration formulée pour le développeur.`;

export const chatWithAssistant = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ message: z.string().min(1).max(4000), page: z.string().max(200) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId);
    const { callGemini, BudgetReachedError } = await import("@/lib/gemini.server");
    const { data: hist } = await supabase
      .from("ai_chat_messages")
      .select("role,content")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(16);
    const [{ data: deals }, { count: inv }, { count: pros }, { data: drafts }] = await Promise.all([
      supabase.from("deals").select("name,stage,amount,company,last_activity_at").not("stage", "in", "(Signé,Perdu)").limit(40),
      supabase.from("investors").select("id", { count: "exact", head: true }),
      supabase.from("prospect_companies").select("id", { count: "exact", head: true }),
      supabase.from("ai_drafts").select("id").eq("status", "en attente"),
    ]);
    const ctx = `Page affichée : ${data.page}\nDate : ${new Date().toLocaleDateString("fr-FR")}\nInvestisseurs : ${inv ?? 0} ; sociétés prospects : ${pros ?? 0} ; mails en attente de validation : ${drafts?.length ?? 0}\nDossiers en cours : ${(deals ?? []).map((d: any) => `${d.name} [${d.stage}${d.amount ? `, ${d.amount} €` : ""}${d.company ? `, ${d.company}` : ""}]`).join(" ; ") || "aucun"}`;
    const turns = [...(hist ?? [])].reverse().map((h: any) => ({ role: h.role === "user" ? "user" : "model", text: h.content }) as const);
    turns.push({ role: "user", text: data.message });
    await supabase.from("ai_chat_messages").insert({ user_id: userId, role: "user", content: data.message, page: data.page });
    let answer: string;
    try {
      answer = await callGemini({ task: "assistant", system: `${CHAT_SYSTEM}\n\n${ctx}`, turns });
    } catch (e) {
      answer = e instanceof BudgetReachedError ? e.message : `Désolée, je n'ai pas pu répondre (${e instanceof Error ? e.message.slice(0, 160) : "erreur"}).`;
    }
    const m = answer.match(/^SUGGESTION:\s*(.+)$/m);
    if (m) await supabase.from("ai_suggestions").insert({ page: data.page, suggestion: m[1]!.trim() });
    const clean = answer.replace(/^SUGGESTION:.*$/m, "").trim() + (m ? "\n\n(Suggestion d'amélioration notée pour le développeur.)" : "");
    await supabase.from("ai_chat_messages").insert({ user_id: userId, role: "model", content: clean, page: data.page });
    return { answer: clean };
  });

export const getAiStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertStaff(context.supabase, context.userId);
    const { monthSpent, MONTHLY_BUDGET_EUR } = await import("@/lib/gemini.server");
    return { spent: Math.round((await monthSpent()) * 100) / 100, budget: MONTHLY_BUDGET_EUR };
  });

export const sendDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), subject: z.string().min(1), body_html: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await assertStaff(supabase, userId, true);
    const { data: d } = await supabase.from("ai_drafts").select("*").eq("id", data.id).single();
    if (!d || d.status !== "en attente") throw new Error("Brouillon introuvable ou déjà traité.");
    const { replyInThread, sendNew } = await import("@/lib/graph-send.server");
    try {
      if (d.reply_to_graph_id) await replyInThread(d.reply_to_graph_id, data.body_html, d.attachments ?? []);
      else await sendNew(d.to_email, data.subject, data.body_html, d.attachments ?? []);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      await supabase.from("ai_drafts").update({ error: msg.slice(0, 500) }).eq("id", d.id);
      throw new Error(msg);
    }
    await supabase.from("ai_drafts").update({ status: "envoyé", sent_at: new Date().toISOString(), subject: data.subject, body_html: data.body_html, error: null }).eq("id", d.id);
    if (d.request_id) {
      const next = d.kind === "demande_vendeur" ? "vendeur relancé" : d.kind === "reponse_investisseur" ? "transmis" : null;
      if (next) await supabase.from("ai_doc_requests").update({ status: next, updated_at: new Date().toISOString() }).eq("id", d.request_id);
    }
    return { ok: true };
  });
