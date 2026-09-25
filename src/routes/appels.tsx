import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Loader2, PhoneIncoming, PhoneOutgoing, RefreshCw, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { syncCallsNow } from "@/lib/calls.functions";

export const Route = createFileRoute("/appels")({
  head: () => ({
    meta: [
      { title: "Appels enregistrés — Walls Brokerage CRM" },
      { name: "description", content: "Appels Cube ACR transcrits et résumés automatiquement, avec actions à mener." },
      { property: "og:title", content: "Appels enregistrés — Walls Brokerage CRM" },
      { property: "og:description", content: "Transcription et résumé automatiques des appels téléphoniques et WhatsApp." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <AppelsPage />
    </AppLayout>
  ),
});

function AppelsPage() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const sync = useServerFn(syncCallsNow);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState<string | null>(null);

  const { data: calls = [] } = useQuery({
    queryKey: ["call_recordings"],
    enabled: !!session,
    refetchInterval: 30000,
    queryFn: async () => {
      const { data } = await supabase.from("call_recordings").select("*").order("called_at", { ascending: false }).limit(200);
      return data ?? [];
    },
  });

  const run = async () => {
    setBusy(true);
    try {
      const r = await sync();
      if (r.error) toast.error(r.error);
      else toast.success(`${r.added} nouvel(s) appel(s) trouvé(s), ${r.done} analysé(s).`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Échec de la synchronisation");
    } finally {
      setBusy(false);
      qc.invalidateQueries({ queryKey: ["call_recordings"] });
    }
  };

  const remove = async (id: string) => {
    await supabase.from("call_recordings").delete().eq("id", id);
    qc.invalidateQueries({ queryKey: ["call_recordings"] });
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight">Appels enregistrés</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Les enregistrements Cube ACR du Drive sont récupérés toutes les 30 min entre 8 h et 22 h, transcrits et résumés ;
            contacts, comparables et actualités cités sont ajoutés au CRM.
          </p>
        </div>
        <Button onClick={run} disabled={busy} className="min-h-11">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          Synchroniser maintenant
        </Button>
      </div>

      <ul className="space-y-3">
        {calls.map((c) => (
          <li key={c.id} className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-start gap-3">
              {c.direction === "sortant" ? <PhoneOutgoing className="mt-1 size-4 shrink-0 text-primary" /> : <PhoneIncoming className="mt-1 size-4 shrink-0 text-primary" />}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{[c.contact_name, c.phone].filter(Boolean).join(" · ") || c.file_name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {c.called_at ? new Date(c.called_at).toLocaleString("fr-FR") : ""} · {c.channel === "whatsapp" ? "WhatsApp" : "Téléphone"} · {c.status}
                  {c.status === "analysé" && ` · ${c.found_contacts} contact(s), ${c.found_comparables} comparable(s), ${c.found_news} actualité(s)`}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => remove(c.id)} aria-label="Supprimer">
                <Trash2 className="size-4" />
              </Button>
            </div>
            {c.summary && <p className="mt-2 whitespace-pre-line text-sm">{c.summary}</p>}
            {c.actions && <p className="mt-2 whitespace-pre-line text-sm font-medium">À faire : {c.actions}</p>}
            {c.transcript && (
              <button className="mt-2 text-xs text-primary underline" onClick={() => setOpen(open === c.id ? null : c.id)}>
                {open === c.id ? "Masquer la transcription" : "Voir la transcription"}
              </button>
            )}
            {open === c.id && <p className="mt-2 whitespace-pre-line text-sm text-muted-foreground">{c.transcript}</p>}
            {c.error && <p className="mt-2 text-sm text-destructive">{c.error}</p>}
          </li>
        ))}
        {!calls.length && <p className="text-sm text-muted-foreground">Aucun appel pour l'instant : cliquez sur « Synchroniser maintenant ».</p>}
      </ul>
    </div>
  );
}
