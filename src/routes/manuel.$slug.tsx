import { useEffect } from "react";
import { createFileRoute, Link, notFound, useLocation } from "@tanstack/react-router";
import { ArrowLeft, Sparkles } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { MANUAL_TABS } from "@/lib/manuel/content";
import { Shot } from "@/components/manuel/Shot";
import { useManual } from "@/components/manuel/useManual";
import { AskBox } from "@/components/manuel/AskBox";

export const Route = createFileRoute("/manuel/$slug")({
  loader: ({ params }) => {
    const t = MANUAL_TABS.find((x) => x.slug === params.slug);
    if (!t) throw notFound();
    return { label: t.label, intro: t.intro };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.label ?? "Manuel"} — Manuel du CRM` },
      { name: "description", content: loaderData?.intro ?? "Manuel du CRM Wallsbrokerage." },
      { property: "og:title", content: `${loaderData?.label ?? "Manuel"} — Manuel du CRM` },
      { property: "og:description", content: loaderData?.intro ?? "Manuel du CRM Wallsbrokerage." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <ManualTabPage />
    </AppLayout>
  ),
});

function ManualTabPage() {
  const { slug } = Route.useParams();
  const hash = useLocation({ select: (l) => l.hash });
  const t = useManual().find((x) => x.slug === slug)!;
  useEffect(() => {
    if (hash) setTimeout(() => document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" }), 150);
  }, [hash, t.sections.length]);
  return (
    <article className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
      <Link to="/manuel" className="inline-flex min-h-10 items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="size-3" /> Manuel</Link>
      <header className="space-y-1">
        <h1 className="font-display text-2xl font-semibold">{t.label}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
      </header>
      <audio controls preload="none" src={`/manuel/audio/${t.slug}.mp3`} className="w-full" />
      <Shot slug={t.slug} alt={`Écran ${t.label}`} />
      <nav aria-label="Sommaire" className="rounded-lg border border-border bg-card p-3">
        <p className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">Sommaire</p>
        <ol className="space-y-0.5 text-sm">
          {t.sections.map((s, n) => (
            <li key={s.id}><a href={`#${s.id}`} className="flex min-h-9 items-center gap-2 text-primary"><span className="font-mono text-xs text-muted-foreground">{n + 1}.</span>{s.title}</a></li>
          ))}
        </ol>
      </nav>
      {t.sections.map((s, n) => (
        <section key={s.id} id={s.id} className="scroll-mt-20 space-y-2">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <span className="font-mono text-sm text-muted-foreground">{n + 1}.</span> {s.title}
            {s.auto && <Sparkles className="size-4 text-accent" aria-label="Ajouté suite à une question" />}
          </h2>
          {s.body.map((p, k) =>
            p.startsWith("- ") ? (
              <p key={k} className="flex gap-2 pl-1 text-[15px] leading-relaxed"><span className="text-primary">•</span><span>{p.slice(2)}</span></p>
            ) : (
              <p key={k} className="text-[15px] leading-relaxed">{p}</p>
            ),
          )}
        </section>
      ))}
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="font-display text-base font-semibold">Une question sur cet onglet ?</h2>
        <AskBox tab={t.slug} />
      </section>
    </article>
  );
}
