import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { Mail, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getMailscanStatus, setMailscanRunning } from "@/lib/mailscan.functions";
import { Button } from "@/components/ui/button";

const FOLDERS: Record<string, string> = {
  inbox: "Boîte de réception",
  sentitems: "Éléments envoyés",
};

const STATUS_LABEL: Record<string, string> = {
  "en cours": "Analyse en cours",
  "arrêté": "À l'arrêt",
  "en pause": "En pause (incident)",
  "terminé": "Analyse terminée",
};

export function MailScanPanel() {
  const fetchStatus = useServerFn(getMailscanStatus);
  const toggle = useServerFn(setMailscanRunning);
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["mailscan-status"],
    queryFn: () => fetchStatus(),
    refetchInterval: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (vars: { running: boolean; restart?: boolean }) => toggle({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.restart
          ? "Analyse relancée depuis le début"
          : vars.running
            ? "Analyse de la boîte mail lancée"
            : "Analyse mise en pause",
      );
      void qc.invalidateQueries({ queryKey: ["mailscan-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const s = status.data;
  const running = s?.status === "en cours";

  return (
    <div className="panel space-y-4 p-4 sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="eyebrow">Boîte mail</p>
          <h2 className="mt-1 flex items-center gap-2 text-xl">
            <Mail className="size-5" /> Détection de contacts
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Parcourt vos emails reçus et envoyés, repère les adresses professionnelles du secteur
            immobilier et prépare les fiches à valider.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            className="min-h-11 sm:min-h-9"
            onClick={() => mutation.mutate({ running: !running })}
            disabled={mutation.isPending || status.isLoading}
          >
            {running ? <Pause className="size-4" /> : <Play className="size-4" />}
            <span className="ml-2">{running ? "Mettre en pause" : "Lancer l'analyse"}</span>
          </Button>
          <Button
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => mutation.mutate({ running: true, restart: true })}
            disabled={mutation.isPending}
          >
            <RotateCcw className="size-4" />
            <span className="ml-2">Repartir du début</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="État" value={STATUS_LABEL[s?.status ?? "arrêté"] ?? (s?.status ?? "—")} />
        <Stat label="Dossier" value={FOLDERS[s?.folder ?? "inbox"] ?? "—"} />
        <Stat label="Emails analysés" value={(s?.messagesDone ?? 0).toLocaleString("fr-FR")} />
        <Stat label="Contacts détectés" value={(s?.pending ?? 0).toLocaleString("fr-FR")} />
        <Stat label="Sociétés immobilières" value={(s?.ready ?? 0).toLocaleString("fr-FR")} />
        <Stat label="Fiches créées" value={(s?.integrated ?? 0).toLocaleString("fr-FR")} />
      </div>

      {s?.lastError && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Dernier incident : {s.lastError}
        </p>
      )}

      <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto sm:min-h-9">
        <Link to="/contacts-detectes">Voir les contacts à valider</Link>
      </Button>
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
