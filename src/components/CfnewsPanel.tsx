import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Play, Pause, RefreshCw, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import {
  getCfnewsStatus,
  retryCfnewsFailures,
  setCfnewsRunning,
} from "@/lib/cfnews.functions";
import { Button } from "@/components/ui/button";

const PHASES: Record<string, string> = {
  listing: "Recensement des sociétés",
  companies: "Collecte des collaborateurs",
  emails: "Récupération des emails et téléphones",
};

export function CfnewsPanel() {
  const fetchStatus = useServerFn(getCfnewsStatus);
  const toggle = useServerFn(setCfnewsRunning);
  const retryFailures = useServerFn(retryCfnewsFailures);
  const qc = useQueryClient();

  const status = useQuery({
    queryKey: ["cfnews-status"],
    queryFn: () => fetchStatus(),
    refetchInterval: 30_000,
  });

  const mutation = useMutation({
    mutationFn: (running: boolean) => toggle({ data: { running } }),
    onSuccess: (_d, running) => {
      toast.success(running ? "Import automatique lancé" : "Import mis en pause");
      void qc.invalidateQueries({ queryKey: ["cfnews-status"] });
      void qc.invalidateQueries({ queryKey: ["prospect-companies"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const retryMutation = useMutation({
    mutationFn: () => retryFailures(),
    onSuccess: (result) => {
      toast.success(
        result.count > 0
          ? `${result.count.toLocaleString("fr-FR")} URL(s) remise(s) en attente`
          : "Aucune URL ignorée à relancer",
      );
      void qc.invalidateQueries({ queryKey: ["cfnews-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const data = status.data;
  const running = data?.status === "running";
  const finished = data?.status === "terminé";

  return (
    <div className="panel space-y-3 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Import automatique CFNews Immo</h2>
          <p className="text-sm text-muted-foreground">
            Extraction lente (environ 2 fiches par minute) : sociétés, collaborateurs, titres, emails
            et téléphones. Vous pouvez la mettre en pause à tout moment.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => retryMutation.mutate()}
            disabled={retryMutation.isPending || running || !data?.skipped}
          >
            <RotateCcw className="mr-2 size-4" /> Relancer les pages ignorées
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => void status.refetch()}
            aria-label="Actualiser"
          >
            <RefreshCw className="size-4" />
          </Button>
          <Button
            onClick={() => mutation.mutate(!running)}
            disabled={mutation.isPending || status.isLoading}
          >
            {running ? (
              <>
                <Pause className="mr-2 size-4" /> Mettre en pause
              </>
            ) : (
              <>
                <Play className="mr-2 size-4" /> Lancer l'import
              </>
            )}
          </Button>
        </div>
      </div>

      {data && (
        <div className="grid gap-3 text-sm sm:grid-cols-5">
          <Stat
            label="État"
            value={
              data.retryOnly && running ? "Relance ciblée" : finished ? "Terminé" : running ? "En cours" : "En pause"
            }
          />
          <Stat label="Étape" value={PHASES[data.phase] ?? data.phase} />
          <Stat label="Sociétés" value={data.companies.toLocaleString("fr-FR")} />
          <Stat
            label="Collaborateurs (avec email)"
            value={`${data.contacts.toLocaleString("fr-FR")} (${data.emails.toLocaleString("fr-FR")})`}
          />
          <Stat label="URLs ignorées" value={data.skipped.toLocaleString("fr-FR")} />
        </div>
      )}

      {data?.lastError && (
        <p className="text-sm text-destructive">Dernier incident : {data.lastError}</p>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-border/60 px-3 py-2">
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium">{value}</p>
    </div>
  );
}
