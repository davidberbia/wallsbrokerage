import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Link2, Loader2, Trash2 } from "lucide-react";
import { z } from "zod";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { submitLink } from "@/lib/links.functions";

const search = z.object({
  url: z.string().optional(),
  text: z.string().optional(),
  title: z.string().optional(),
});

export const Route = createFileRoute("/partager")({
  validateSearch: search,
  head: () => ({
    meta: [
      { title: "Liens partagés — Walls Brokerage CRM" },
      { name: "description", content: "Envoyez un article, une vidéo ou un reel : l'IA en extrait contacts, comparables et actualités." },
      { property: "og:title", content: "Liens partagés — Walls Brokerage CRM" },
      { property: "og:description", content: "Analyse automatique des liens partagés depuis le téléphone." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <PartagerPage />
    </AppLayout>
  ),
});

function findUrl(...parts: (string | undefined)[]) {
  for (const p of parts) {
    const m = p?.match(/https?:\/\/\S+/);
    if (m) return m[0].replace(/[)\].,;]+$/, "");
  }
  return "";
}

function PartagerPage() {
  const params = Route.useSearch();
  const { session } = useAuth();
  const qc = useQueryClient();
  const send = useServerFn(submitLink);
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const auto = useRef(false);

  const { data: links = [] } = useQuery({
    queryKey: ["shared_links"],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await supabase.from("shared_links").select("*").order("created_at", { ascending: false }).limit(100);
      return data ?? [];
    },
  });

  const go = async (u: string, n: string) => {
    if (!/^https?:\/\//.test(u)) {
      toast.error("Collez un lien commençant par http");
      return;
    }
    setBusy(true);
    try {
      const r = await send({ data: { url: u, note: n || undefined } });
      toast.success(r.already ? "Ce lien avait déjà été analysé." : "Lien analysé et ajouté au CRM.");
      setUrl("");
      setNote("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de l'analyse");
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["shared_links"] });
    }
  };

  // Arrivée depuis le menu « Partager » du téléphone : analyse immédiate.
  useEffect(() => {
    if (auto.current || !session) return;
    const u = findUrl(params.url, params.text, params.title);
    if (!u) return;
    auto.current = true;
    const n = [params.title, params.text].filter((x) => x && !x.includes(u)).join(" — ");
    setUrl(u);
    void go(u, n);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session, params.url, params.text, params.title]);

  const remove = async (id: string) => {
    await supabase.from("shared_links").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["shared_links"] });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Liens partagés</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Article, vidéo YouTube, reel Instagram ou TikTok : l'IA en tire contacts, comparables et actualités, sans explication.
          Sur téléphone, utilisez simplement le bouton « Partager » puis « Wallsbroker ».
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Input placeholder="https://…" value={url} onChange={(e) => setUrl(e.target.value)} inputMode="url" />
        <Textarea placeholder="Remarque (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        <Button onClick={() => go(url.trim(), note.trim())} disabled={busy || !url.trim()} className="min-h-11 w-full sm:w-auto">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          {busy ? "Analyse en cours…" : "Analyser le lien"}
        </Button>
      </div>

      <ul className="space-y-3">
        {links.map((l) => (
          <li key={l.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <a href={l.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 font-medium hover:underline">
                  <span className="truncate">{l.title || l.url}</span>
                  <ExternalLink className="size-3.5 shrink-0" />
                </a>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(l.created_at).toLocaleString("fr-FR")} · {l.status}
                  {l.status === "analysé" &&
                    ` · ${l.found_contacts} contact(s), ${l.found_comparables} comparable(s), ${l.found_news} actualité(s)`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(l.id)} aria-label="Supprimer">
                <Trash2 className="size-4" />
              </Button>
            </div>
            {l.summary && <p className="mt-2 whitespace-pre-line text-sm">{l.summary}</p>}
            {l.error && <p className="mt-2 text-sm text-destructive">{l.error}</p>}
          </li>
        ))}
        {!links.length && <p className="text-sm text-muted-foreground">Aucun lien pour l'instant.</p>}
      </ul>
    </div>
  );
}
