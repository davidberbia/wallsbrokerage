import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Paperclip } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { sendDraft } from "@/lib/assistant.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/validation")({
  head: () => ({
    meta: [
      { title: "Mails à valider — Wallsbrokerage" },
      { name: "description", content: "Mails rédigés par l'assistante IA en attente de validation." },
      { property: "og:title", content: "Mails à valider — Wallsbrokerage" },
      { property: "og:description", content: "Mails rédigés par l'assistante IA en attente de validation." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <ValidationPage />
    </AppLayout>
  ),
});

const KIND: Record<string, string> = {
  reponse_investisseur: "Réponse à l'investisseur (documents)",
  accuse_investisseur: "Accusé à l'investisseur",
  demande_vendeur: "Demande au vendeur",
  remerciement_vendeur: "Remerciement au vendeur",
};

type Draft = {
  id: string;
  kind: string;
  to_email: string;
  subject: string;
  body_html: string;
  attachments: { name: string }[];
  error: string | null;
  reply_to_graph_id: string | null;
};

const htmlToText = (h: string) =>
  h.replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>\s*<p[^>]*>/gi, "\n\n").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").trim();
const textToHtml = (t: string) =>
  t.split(/\n{2,}/).map((p) => `<p>${p.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br/>")}</p>`).join("");

function ValidationPage() {
  const qc = useQueryClient();
  const drafts = useQuery({
    queryKey: ["ai-drafts"],
    queryFn: async () => {
      const { data } = await supabase.from("ai_drafts").select("*").eq("status", "en attente").order("created_at");
      return (data ?? []) as unknown as Draft[];
    },
  });
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["ai-drafts"] });
    qc.invalidateQueries({ queryKey: ["ai-pending"] });
  };
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-semibold">Mails à valider</h1>
      {(drafts.data ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucun mail en attente.</p>}
      {(drafts.data ?? []).map((d) => (
        <DraftCard key={d.id} d={d} onDone={refresh} />
      ))}
    </div>
  );
}

function DraftCard({ d, onDone }: { d: Draft; onDone: () => void }) {
  const send = useServerFn(sendDraft);
  const [subject, setSubject] = useState(d.subject);
  const [body, setBody] = useState(htmlToText(d.body_html));
  const [busy, setBusy] = useState(false);
  return (
    <article className="space-y-3 rounded-md border border-border bg-card p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-xs font-semibold uppercase text-primary">{KIND[d.kind] ?? d.kind}</span>
        <span className="text-sm">À : {d.to_email}{d.reply_to_graph_id ? " (réponse dans le fil)" : ""}</span>
      </div>
      <Input value={subject} onChange={(e) => setSubject(e.target.value)} disabled={!!d.reply_to_graph_id} />
      <Textarea rows={10} value={body} onChange={(e) => setBody(e.target.value)} />
      {d.attachments?.length > 0 && (
        <ul className="space-y-1 text-sm">
          {d.attachments.map((a) => (
            <li key={a.name} className="flex items-center gap-2"><Paperclip className="size-4" />{a.name}</li>
          ))}
        </ul>
      )}
      {d.error && <p className="text-sm text-destructive">Dernière erreur : {d.error}</p>}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Button
          variant="outline"
          disabled={busy}
          onClick={async () => {
            await supabase.from("ai_drafts").update({ status: "rejeté" }).eq("id", d.id);
            onDone();
          }}
        >
          Rejeter
        </Button>
        <Button
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await send({ data: { id: d.id, subject, body_html: textToHtml(body) } });
              toast.success("Mail envoyé depuis votre Outlook");
              onDone();
            } catch (e) {
              toast.error(e instanceof Error ? e.message : "Échec de l'envoi");
            } finally {
              setBusy(false);
            }
          }}
        >
          Valider et envoyer
        </Button>
      </div>
    </article>
  );
}
