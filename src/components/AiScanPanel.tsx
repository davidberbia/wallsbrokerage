import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Pause, Play, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { getAiscanStatus, setAiscanRunning } from "@/lib/aiscan.functions";
import { Button } from "@/components/ui/button";

const LABEL: Record<string, string> = {
  "en cours": "Analyse en cours",
  "arrêté": "À l'arrêt",
  "en pause": "En pause",
  "terminé": "Terminée",
};

export function AiScanPanel() {
  const fetchStatus = useServerFn(getAiscanStatus);
  const toggle = useServerFn(setAiscanRunning);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["aiscan-status"], queryFn: () => fetchStatus(), refetchInterval: 30_000 });
  const m = useMutation({
    mutationFn: (running: boolean) => toggle({ data: { running } }),
    onSuccess: (_d, running) => {
      toast.success(running ? "Analyse IA lancée" : "Analyse IA en pause");
      void qc.invalidateQueries({ queryKey: ["aiscan-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  const s = q.data?.state;
  const running = s?.status === "en cours";
  const n = (v: number | undefined) => (v ?? 0).toLocaleString("fr-FR");

  return (
    <div className="panel space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Gemini</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl">
            <Sparkles className="size-5" /> Analyse IA de toute la boîte
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Du plus vieux mail au plus récent, reçus puis envoyés. Chaque pièce jointe n'est lue qu'une fois.
          </p>
        </div>
        <Button className="min-h-11 sm:min-h-9" onClick={() => m.mutate(!running)} disabled={m.isPending || q.isLoading}>
          {running ? <Pause className="size-4" /> : <Play className="size-4" />}
          <span className="ml-2">{running ? "Mettre en pause" : s?.messages_done ? "Reprendre" : "Lancer"}</span>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <Stat label="État" value={LABEL[s?.status ?? "arrêté"] ?? s?.status ?? "—"} />
        <Stat label="Dossier" value={s?.folder === "sentitems" ? "Envoyés" : "Reçus"} />
        <Stat label="Arrivé au" value={s?.last_mail_at ? new Date(s.last_mail_at).toLocaleDateString("fr-FR") : "—"} />
        <Stat label="Mails lus" value={n(s?.messages_done)} />
        <Stat label="Pièces jointes lues" value={n(s?.attachments_done)} />
        <Stat label="Doublons évités" value={n(s?.attachments_dup)} />
        <Stat label="Contacts trouvés" value={n(s?.contacts_found)} />
        <Stat label="Comparables" value={n(s?.comparables_found)} />
        <Stat label="Actualités" value={n(s?.news_found)} />
        <Stat label="Coût IA du mois" value={`${(q.data?.spent ?? 0).toFixed(2)} € / 30 €`} />
      </div>
      {s?.last_error && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Dernier incident : {s.last_error}
        </p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/40 px-3 py-2">
      <p className="eyebrow">{label}</p>
      <p className="mt-0.5 truncate text-sm font-medium">{value}</p>
    </div>
  );
}
