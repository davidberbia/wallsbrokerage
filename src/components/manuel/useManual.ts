import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { MANUAL_TABS } from "@/lib/manuel/content";
import { listManualAdditions } from "@/lib/manuel.functions";
import type { ManualTab } from "@/lib/manuel/types";

/** Manuel écrit + paragraphes ajoutés automatiquement en réponse aux questions. */
export function useManual(): ManualTab[] {
  const list = useServerFn(listManualAdditions);
  const { data = [] } = useQuery({ queryKey: ["manual-additions"], queryFn: () => list() });
  return MANUAL_TABS.map((t) => ({
    ...t,
    sections: [
      ...t.sections,
      ...data.filter((r) => r.tab === t.slug).map((r) => ({ id: `q-${r.id.slice(0, 8)}`, title: r.title, body: r.body.split("\n").filter(Boolean), auto: true })),
    ],
  }));
}
