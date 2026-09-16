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
  skipped: number;
  retryOnly: boolean;
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
      supabaseAdmin
        .from("cfnews_failed_urls")
        .select("id", { count: "exact", head: true })
        .is("resolved_at", null),
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
      skipped: counts[3].count ?? 0,
      retryOnly: data?.retry_only ?? false,
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
        retry_only: false,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    await supabaseAdmin.rpc("cfnews_scrape_schedule", { _on: data.running });
    return { ok: true };
  });

/** Reprend l'import exactement sur la page en erreur, sans rien perdre. */
export const retryCfnewsPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin
      .from("cfnews_scrape")
      .select("page")
      .eq("id", true)
      .maybeSingle();
    await supabaseAdmin
      .from("cfnews_scrape")
      .update({
        status: "running",
        retry_only: false,
        last_error: null,
        lease_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", true);
    await supabaseAdmin.rpc("cfnews_scrape_schedule", { _on: true });
    return { ok: true, page: data?.page ?? 1 };
  });

export const retryCfnewsFailures = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertBroker(context as never);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const requestedAt = new Date().toISOString();
    const { count, error } = await supabaseAdmin
      .from("cfnews_failed_urls")
      .update({ retry_requested_at: requestedAt }, { count: "exact" })
      .is("resolved_at", null);
    if (error) throw new Error(error.message);
    if (!count) return { ok: true, count: 0 };

    const { error: stateError } = await supabaseAdmin
      .from("cfnews_scrape")
      .update({
        status: "running",
        retry_only: true,
        last_error: null,
        lease_until: null,
        updated_at: requestedAt,
      })
      .eq("id", true);
    if (stateError) throw new Error(stateError.message);
    await supabaseAdmin.rpc("cfnews_scrape_schedule", { _on: true });
    return { ok: true, count };
  });
