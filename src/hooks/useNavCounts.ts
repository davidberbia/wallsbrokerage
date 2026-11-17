import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ASSET_STAGES, TARGET_STAGE, inVintage } from "@/lib/deal-stages";

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
        // Mêmes lignes que le tableau « Suivi des affaires » : hors Prospection et hors
        // étapes Actifs, année en cours (reports automatiques inclus).
        (async () => {
          const year = new Date().getFullYear();
          const { data } = await (supabase as any)
            .from("deals")
            .select("id, vintage, stage, carry_over")
            .not("stage", "in", `("${[TARGET_STAGE, ...ASSET_STAGES].join('","')}")`);
          return ((data ?? []) as { vintage: number; stage: string; carry_over?: boolean | null }[]).filter((d) =>
            inVintage(d, year),
          ).length;
        })(),
        count("comparables"),
        count("brochure_sends"),
        count("mailscan_candidates", (q) => q.eq("status", "à valider")),
        count("deals", (q) => q.eq("stage", "Prospection")),
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
