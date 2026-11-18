import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffAuth } from "./staff-middleware";

export const leadRecipients = createServerFn({ method: "GET" }).middleware([requireStaffAuth]).handler(async ({ context }) => {
  const { data, error } = await context.supabase.rpc("list_lead_recipients");
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const transferLead = createServerFn({ method: "POST" }).middleware([requireStaffAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), recipient: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("transfer_lead", { _deal_id: data.id, _recipient: data.recipient });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const investigateLead = createServerFn({ method: "POST" }).middleware([requireStaffAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: target, error } = await context.supabase.from("deals").select("owner_id").eq("id", data.id).single();
    if (error) throw new Error(error.message);
    const { error: leaseError } = await context.supabase.rpc("claim_lead_research", { _id: data.id });
    if (leaseError) throw new Error(leaseError.message);
    const { getAdmin } = await import("./automation.server");
    const admin = await getAdmin();
    try {
      const { researchDeal } = await import("./deal-research.server");
      const result = await researchDeal(admin, data.id, target.owner_id ?? context.userId);
      await admin.from("extraction_jobs").update({ status: "done", result, error: null, lease_until: null }).eq("target_id", data.id).eq("kind", "research");
      return result;
    } catch (e) {
      const message = e instanceof Error ? e.message : "Enquête impossible";
      if (message.startsWith("Lecture des documents")) {
        await admin.from("extraction_jobs").update({ status: "pending", error: null, lease_until: null, next_run_at: new Date(Date.now() + 120000).toISOString() }).eq("target_id", data.id).eq("kind", "research");
        await admin.rpc("wake_extractions");
        throw new Error(message);
      }
      const paused = /plafond|\[40[123]\]|permission|denied/i.test(message);
      await admin.from("extraction_jobs").update({ status: paused ? "paused" : "failed", error: message, lease_until: null }).eq("target_id", data.id).eq("kind", "research");
      if (paused) await admin.from("extraction_control").update({ paused_reason: message }).eq("id", true);
      throw new Error(message);
    } finally { await admin.from("extraction_control").update({ lease_until: null }).eq("id", true); }
  });