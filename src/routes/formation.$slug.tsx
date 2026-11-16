import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Check, RotateCcw, X } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/useAuth";
import { getModule } from "@/lib/formation";
import type { FormationModule, Question } from "@/lib/formation/types";
import { PASS_RATE, progressPercent, scoreFinal } from "@/lib/formation/rules";
import { loadMyProgress, saveProgress } from "@/components/formation/progress";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/formation/$slug")({
  loader: ({ params }) => {
    const mod = getModule(params.slug);
    if (!mod) throw notFound();
    return { title: mod.title, summary: mod.summary };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `${loaderData?.title ?? "Module"} — Formation immo` },
      { name: "description", content: loaderData?.summary ?? "Module de formation immobilière." },
      { property: "og:title", content: `${loaderData?.title ?? "Module"} — Formation immo` },
      { property: "og:description", content: loaderData?.summary ?? "Module de formation immobilière." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Page,
});

function Page() {
  const { slug } = Route.useParams();
  const mod = getModule(slug)!;
  return (
    <AppLayout requireBroker>
      <Player key={slug} mod={mod} />
    </AppLayout>
  );
}

function Player({ mod }: { mod: FormationModule }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const { data: progress, isFetched } = useQuery({ queryKey: ["training", user?.id], queryFn: () => loadMyProgress(user!.id), enabled: !!user });
  const mine = progress?.find((p) => p.module_slug === mod.slug);
  const [step, setStep] = useState<number | null>(null);
  useEffect(() => {
    if (step === null && isFetched) setStep(mine?.passed_at ? 0 : Math.min(mine?.step_index ?? 0, mod.steps.length));
  }, [isFetched, mine, step, mod.steps.length]);

  const go = (n: number) => {
    setStep(n);
    window.scrollTo({ top: 0 });
    if (user && !mine?.passed_at) saveProgress(user.id, mod.slug, { step_index: n }).then(() => qc.invalidateQueries({ queryKey: ["training"] }));
  };
  if (step === null) return <div className="p-6 text-sm text-muted-foreground">Chargement…</div>;
  const isFinal = step >= mod.steps.length;
  const current = mod.steps[step];
  const pct = progressPercent(mod, step);

  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-2xl flex-col p-4">
      <div className="mb-4 space-y-2">
        <Link to="/formation" className="inline-flex items-center gap-1 text-xs text-muted-foreground"><ArrowLeft className="size-3" />Modules</Link>
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <span className="truncate">{mod.title}</span>
          <span className="font-mono">{pct} %</span>
        </div>
        <Progress value={pct} className="h-1.5" />
      </div>

      <div className="flex-1">
        {isFinal || !current ? (
          <FinalQuiz mod={mod} best={mine?.best_score ?? null} passed={!!mine?.passed_at} onRestart={() => go(0)} />
        ) : current.kind === "page" ? (
          <article className="space-y-4">
            <h1 className="font-display text-2xl font-semibold leading-tight">{current.title}</h1>
            <Body lines={current.body} />
          </article>
        ) : (
          <MiniQuiz key={step} questions={current.questions} />
        )}
      </div>

      {!isFinal && (
        <div className="sticky bottom-0 mt-6 flex gap-2 bg-background py-3">
          <Button variant="outline" className="h-12 flex-1" disabled={step === 0} onClick={() => go(step - 1)}>Précédent</Button>
          <Button className="h-12 flex-[2]" onClick={() => go(step + 1)}>
            {step === mod.steps.length - 1 ? "Questionnaire final" : "Suivant"}
          </Button>
        </div>
      )}
    </div>
  );
}

function Body({ lines }: { lines: string[] }) {
  const blocks: (string | string[])[] = [];
  for (const l of lines) {
    if (l.startsWith("- ")) {
      const last = blocks[blocks.length - 1];
      if (Array.isArray(last)) last.push(l.slice(2));
      else blocks.push([l.slice(2)]);
    } else blocks.push(l);
  }
  return (
    <div className="space-y-3 text-[15px] leading-relaxed">
      {blocks.map((b, i) =>
        Array.isArray(b) ? (
          <ul key={i} className="list-disc space-y-1 pl-5">{b.map((x, j) => <li key={j}>{x}</li>)}</ul>
        ) : (
          <p key={i}>{b}</p>
        ),
      )}
    </div>
  );
}

function QuestionCard({ q, index, value, onPick, reveal }: { q: Question; index: number; value: number | null; onPick: (n: number) => void; reveal: boolean }) {
  return (
    <div className="space-y-2 rounded-lg border border-border bg-card p-3">
      <p className="font-medium">{index + 1}. {q.q}</p>
      <div className="space-y-1.5">
        {q.options.map((o, i) => {
          const good = reveal && i === q.answer;
          const bad = reveal && value === i && i !== q.answer;
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => onPick(i)}
              className={cn(
                "flex w-full items-start gap-2 rounded-md border px-3 py-2.5 text-left text-sm",
                value === i ? "border-primary bg-primary/10" : "border-border",
                good && "border-primary bg-primary/15",
                bad && "border-destructive bg-destructive/10",
              )}
            >
              <span className="flex-1">{o}</span>
              {good && <Check className="size-4 shrink-0 text-primary" />}
              {bad && <X className="size-4 shrink-0 text-destructive" />}
            </button>
          );
        })}
      </div>
      {reveal && <p className="text-xs text-muted-foreground">{q.explain}</p>}
    </div>
  );
}

function MiniQuiz({ questions }: { questions: Question[] }) {
  const [answers, setAnswers] = useState<(number | null)[]>(() => questions.map(() => null));
  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-semibold">Petit point mémoire</h1>
      {questions.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} value={answers[i] ?? null} reveal={answers[i] != null} onPick={(n) => setAnswers((a) => a.map((x, j) => (j === i ? n : x)))} />
      ))}
    </div>
  );
}

function FinalQuiz({ mod, best, passed, onRestart }: { mod: FormationModule; best: number | null; passed: boolean; onRestart: () => void }) {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [answers, setAnswers] = useState<(number | null)[]>(() => mod.final.map(() => null));
  const [result, setResult] = useState<ReturnType<typeof scoreFinal> | null>(null);
  const missing = useMemo(() => answers.filter((a) => a === null).length, [answers]);

  const submit = async () => {
    const r = scoreFinal(mod.final, answers);
    setResult(r);
    window.scrollTo({ top: 0 });
    if (!user) return;
    const score = Math.round(r.rate * 100);
    await saveProgress(user.id, mod.slug, {
      best_score: Math.max(score, best ?? 0),
      attempts: 1 + (qc.getQueryData<{ module_slug: string; attempts: number }[]>(["training", user.id])?.find((p) => p.module_slug === mod.slug)?.attempts ?? 0),
      ...(r.passed ? { passed_at: new Date().toISOString(), step_index: mod.steps.length } : { step_index: 0 }),
    });
    qc.invalidateQueries({ queryKey: ["training"] });
  };

  return (
    <div className="space-y-3">
      <h1 className="font-display text-xl font-semibold">Questionnaire final</h1>
      {result ? (
        <div className={cn("rounded-lg border p-4", result.passed ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10")}>
          <p className="text-lg font-semibold">{result.correct} / {result.total} — {Math.round(result.rate * 100)} %</p>
          <p className="text-sm">{result.passed ? "Module validé, bravo !" : `Il faut ${PASS_RATE * 100} % pour valider : recommencez le module.`}</p>
          <div className="mt-3 flex gap-2">
            {result.passed ? (
              <Button asChild className="h-11"><Link to="/formation">Retour aux modules</Link></Button>
            ) : (
              <Button className="h-11" onClick={onRestart}><RotateCcw className="mr-1 size-4" />Recommencer</Button>
            )}
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{mod.final.length} questions · validation à {PASS_RATE * 100} %{passed ? " · déjà validé" : ""}</p>
      )}
      {mod.final.map((q, i) => (
        <QuestionCard key={i} q={q} index={i} value={answers[i] ?? null} reveal={!!result} onPick={(n) => setAnswers((a) => a.map((x, j) => (j === i ? n : x)))} />
      ))}
      {!result && (
        <Button className="sticky bottom-3 h-12 w-full" disabled={missing > 0} onClick={submit}>
          {missing > 0 ? `Encore ${missing} réponse${missing > 1 ? "s" : ""}` : "Valider mes réponses"}
        </Button>
      )}
    </div>
  );
}
