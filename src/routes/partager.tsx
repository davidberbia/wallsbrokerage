import { CompactRow, RecordDialog, RecordFacts } from "@/components/CompactRow";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { ExternalLink, Link2, Loader2, RefreshCw, Trash2 } from "lucide-react";
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
      { title: "Veille — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Envoyez un article, une vidéo ou un reel : l'IA en extrait contacts, comparables et actualités.",
      },
      { property: "og:title", content: "Veille — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Analyse automatique des liens partagés depuis le téléphone.",
      },
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
  const { session, canEdit } = useAuth();
  const qc = useQueryClient();
  const send = useServerFn(submitLink);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editNote, setEditNote] = useState("");
  const [url, setUrl] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const auto = useRef(false);

  const { data: links = [] } = useQuery({
    queryKey: ["shared_links"],
    enabled: !!session,
    refetchInterval: 15000,
    queryFn: async () => {
      const { data } = await supabase
        .from("shared_links")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);
      return data ?? [];
    },
  });

  const go = async (u: string, n: string, force = false) => {
    if (!/^https?:\/\//.test(u)) {
      toast.error("Collez un lien commençant par http");
      return;
    }
    setBusy(true);
    try {
      const r = await send({ data: { url: u, note: n || undefined, force } });
      toast.success(
        r.already ? "Ce lien avait déjà été analysé." : "Lien analysé et ajouté au CRM.",
      );
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

  const detail = links.find((l) => l.id === detailId);
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-semibold">Veille</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Article, vidéo YouTube, reel Instagram ou TikTok : l'IA regarde la vidéo en entier, en
          tire contacts, actualités et une cible, puis la complète par une recherche web. Sur
          téléphone, utilisez simplement le bouton « Partager » puis « Wallsbroker ».
        </p>
      </div>

      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <Input
          placeholder="https://…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          inputMode="url"
        />
        <Textarea
          placeholder="Remarque (facultatif)"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
        />
        <Button
          onClick={() => go(url.trim(), note.trim())}
          disabled={busy || !url.trim()}
          className="min-h-11 w-full sm:w-auto"
        >
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Link2 className="size-4" />}
          {busy ? "Analyse en cours…" : "Analyser le lien"}
        </Button>
      </div>

      <div className="overflow-hidden border-y border-border">
        {links.map((l) => (
          <CompactRow
            key={l.id}
            title={l.title || l.url}
            subtitle={`${new Date(l.created_at).toLocaleString("fr-FR")} · ${l.status}`}
            onOpen={() => {
              setDetailId(l.id);
              setEditing(false);
            }}
            onEdit={
              canEdit
                ? () => {
                    setDetailId(l.id);
                    setEditing(true);
                    setEditTitle(l.title ?? "");
                    setEditNote(l.note ?? "");
                  }
                : undefined
            }
            onDelete={canEdit ? () => void remove(l.id) : undefined}
          />
        ))}
        {!links.length && (
          <p className="py-4 text-sm text-muted-foreground">Aucun lien pour l’instant.</p>
        )}
      </div>
      <RecordDialog
        title={detail?.title || "Lien de veille"}
        open={!!detail}
        onClose={() => setDetailId(null)}
      >
        {detail && (
          <>
            {editing ? (
              <form
                className="space-y-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void (async () => {
                    const { error } = await supabase
                      .from("shared_links")
                      .update({ title: editTitle, note: editNote })
                      .eq("id", detail.id);
                    if (error) toast.error(error.message);
                    else {
                      setEditing(false);
                      void qc.invalidateQueries({ queryKey: ["shared_links"] });
                    }
                  })();
                }}
              >
                <label className="grid gap-1 text-sm">
                  Titre
                  <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
                </label>
                <label className="grid gap-1 text-sm">
                  Remarque
                  <Textarea value={editNote} onChange={(e) => setEditNote(e.target.value)} />
                </label>
                <Button type="submit">Enregistrer</Button>
              </form>
            ) : (
              <RecordFacts
                facts={[
                  [
                    "Lien",
                    <a
                      className="break-all underline"
                      href={detail.url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {detail.url}
                    </a>,
                  ],
                  ["Date", new Date(detail.created_at).toLocaleString("fr-FR")],
                  ["Statut", detail.status],
                  ["Remarque", detail.note],
                  ["Résumé", detail.summary],
                  ["Erreur", detail.error],
                ]}
              />
            )}
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => go(detail.url, detail.note ?? "", true)}
            >
              <RefreshCw className="size-4" /> Relancer l’analyse
            </Button>
          </>
        )}
      </RecordDialog>
    </div>
  );
}
