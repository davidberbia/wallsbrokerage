import { useEffect, useRef, useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ChevronDown, ChevronUp, Loader2, Send, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { chatWithAssistant, getAiStatus } from "@/lib/assistant.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type Msg = { role: string; content: string };

export function AssistantBar({ userId }: { userId: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const chat = useServerFn(chatWithAssistant);
  const status = useServerFn(getAiStatus);
  const qc = useQueryClient();
  const endRef = useRef<HTMLDivElement>(null);

  const history = useQuery({
    queryKey: ["ai-chat", userId],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_chat_messages")
        .select("role,content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(30);
      return ((data ?? []) as Msg[]).reverse();
    },
  });
  const budget = useQuery({ queryKey: ["ai-status"], enabled: open, queryFn: () => status() });

  const pending = useQuery({
    queryKey: ["ai-pending"],
    refetchInterval: 60_000,
    queryFn: async () => {
      const { count } = await supabase
        .from("ai_drafts")
        .select("id", { count: "exact", head: true })
        .eq("status", "en attente");
      return count ?? 0;
    },
  });

  // Notification système (téléphone / PC) quand un nouveau mail attend validation.
  const prev = useRef<number | null>(null);
  useEffect(() => {
    const n = pending.data;
    if (n == null) return;
    if (prev.current != null && n > prev.current && typeof Notification !== "undefined" && Notification.permission === "granted") {
      new Notification("Wallsbroker", { body: "Mail en attente de validation" });
    }
    prev.current = n;
  }, [pending.data]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [history.data, open]);

  const send = async () => {
    const message = input.trim();
    if (!message || busy) return;
    setBusy(true);
    setInput("");
    qc.setQueryData<Msg[]>(["ai-chat", userId], (old) => [...(old ?? []), { role: "user", content: message }]);
    try {
      await chat({ data: { message, page: pathname } });
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["ai-chat", userId] });
      qc.invalidateQueries({ queryKey: ["ai-status"] });
    }
  };

  return (
    <div className="sticky top-16 z-20">
      {(pending.data ?? 0) > 0 && (
        <Link
          to="/validation"
          className="block bg-success px-4 py-3 text-center text-base font-extrabold uppercase tracking-wide text-success-foreground sm:text-xl"
        >
          {pending.data} mail{pending.data! > 1 ? "s" : ""} en attente de validation
        </Link>
      )}
      <div className="border-b border-border bg-card">
        <div className="mx-auto max-w-6xl px-4 sm:px-5">
          <button
            onClick={() => {
              setOpen((o) => !o);
              if (typeof Notification !== "undefined" && Notification.permission === "default") Notification.requestPermission();
            }}
            className="flex w-full items-center gap-2 py-2 text-left text-sm"
          >
            <Sparkles className="size-4 text-primary" />
            <span className="font-semibold">Assistante IA Wallsbroker</span>
            <span className="hidden text-muted-foreground sm:inline">— posez-moi une question</span>
            {open ? <ChevronUp className="ml-auto size-4" /> : <ChevronDown className="ml-auto size-4" />}
          </button>
          {open && (
            <div className="pb-3">
              <div className="max-h-[45vh] space-y-2 overflow-y-auto rounded-sm border border-border bg-background p-3 text-sm">
                {(history.data ?? []).length === 0 && (
                  <p className="text-muted-foreground">
                    Bonjour David. Je peux répondre à vos questions d'immobilier, rédiger un mail ou noter une amélioration pour cette page.
                  </p>
                )}
                {(history.data ?? []).map((m, i) => (
                  <div key={i} className={m.role === "user" ? "text-right" : ""}>
                    <span
                      className={
                        "inline-block max-w-[90%] whitespace-pre-wrap rounded-sm px-3 py-2 text-left " +
                        (m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted")
                      }
                    >
                      {m.content}
                    </span>
                  </div>
                ))}
                {busy && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
                <div ref={endRef} />
              </div>
              <div className="mt-2 flex gap-2">
                <Textarea
                  rows={2}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send();
                    }
                  }}
                  placeholder="Votre question…"
                  className="min-h-0"
                />
                <Button onClick={send} disabled={busy || !input.trim()} aria-label="Envoyer">
                  <Send className="size-4" />
                </Button>
              </div>
              {budget.data && (
                <p className="mt-1 text-right font-mono text-[10px] text-muted-foreground">
                  IA ce mois : {budget.data.spent.toFixed(2)} € / {budget.data.budget} €
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
