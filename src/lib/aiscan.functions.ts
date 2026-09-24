import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const getAiscanStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data } = await context.supabase.from("ai_scan_state").select("*").eq("id", true).maybeSingle();
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const { data: usage } = await context.supabase
      .from("ai_usage")
      .select("cost_eur")
      .gte("created_at", start.toISOString());
    const spent = (usage ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0);
    return { state: data, spent };
  });

export const setAiscanRunning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ running: z.boolean() }).parse(d))
  .handler(async ({ context, data }) => {
    const { error } = await context.supabase
      .from("ai_scan_state")
      .update({ status: data.running ? "en cours" : "arrêté", lease_until: null, last_error: null })
      .eq("id", true);
    if (error) throw new Error(error.message);
    const { error: e2 } = await context.supabase.rpc("aiscan_schedule", { _on: data.running });
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });
