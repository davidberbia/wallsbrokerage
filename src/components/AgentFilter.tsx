import { useEffect, useSyncExternalStore } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Sélection globale du collaborateur affiché (menu de gauche), partagée par toutes les pages.
let current = "";
const subs = new Set<() => void>();
const KEY = "walls-agent";
function set(v: string) {
  current = v;
  try { localStorage.setItem(KEY, v); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => subs.delete(f); };

/** Agents visibles par l'utilisateur (règles RLS) + sélection globale. */
export function useAgentFilter() {
  const me = useQuery({
    queryKey: ["me-id"],
    queryFn: async () => (await supabase.auth.getUser()).data.user?.id ?? null,
  });
  const agents = useQuery({
    queryKey: ["deal-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_deal_agents");
      if (error) throw error;
      return data ?? [];
    },
  });
  const value = useSyncExternalStore(subscribe, () => current, () => "");
  const myId = me.data ?? null;
  const list = agents.data ?? [];
  useEffect(() => {
    if (current || !myId) return;
    let saved = "";
    try { saved = localStorage.getItem(KEY) ?? ""; } catch { /* ignore */ }
    set(saved && (saved === "all" || saved === myId || list.some((a) => a.user_id === saved)) ? saved : myId);
  }, [myId, list]);
  const agent = value || "all";
  const keep = (owner: string | null | undefined) =>
    agent === "all" || owner === agent || (!owner && agent === myId);
  return { agents: list, agent, setAgent: set, keep, myId };
}

/** Ancien filtre de page : remplacé par le menu de gauche. */
export function AgentSelect(_: { f: ReturnType<typeof useAgentFilter> }) {
  return null;
}

/** Menu déroulant du menu de gauche, sous Wallsbroker. */
export function SidebarAgentSelect({ className }: { className?: string }) {
  const f = useAgentFilter();
  const others = f.agents.filter((a) => a.user_id !== f.myId);
  const mine = f.agents.find((a) => a.user_id === f.myId);
  if (!f.myId) return null;
  if (others.length === 0) {
    return mine ? <p className={`truncate px-3 py-2 text-sm font-medium ${className ?? ""}`}>{mine.name}</p> : null;
  }
  return (
    <select
      aria-label="Collaborateur affiché"
      value={f.agent}
      onChange={(e) => f.setAgent(e.target.value)}
      className={`min-h-11 w-full rounded-md border border-sidebar-border bg-sidebar px-3 text-sm text-sidebar-foreground ${className ?? ""}`}
    >
      <option value={f.myId}>{mine?.name ?? "Moi"}</option>
      {others.map((a) => <option key={a.user_id} value={a.user_id}>{a.name}</option>)}
      <option value="all">Tout le monde</option>
    </select>
  );
}
