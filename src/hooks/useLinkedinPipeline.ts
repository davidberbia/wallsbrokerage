import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { pipelineLevel } from "@/lib/linkedin";

/** Niveau de réserve des posts LinkedIn préparés (rédigés, non publiés) du collaborateur connecté. */
export function useLinkedinPipeline(enabled: boolean) {
  return useQuery({
    queryKey: ["li-pipeline"],
    enabled,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return "ok" as const;
      const today = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Paris" });
      const { data } = await supabase.from("linkedin_posts").select("scheduled_for").eq("user_id", u.user.id)
        .in("status", ["brouillon", "valide"]).neq("body", "").gte("scheduled_for", today);
      return pipelineLevel((data ?? []).map((r) => r.scheduled_for), today);
    },
  });
}
