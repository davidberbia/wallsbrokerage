import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

type Counts = Record<string, number>;

async function count(table: string, filter?: (q: any) => any): Promise<number> {
  let q = (supabase as any).from(table).select("id", { count: "exact", head: true });
  if (filter) q = filter(q);
  const { count: c } = await q;
  return c ?? 0;
}

export function useNavCounts(enabled: boolean) {
  return useQuery<Counts>({
    queryKey: ["nav-counts"],
    enabled,
    refetchInterval: 60_000,
    queryFn: async () => {
      const [inv, pro, act, dos, comp, env, cont, cib, brk, dir, not] = await Promise.all([
        count("investors"),
        count("prospect_companies"),
        count("assets"),
        count("deals", (q) => q.neq("stage", "Cible")),
        count("comparables"),
        count("brochure_sends"),
        count("mailscan_candidates", (q) => q.eq("status", "à valider")),
        count("deals", (q) => q.eq("stage", "Cible")),
        count("directory_contacts", (q) => q.eq("kind", "broker")),
        count("directory_contacts", (q) => q.eq("kind", "contact")),
        count("directory_contacts", (q) => q.eq("kind", "notary")),
      ]);
      return {
        "/investisseurs": inv,
        "/prospects": pro,
        "/actifs": act,
        "/dossiers": dos,
        "/comparables": comp,
        "/envois": env,
        "/a-qualifier": cont,
        "/cibles": cib,
        "/brokers": brk,
        "/contacts": dir,
        "/notaires": not,
      };
    },
  });
}
