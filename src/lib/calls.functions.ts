import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Lance immédiatement une synchronisation Cube ACR (bouton « Synchroniser maintenant »). */
export const syncCallsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data: ok } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "broker" });
    if (!ok) throw new Error("Accès refusé");
    const { discoverCalls, processCall } = await import("@/lib/calls.server");
    const { getAdmin } = await import("@/lib/automation.server");
    const added = await discoverCalls();
    const admin = await getAdmin();
    const { data: todo } = await admin.from("call_recordings").select("id").eq("status", "en attente").order("called_at").limit(3);
    let done = 0;
    let error: string | null = null;
    for (const t of todo ?? []) {
      try {
        await processCall(t.id);
        done++;
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        error = /\[402\]/.test(msg) ? "Crédit Google Gemini épuisé : rechargez-le sur aistudio.google.com." : msg.slice(0, 300);
        await admin.from("call_recordings").update({ status: "en attente", error }).eq("id", t.id);
        break;
      }
    }
    return { added, done, error };
  });
