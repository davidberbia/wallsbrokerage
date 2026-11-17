import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Adresses de l'utilisateur connecté (compte + fiche agent), masquées des interlocuteurs. */
export function useSelfEmails(): string[] {
  const q = useQuery({
    queryKey: ["self-emails"],
    staleTime: Infinity,
    queryFn: async () => {
      const { data } = await supabase.auth.getUser();
      const u = data.user;
      if (!u) return [];
      const { data: agent } = await supabase.from("commercial_agents").select("email").eq("user_id", u.id).maybeSingle();
      return [u.email ?? "", agent?.email ?? ""].filter(Boolean);
    },
  });
  return q.data ?? [];
}
