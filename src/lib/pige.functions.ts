import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffAuth } from "./staff-middleware";
import { pigeMail } from "./pige";
const input = (d: unknown) => z.object({ id: z.string().uuid() }).parse(d);
export const pigeOverview = createServerFn({ method: "GET" }).middleware([requireStaffAuth]).inputValidator(input).handler(async ({ data, context }) => {
  const { data: deal, error } = await context.supabase.from("deals").select("*").eq("id", data.id).single();
  if (error) throw new Error(error.message);
  const closed = await context.supabase.rpc("close_due_piges", { _deal: data.id });
  if (closed.error) throw new Error(closed.error.message);
  const a = deal.asset_id ? await context.supabase.from("assets").select("*").eq("id", deal.asset_id).single() : null;
  if (a?.error) throw new Error(a.error.message);
  const { data: cycles, error: e } = await context.supabase.from("lead_piges").select("*,lead_pige_contacts(*)").eq("deal_id", data.id).order("created_at", { ascending: false });
  if (e) throw new Error(e.message);
  const asset = { ...a?.data, title: a?.data?.title || deal.name, price: a?.data?.price ?? deal.amount, surface: a?.data?.surface ?? deal.surface, rent: a?.data?.rent ?? deal.rent };
  return { asset, cycles: cycles ?? [] };
});
export const preparePige = createServerFn({ method: "POST" }).middleware([requireStaffAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), investors: z.array(z.string().uuid()).min(1).max(100) }).parse(d))
  .handler(async ({ data, context }) => {
    const overview = await pigeOverview({ data: { id: data.id } });
    const sender = typeof context.claims.email === "string" ? context.claims.email : "";
    if (!sender) throw new Error("Votre adresse professionnelle est indisponible.");
    const { data: recipients, error } = await context.supabase.from("investors").select("id,email,full_name,first_name").in("id", data.investors);
    if (error) throw new Error(error.message);
    const unique = [...new Map((recipients ?? []).filter(r => r.email && z.string().email().safeParse(r.email).success).map(r => [r.email?.trim().toLowerCase(), r])).values()];
    if (!unique.length) throw new Error("Aucun destinataire avec une adresse email valide.");
    const agent = await context.supabase.from("commercial_agents").select("first_name,last_name,phone").eq("user_id", context.userId).maybeSingle();
    if (agent.error) throw new Error(agent.error.message);
    const person = agent.data ? [agent.data.first_name, agent.data.last_name].filter(Boolean).join(" ") : sender.toLowerCase() === "d.berbia@wallsbroker.com" ? "David Berbia" : "";
    const { pigeSender } = await import("./pige-brevo");
    if (!pigeSender(sender, person)) throw new Error("Votre adresse n’est pas encore autorisée pour la Pige Brevo.");
    const signature = [person, "Walls Brokerage", agent.data?.phone, sender].filter(Boolean).join("\n");
    let cycle = overview.cycles.find(c => !c.completed_at);
    if (cycle && cycle.created_by !== context.userId) throw new Error("Cette Pige est préparée par un autre agent.");
    if (cycle?.started_at && cycle.due_at && new Date(cycle.due_at) <= new Date()) throw new Error("Clôturez la Pige précédente avant de recommencer.");
    if (!cycle) {
      const result = await context.supabase.from("lead_piges").insert({ deal_id: data.id, created_by: context.userId, sender_email: sender }).select("*,lead_pige_contacts(*)").single();
      if (result.error) throw new Error(result.error.message);
      cycle = result.data;
    }
    const existing = new Set(cycle.lead_pige_contacts.map(c => c.email.toLowerCase()));
    const rows = unique.filter(r => r.email && !existing.has(r.email.toLowerCase())).map(r => {
      const mail = pigeMail(overview.asset, r.first_name || "", signature);
      const name = r.first_name && !r.full_name.toLowerCase().startsWith(r.first_name.toLowerCase()) ? `${r.first_name} ${r.full_name}` : r.full_name;
      return { pige_id: cycle.id, investor_id: r.id, name, email: r.email || "", subject: mail.subject, body_text: mail.body };
    });
    if (rows.length) {
      const result = await context.supabase.from("lead_pige_contacts").insert(rows);
      if (result.error) throw new Error(result.error.message);
    }
    return { ok: true };
  });
export const sendPigeBrevo = createServerFn({ method: "POST" }).middleware([requireStaffAuth]).inputValidator(input).handler(async ({ data, context }) => {
  const result = await context.supabase.from("lead_pige_contacts").select("*,lead_piges!inner(created_by,sender_email)").eq("id", data.id).single();
  if (result.error) throw new Error(result.error.message);
  const contact = result.data;
  if (contact.lead_piges.created_by !== context.userId) throw new Error("Seul l’auteur peut envoyer cette Pige.");
  z.string().email().parse(contact.email);
  z.string().email().parse(contact.lead_piges.sender_email);
  z.string().trim().min(1).max(500).parse(contact.subject);
  z.string().trim().min(1).max(10000).parse(contact.body_text);
  // Load server-only code after authorisation, before claiming the irreversible send.
  const { sendBrevoMail, BrevoSendError } = await import("./brevo.server");
  const { pigeSender } = await import("./pige-brevo");
  const agent = await context.supabase.from("commercial_agents").select("first_name,last_name").eq("user_id", context.userId).maybeSingle();
  const senderEmail = contact.lead_piges.sender_email;
  const person = agent.data ? [agent.data.first_name, agent.data.last_name].filter(Boolean).join(" ") : senderEmail.toLowerCase() === "d.berbia@wallsbroker.com" ? "David Berbia" : "";
  const identity = pigeSender(senderEmail, person);
  if (!identity) throw new Error("Votre adresse n’est pas encore autorisée pour la Pige Brevo.");
  const { supabaseAdmin: admin } = await import("@/integrations/supabase/client.server");
  if (!process.env["LOVABLE_API_KEY"] || !process.env["BREVO_API_KEY"]) throw new Error("Connexion Brevo indisponible.");
  const claimed = await context.supabase.rpc("claim_pige_brevo", { _id: data.id });
  if (claimed.error) throw new Error(claimed.error.message);
  if (!claimed.data) throw new Error("Ce message a déjà été envoyé ou nécessite une vérification.");
  // Re-read after the atomic claim: editing is now locked.
  const locked = await context.supabase.from("lead_pige_contacts").select("subject,body_text").eq("id", data.id).single();
  if (locked.error) throw new Error(locked.error.message);
  const escape = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  let state: "accepted" | "rejected" | "uncertain" = "uncertain";
  let messageId: string | null = null;
  let failure: string | null = null;
  try {
    const sent = await sendBrevoMail({ to: contact.email, toName: contact.name, subject: locked.data.subject, html: `<div>${escape(locked.data.body_text).replace(/\n/g, "<br>")}</div>`, sender: { email: identity.email, name: identity.name }, replyTo: { email: identity.email, name: identity.name }, tags: identity.tags });
    state = "accepted"; messageId = sent.messageId;
  } catch (e) {
    state = e instanceof BrevoSendError && e.status >= 400 && e.status < 500 && e.status !== 408 ? "rejected" : "uncertain";
    failure = e instanceof Error ? e.message : "Résultat d’envoi à vérifier dans Brevo";
  }
  const finished = await admin.rpc("finish_pige_brevo", { _id: data.id, _state: state, ...(messageId ? { _message: messageId } : {}), ...(failure ? { _error: failure } : {}) });
  if (finished.error) throw new Error("Résultat à vérifier dans Brevo : aucun nouvel essai automatique.");
  if (failure) throw new Error(failure);
  return { ok: true };
});
export const updatePigeMessage = createServerFn({ method: "POST" }).middleware([requireStaffAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), subject: z.string().trim().min(1).max(500), body: z.string().trim().min(1).max(10000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_pige_message", { _id: data.id, _subject: data.subject, _body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });