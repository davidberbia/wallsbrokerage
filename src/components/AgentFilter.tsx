import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/** Agents visibles par l'utilisateur (mêmes règles que le Suivi des affaires). */
export function useAgentFilter() {
  const agents = useQuery({
    queryKey: ["deal-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_deal_agents");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [agent, setAgent] = useState("all");
  const keep = (owner: string | null | undefined) => agent === "all" || owner === agent;
  return { agents: agents.data ?? [], agent, setAgent, keep };
}

export function AgentSelect({ f }: { f: ReturnType<typeof useAgentFilter> }) {
  if (f.agents.length < 2) return null;
  return (
    <select
      aria-label="Agent"
      value={f.agent}
      onChange={(e) => f.setAgent(e.target.value)}
      className="min-h-11 w-full rounded-sm border border-border bg-card px-3 text-sm sm:w-64"
    >
      <option value="all">Tous les agents</option>
      {f.agents.map((a) => (
        <option key={a.user_id} value={a.user_id}>{a.name}</option>
      ))}
    </select>
  );
}
