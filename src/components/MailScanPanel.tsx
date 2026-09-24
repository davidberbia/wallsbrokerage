import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { CalendarRange, Mail, Pause, Play, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { getMailscanStatus, setMailscanRunning } from "@/lib/mailscan.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

  const [fromDate, setFromDate] = useState("2025-01-01");
  const [toDate, setToDate] = useState("2025-12-31");

  useEffect(() => {
    if (status.data?.scanFrom) setFromDate(status.data.scanFrom.slice(0, 10));
    if (status.data?.scanTo) setToDate(status.data.scanTo.slice(0, 10));
    // Initialisation unique à la première réponse.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status.data?.scanFrom, status.data?.scanTo]);

  const mutation = useMutation({
    mutationFn: (vars: {
      running: boolean;
      restart?: boolean;
      scanFrom?: string | null;
      scanTo?: string | null;
    }) => toggle({ data: vars }),
    onSuccess: (_d, vars) => {
      toast.success(
        vars.restart
          ? "Analyse relancée sur la période choisie"
          : vars.running
            ? "Analyse de la boîte mail lancée"
            : "Analyse mise en pause",
      );
      void qc.invalidateQueries({ queryKey: ["mailscan-status"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const launchPeriod = () => {
    if (!fromDate || !toDate) {
      toast.error("Choisissez une date de début et une date de fin");
      return;
    }
    if (fromDate > toDate) {
      toast.error("La date de début doit être avant la date de fin");
      return;
    }
    // Fin de journée incluse : borne haute = lendemain 00:00 UTC exclus.
    const end = new Date(`${toDate}T00:00:00Z`);
    end.setUTCDate(end.getUTCDate() + 1);
    mutation.mutate({
      running: true,
      restart: true,
      scanFrom: `${fromDate}T00:00:00Z`,
      scanTo: end.toISOString(),
    });
  };

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
        <Stat label="Contacts trouvés" value={(s?.pending ?? 0).toLocaleString("fr-FR")} />
        <Stat label="Sociétés immobilières" value={(s?.ready ?? 0).toLocaleString("fr-FR")} />
        <Stat label="Fiches créées" value={(s?.integrated ?? 0).toLocaleString("fr-FR")} />
      </div>

      <div className="rounded-md border border-border bg-muted/40 p-3 sm:p-4">
        <p className="eyebrow flex items-center gap-1.5">
          <CalendarRange className="size-3.5" /> Analyser une période précise
        </p>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1">
            <Label htmlFor="scan-from">Du</Label>
            <Input
              id="scan-from"
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="min-h-11 sm:min-h-9"
            />
          </div>
          <div className="flex-1 space-y-1">
            <Label htmlFor="scan-to">Au</Label>
            <Input
              id="scan-to"
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="min-h-11 sm:min-h-9"
            />
          </div>
          <Button
            className="min-h-11 sm:min-h-9"
            onClick={launchPeriod}
            disabled={mutation.isPending || running}
          >
            <Play className="size-4" />
            <span className="ml-2">Lancer sur cette période</span>
          </Button>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          L'analyse repart du début de la période choisie. Les contacts déjà connus ne sont jamais
          recréés.
        </p>
      </div>

      {s?.lastError && (
        <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
          Dernier incident : {s.lastError}
        </p>
      )}

      <Button asChild variant="outline" className="min-h-11 w-full sm:w-auto sm:min-h-9">
        <Link to="/contacts">Voir les contacts</Link>
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
