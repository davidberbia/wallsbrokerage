import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Clock } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { MODULES } from "@/lib/formation";
import { progressPercent } from "@/lib/formation/rules";
import { loadMyProgress } from "@/components/formation/progress";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/formation/")({
  head: () => ({
    meta: [
      { title: "Formation immo — Wallsbrokerage" },
      { name: "description", content: "Modules de formation immobilière avec quiz et validation à 80 %." },
      { property: "og:title", content: "Formation immo — Wallsbrokerage" },
      { property: "og:description", content: "Parcours de formation immobilière de l'équipe Wallsbrokerage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <FormationHome />
    </AppLayout>
  ),
});

function FormationHome() {
  const { user } = useAuth();
  const { data = [] } = useQuery({ queryKey: ["training", user?.id], queryFn: () => loadMyProgress(user!.id), enabled: !!user });
  const done = data.filter((p) => p.passed_at).length;
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <div>
        <h1 className="font-display text-2xl font-semibold">Formation immo</h1>
        <p className="text-sm text-muted-foreground">{done} / {MODULES.length} modules validés · validation à 80 %</p>
      </div>
      <ul className="space-y-2">
        {MODULES.map((m, i) => {
          const p = data.find((x) => x.module_slug === m.slug);
          const pct = p?.passed_at ? 100 : p ? progressPercent(m, p.step_index) : 0;
          return (
            <li key={m.slug}>
              <Link to="/formation/$slug" params={{ slug: m.slug }} className="block rounded-lg border border-border bg-card p-3 active:bg-muted">
                <div className="flex items-start gap-2">
                  <span className="font-mono text-xs text-muted-foreground">{String(i + 1).padStart(2, "0")}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium">{m.title}</div>
                    <div className="line-clamp-2 text-xs text-muted-foreground">{m.summary}</div>
                  </div>
                  {p?.passed_at ? <CheckCircle2 className="size-5 shrink-0 text-primary" /> : (
                    <span className="flex shrink-0 items-center gap-1 text-xs text-muted-foreground"><Clock className="size-3" />{m.minutes} min</span>
                  )}
                </div>
                {pct > 0 && <Progress value={pct} className="mt-2 h-1.5" />}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
