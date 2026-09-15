import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type CfnewsStatus = {
  status: string;
  phase: string;
  page: number;
  pagesDone: number;
  requestsDone: number;
  lastError: string | null;
  updatedAt: string;
  companies: number;
  contacts: number;
  emails: number;
};

async function assertBroker(context: { supabase: any; userId: string }) {
  const { data } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "broker",
  });
  if (!data) throw new Error("Accès réservé à l'administrateur");
}

export const getCfnewsStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<CfnewsStatus> => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cfnews_scrape")
      .select("*")
      .eq("id", true)
      .maybeSingle();
    const counts = await Promise.all([
      supabaseAdmin.from("prospect_companies").select("id", { count: "exact", head: true }),
      supabaseAdmin.from("prospect_contacts").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("prospect_contacts")
        .select("id", { count: "exact", head: true })
        .not("email", "is", null),
    ]);
    return {
      status: data?.status ?? "idle",
      phase: data?.phase ?? "listing",
      page: data?.page ?? 1,
      pagesDone: data?.pages_done ?? 0,
      requestsDone: data?.requests_done ?? 0,
      lastError: data?.last_error ?? null,
      updatedAt: data?.updated_at ?? new Date().toISOString(),
      companies: counts[0].count ?? 0,
      contacts: counts[1].count ?? 0,
      emails: counts[2].count ?? 0,
    };
  });

export const setCfnewsRunning = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { running: boolean }) => input)
  .handler(async ({ data, context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("cfnews_scrape")
      .update({
        status: data.running ? "running" : "idle",
        last_error: null,
        lease_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    await supabaseAdmin.rpc("cfnews_scrape_schedule", { _on: data.running });
    return { ok: true };
  });
