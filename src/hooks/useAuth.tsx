import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type AppRole = "broker" | "investor";

export function useAuth() {
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
      setLoading(false);
    });
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let cancelled = false;
    if (!session) {
      setRole(null);
      return;
    }
    (async () => {
      const { data } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", session.user.id)
        .maybeSingle();
      let next = (data?.role as AppRole | undefined) ?? null;
      if (!next) {
        const { data: claimed } = await supabase.rpc("claim_role");
        next = (claimed as AppRole | null) ?? null;
      }
      if (!cancelled) setRole(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [session]);

  return {
    session,
    user: (session?.user ?? null) as User | null,
    role,
    isBroker: role === "broker",
    loading: loading || (Boolean(session) && role === null),
  };
}
