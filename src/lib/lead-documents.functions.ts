import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffAuth } from "./staff-middleware";
import { documentMail, leadReminderDue, missingLeadItems } from "./lead-documents";

const idInput = (d: unknown) => z.object({ id: z.string().uuid() }).parse(d);

export const leadDocumentOverview = createServerFn({ method: "GET" }).middleware([requireStaffAuth])
  .inputValidator(idInput).handler(async ({ data, context }) => {
    const { data: deal, error } = await context.supabase.from("deals").select("*").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { data: mails, error: mailError } = await context.supabase.from("mail_messages").select("from_email,subject,preview,folder,received_at").eq("deal_id", data.id).eq("folder", "inbox").order("received_at", { ascending: true }).limit(200);
    if (mailError) throw new Error(mailError.message);
    let asset = null;
    let docs: { name: string; category: string }[] = [];
    if (deal.asset_id) {
      const [a, d] = await Promise.all([
        context.supabase.from("assets").select("asset_class,price,surface,rent,keys_count,hotel_category").eq("id", deal.asset_id).single(),
        context.supabase.from("asset_documents").select("name,category").eq("asset_id", deal.asset_id),
      ]);
      if (a.error) throw new Error(a.error.message);
      if (d.error) throw new Error(d.error.message);
      asset = a.data; docs = d.data ?? [];
    }
    const own = typeof context.claims.email === "string" ? context.claims.email.toLowerCase() : "";
    const sender = (mails ?? []).find(m => m.from_email && m.from_email.toLowerCase() !== own)?.from_email || deal.contact_email;
    const missing = missingLeadItems({ ...asset, price: asset?.price ?? deal.amount, surface: asset?.surface ?? deal.surface, rent: asset?.rent ?? deal.rent }, docs.map(d => `${d.name} ${d.category === "photo" ? "photo" : d.category === "plan" ? "plan" : ""}`), [deal.notes, ...(mails ?? []).map(m => `${m.subject ?? ""} ${m.preview ?? ""}`)].filter(Boolean).join("\n"));
    const { data: requests, error: requestError } = await context.supabase.from("lead_document_requests").select("*").eq("deal_id", data.id).order("created_at", { ascending: false }).limit(30);
    if (requestError) throw new Error(requestError.message);
    return { name: deal.name, sender, missing, requests: requests ?? [] };
  });

export const prepareLeadDocumentRequest = createServerFn({ method: "POST" }).middleware([requireStaffAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), items: z.array(z.string().min(1).max(200)).min(1).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    // Recompute the dossier on the server; neither the recipient nor the subject is supplied by the browser.
    const overview = await leadDocumentOverview({ data: { id: data.id } });
    if (!overview.sender) throw new Error("Expéditeur du dossier absent : renseignez son adresse dans la fiche.");
    const senderEmail = typeof context.claims.email === "string" ? context.claims.email : "";
    if (!senderEmail) throw new Error("Votre adresse professionnelle est indisponible.");
    const active = overview.requests.find(r => ["prepared", "waiting", "sending"].includes(r.status));
    if (active) return active;
    const { subject, body } = documentMail(overview.name, data.items);
    const { data: request, error } = await context.supabase.from("lead_document_requests").insert({ deal_id: data.id, created_by: context.userId, sender_email: senderEmail, to_email: z.string().email().parse(overview.sender), missing_items: data.items, subject, body_text: body }).select("*").single();
    if (error) throw new Error(error.message);
    return request;
  });

export const confirmLeadDocumentRequest = createServerFn({ method: "POST" }).middleware([requireStaffAuth])
  .inputValidator(idInput).handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("confirm_lead_document_request", { _id: data.id, _due: leadReminderDue(new Date()).toISOString() });
    if (error) throw new Error(error.message);
    return { ok: true };
  });