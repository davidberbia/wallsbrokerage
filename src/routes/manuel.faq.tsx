import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, BookOpen } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { FAQ, MANUAL_TABS } from "@/lib/manuel/content";
import { AskBox } from "@/components/manuel/AskBox";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

export const Route = createFileRoute("/manuel/faq")({
  head: () => ({
    meta: [
      { title: "FAQ du CRM — Wallsbrokerage" },
      { name: "description", content: "Questions fréquentes sur le CRM Wallsbrokerage, avec renvoi vers le Manuel." },
      { property: "og:title", content: "FAQ du CRM — Wallsbrokerage" },
      { property: "og:description", content: "Questions fréquentes et question libre sur le CRM Wallsbrokerage." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <FaqPage />
    </AppLayout>
  ),
});

function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-5 p-4 pb-24">
      <Link to="/manuel" className="inline-flex min-h-10 items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="size-3" /> Manuel</Link>
      <h1 className="font-display text-2xl font-semibold">FAQ</h1>
      <section className="space-y-2 rounded-lg border border-border bg-card p-4">
        <h2 className="font-display text-base font-semibold">Votre question</h2>
        <AskBox />
      </section>
      <Accordion type="single" collapsible className="rounded-lg border border-border bg-card px-3">
        {FAQ.map((f, i) => {
          const t = MANUAL_TABS.find((x) => x.slug === f.tab);
          const s = t?.sections.find((x) => x.id === f.section);
          return (
            <AccordionItem key={i} value={String(i)}>
              <AccordionTrigger className="min-h-12 text-left text-sm">{f.q}</AccordionTrigger>
              <AccordionContent className="space-y-2 text-sm">
                <p>{s?.body.find((p) => !p.startsWith("- ")) ?? s?.body[0]}</p>
                {t && s && (
                  <Link to="/manuel/$slug" params={{ slug: t.slug }} hash={s.id} className="inline-flex min-h-10 items-center gap-1.5 font-medium text-primary">
                    <BookOpen className="size-4" /> {t.label} · {s.title}
                  </Link>
                )}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>
    </div>
  );
}
