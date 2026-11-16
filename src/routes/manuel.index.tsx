import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, HelpCircle } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { useAuth } from "@/hooks/useAuth";
import { MANUAL_TABS } from "@/lib/manuel/content";
import { Shot } from "@/components/manuel/Shot";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

export const Route = createFileRoute("/manuel/")({
  head: () => ({
    meta: [
      { title: "Manuel du CRM — Wallsbrokerage" },
      { name: "description", content: "Présentation commentée de chaque onglet du CRM Wallsbrokerage, manuel écrit et FAQ." },
      { property: "og:title", content: "Manuel du CRM — Wallsbrokerage" },
      { property: "og:description", content: "Apprenez à utiliser chaque onglet du CRM Wallsbrokerage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <ManualHome />
    </AppLayout>
  ),
});

function ManualHome() {
  const { isSuperAdmin } = useAuth();
  const tabs = MANUAL_TABS.filter((t) => !t.admin || isSuperAdmin);
  const [i, setI] = useState(0);
  const t = tabs[i] ?? tabs[0]!;
  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 pb-28">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold">Manuel du CRM</h1>
          <p className="text-sm text-muted-foreground">Présentation générale, onglet par onglet.</p>
        </div>
        <Button asChild variant="outline" className="min-h-11 shrink-0">
          <Link to="/manuel/faq"><HelpCircle className="size-4" /> FAQ</Link>
        </Button>
      </div>

      <section className="space-y-3 rounded-lg border border-border bg-card p-4" aria-label="Présentation générale">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Présentation générale · {i + 1} / {tabs.length}</span>
          <span className="font-mono">{Math.round(((i + 1) / tabs.length) * 100)} %</span>
        </div>
        <Progress value={((i + 1) / tabs.length) * 100} className="h-1.5" />
        <h2 className="font-display text-xl font-semibold">{t.label}</h2>
        <audio key={t.slug} controls preload="none" src={`/manuel/audio/${t.slug}.mp3`} className="w-full" />
        <Shot slug={t.slug} alt={`Écran ${t.label}`} />
        <p className="text-[15px] leading-relaxed">{t.narration}</p>
        <Link to="/manuel/$slug" params={{ slug: t.slug }} className="inline-flex min-h-11 items-center gap-1 text-sm font-medium text-primary">
          Module détaillé <ChevronRight className="size-4" />
        </Link>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <Button variant="outline" className="min-h-12" disabled={i === 0} onClick={() => setI(i - 1)}>Précédent</Button>
          <Button className="min-h-12" disabled={i === tabs.length - 1} onClick={() => setI(i + 1)}>Suivant</Button>
        </div>
      </section>

      <section aria-label="Modules par onglet">
        <h2 className="mb-2 font-display text-lg font-semibold">Modules par onglet</h2>
        <ul className="space-y-2">
          {tabs.map((m, n) => (
            <li key={m.slug}>
              <Link to="/manuel/$slug" params={{ slug: m.slug }} className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-card p-3 active:bg-muted">
                <span className="font-mono text-xs text-muted-foreground">{String(n + 1).padStart(2, "0")}</span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{m.label}</span>
                  <span className="line-clamp-1 text-xs text-muted-foreground">{m.intro}</span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
