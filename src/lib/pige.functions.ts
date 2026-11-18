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
export const confirmPige = createServerFn({ method: "POST" }).middleware([requireStaffAuth]).inputValidator(input).handler(async ({ data, context }) => {
  const { error } = await context.supabase.rpc("confirm_pige_contact", { _id: data.id });
  if (error) throw new Error(error.message);
  return { ok: true };
});
export const updatePigeMessage = createServerFn({ method: "POST" }).middleware([requireStaffAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), subject: z.string().trim().min(1).max(500), body: z.string().trim().min(1).max(10000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("update_pige_message", { _id: data.id, _subject: data.subject, _body: data.body });
    if (error) throw new Error(error.message);
    return { ok: true };
  });