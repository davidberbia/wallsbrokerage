import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadShared, viewShare } from "@/lib/share.functions";

export const Route = createFileRoute("/partage/$token")({
  head: () => ({
    meta: [
      { title: "Documents partagés — Wallsbroker" },
      { name: "description", content: "Documents mis à disposition par Wallsbroker." },
      { property: "og:title", content: "Documents partagés — Wallsbroker" },
      { property: "og:description", content: "Documents mis à disposition par Wallsbroker." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SharePage,
});

type View = Awaited<ReturnType<typeof viewShare>>;

function SharePage() {
  const { token } = Route.useParams();
  const [view, setView] = useState<View | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  useEffect(() => {
    viewShare({ data: { token } })
      .then(setView)
      .catch(() => setView({ ok: false, reason: "Lien invalide." }));
  }, [token]);

  const download = async (id: string) => {
    setBusy(id);
    try {
      const { url } = await downloadShared({ data: { token, documentId: id } });
      window.location.href = url;
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <main className="mx-auto min-h-screen max-w-xl space-y-6 p-5">
      <p className="eyebrow">Wallsbroker</p>
      {!view && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {view && !view.ok && <div className="panel p-6 text-center">{view.reason}</div>}
      {view?.ok && (
        <>
          <div>
            <h1 className="text-2xl">{view.title}</h1>
            <p className="text-sm text-muted-foreground">
              {view.city ? `${view.city} · ` : ""}Accès jusqu'au {new Date(view.expiresAt).toLocaleDateString("fr-FR")}
            </p>
          </div>
          <div className="grid gap-3">
            {view.documents.map((d) => (
              <div key={d.id} className="panel flex items-center gap-3 p-4">
                <FileText className="size-5 shrink-0" />
                <span className="min-w-0 flex-1 break-words text-sm">{d.name}</span>
                <Button className="min-h-11" onClick={() => void download(d.id)} disabled={busy === d.id}>
                  <Download className="size-4" /> Télécharger
                </Button>
              </div>
            ))}
            {view.documents.length === 0 && <p className="text-sm text-muted-foreground">Aucun document.</p>}
          </div>
        </>
      )}
    </main>
  );
}
