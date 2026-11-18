import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { ASSET_STAGES, TARGET_STAGE, inVintage } from "@/lib/deal-stages";
import { leadViewStatus } from "@/lib/lead-documents";
import { pigeActive } from "@/lib/pige";

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
        count("assets", (q) => q.neq("status", "prospection")),
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
        // Même règle que l'onglet « À traiter » des Leads.
        (async () => {
          const year = new Date().getFullYear();
          const [deals, reqs, piges] = await Promise.all([
            (supabase as any).from("deals").select("id, vintage, stage, carry_over, lead_status, snooze_until").eq("stage", TARGET_STAGE),
            (supabase as any).from("lead_document_requests").select("deal_id,status,created_at").order("created_at", { ascending: false }).limit(5000),
            (supabase as any).from("lead_piges").select("deal_id,started_at,due_at,completed_at,created_at").order("created_at", { ascending: false }).limit(5000),
          ]);
          const latest = new Map<string, any>();
          for (const r of reqs.data ?? []) if (!latest.has(r.deal_id)) latest.set(r.deal_id, r);
          const now = Date.now();
          return ((deals.data ?? []) as any[]).filter((d) => {
            if (!inVintage(d, year) || d.lead_status === "archived") return false;
            const p = (piges.data ?? []).find((x: any) => x.deal_id === d.id && x.started_at);
            if (pigeActive(p)) return false;
            if (d.snooze_until && new Date(d.snooze_until).getTime() > now) return false;
            const r = latest.get(d.id);
            if (p && (!r || r.created_at < (p.started_at ?? p.created_at))) return true;
            return leadViewStatus(d.lead_status ?? "new", r) === "new";
          }).length;
        })(),
        count("directory_contacts", (q) => q.eq("kind", "broker")),
        count("directory_contacts", (q) => q.eq("kind", "utile")),
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
        "/utile": dir,
        "/notaires": not,
      };
    },
  });
}
