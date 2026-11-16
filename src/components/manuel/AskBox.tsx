import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { BookOpen, Loader2, Send } from "lucide-react";
import { askManual, type ManualAnswer } from "@/lib/manuel.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function AskBox({ tab, onNavigate }: { tab?: string | undefined; onNavigate?: () => void }) {
  const ask = useServerFn(askManual);
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState<ManualAnswer | null>(null);
  const submit = async () => {
    if (q.trim().length < 3 || busy) return;
    setBusy(true);
    setRes(null);
    try {
      const r = await ask({ data: { question: q.trim(), tab } });
      setRes(r);
      if (r.added) qc.invalidateQueries({ queryKey: ["manual-additions"] });
    } catch {
      setRes({ answer: "Je n'ai pas pu répondre, réessayez dans un instant.", ref: null, added: false, mode: "recherche" });
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="space-y-2">
      <Textarea value={q} onChange={(e) => setQ(e.target.value)} placeholder="Posez votre question…" rows={2} maxLength={600} className="text-base" />
      <Button onClick={submit} disabled={busy || q.trim().length < 3} className="min-h-11 w-full">
        {busy ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />} Poser la question
      </Button>
      {res && (
        <div className="space-y-2 rounded-md border border-border bg-muted/40 p-3 text-sm">
          <p className="whitespace-pre-line">{res.answer}</p>
          {res.ref && (
            <Link to="/manuel/$slug" params={{ slug: res.ref.tab }} hash={res.ref.section} onClick={onNavigate} className="inline-flex min-h-11 items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline">
              <BookOpen className="size-4" /> {res.added ? "Ajouté au Manuel : " : "Lire : "}{res.ref.title}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
