import { createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/** Réservé à l'équipe Wallsbroker (rôle broker ou viewer) : bloque les comptes investisseurs. */
export const requireStaffAuth = createMiddleware({ type: "function" })
  .middleware([requireSupabaseAuth])
  .server(async ({ next, context }) => {
    const { supabase, userId } = context;
    const { data: b } = await supabase.rpc("has_role", { _user_id: userId, _role: "broker" });
    let ok = Boolean(b);
    if (!ok) {
      const { data: v } = await supabase.rpc("has_role", { _user_id: userId, _role: "viewer" });
      ok = Boolean(v);
    }
    if (!ok) throw new Error("Accès réservé à l'équipe Wallsbroker");
    return next();
  });
