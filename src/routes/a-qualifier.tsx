import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { CopyEmail } from "@/components/CopyEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  classifyMailscanCandidates,
  integrateMailscanCandidates,
  listMailscanCandidates,
} from "@/lib/mailscan.functions";

export const Route = createFileRoute("/a-qualifier")({
  head: () => ({
    meta: [
      { title: "À qualifier — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Contacts professionnels repérés dans la boîte mail, à valider avant intégration aux bases prospects et investisseurs.",
      },
      { property: "og:title", content: "À qualifier — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Validez les contacts trouvés dans vos emails avant de les ajouter à vos bases.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker requireAdmin>
      <DetectedContactsPage />
    </AppLayout>
  ),
});

const VERDICT_PILL: Record<string, string> = {
  immobilier: "status-pill status-actif",
  "hors cible": "status-pill status-inactif",
  inconnu: "status-pill status-en-veille",
  "en attente": "status-pill status-a-qualifier",
};

function DetectedContactsPage() {
  const qc = useQueryClient();
  const fetchCandidates = useServerFn(listMailscanCandidates);
  const integrate = useServerFn(integrateMailscanCandidates);
  const classify = useServerFn(classifyMailscanCandidates);

  const [search, setSearch] = useState("");
  const [onlyImmo, setOnlyImmo] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["mailscan-candidates"],
    queryFn: () => fetchCandidates(),
  });

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    return (data ?? []).filter((row) => {
      if (onlyImmo && row.verdict !== "immobilier") return false;
      if (!q) return true;
      return [row.email, row.full_name, row.company_name, row.job_title].some((v) =>
        v?.toLowerCase().includes(q),
      );
    });
  }, [data, search, onlyImmo]);

  const done = () => {
    // Recharge la liste seulement quand plus aucun classement n'est en cours (évite les fiches qui réapparaissent).
    if (qc.isMutating() <= 1) void qc.invalidateQueries({ queryKey: ["mailscan-candidates"] });
    void qc.invalidateQueries({ queryKey: ["mailscan-status"] });
    void qc.invalidateQueries({ queryKey: ["investors"] });
    void qc.invalidateQueries({ queryKey: ["prospect-companies"] });
    void qc.invalidateQueries({ queryKey: ["directory"] });
    void qc.invalidateQueries({ queryKey: ["nav-counts"] });
  };

  // Retire tout de suite les fiches classées de l'écran (sans attendre le rechargement de la liste).
  const hide = (ids: string[]) => {
    const gone = new Set(ids);
    qc.setQueryData(["mailscan-candidates"], (old: typeof data) => (old ?? []).filter((r) => !gone.has(r.id)));
    setSelected((prev) => prev.filter((id) => !gone.has(id)));
  };
  const restore = (e: Error) => {
    toast.error(e.message || "Le classement a échoué, réessayez.");
    void qc.invalidateQueries({ queryKey: ["mailscan-candidates"] });
  };

  const integrateMutation = useMutation({
    mutationFn: (ids: string[]) => integrate({ data: { ids, toProspects: true } }),
    onMutate: (ids) => hide(ids),
    onSuccess: (r) => {
      toast.success(
        `${r.investorsCreated} investisseur(s) et ${r.prospectsCreated} prospect(s) créés${
          r.ignored > 0 ? `, ${r.ignored} doublon(s) ignoré(s)` : ""
        }.`,
      );
      done();
    },
    onError: restore,
  });

  const classifyMutation = useMutation({
    mutationFn: (v: { ids: string[]; kind: "contact" | "broker" }) => classify({ data: v }),
    onMutate: (v) => hide(v.ids),
    onSuccess: (r, v) => {
      toast.success(`${r.count} contact(s) classé(s) dans ${v.kind === "broker" ? "Brokers" : "Contacts"}`);
      done();
    },
    onError: restore,
  });

  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Boîte mail</p>
        <h1 className="mt-1 text-3xl">À qualifier</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tous les contacts trouvés automatiquement (emails, newsletters, pièces jointes). Classez chaque fiche en un clic : Contacts, Brokers (confrères) ou Prospects.</p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Rechercher un nom, une société, un email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full sm:w-72"
        />
        <label className="flex items-center gap-2 text-sm">
          <Checkbox checked={onlyImmo} onCheckedChange={(v) => setOnlyImmo(v === true)} />
          Sociétés immobilières uniquement
        </label>
        <div className="flex flex-wrap gap-2 sm:ml-auto">
          <Button
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={selected.length === 0 || classifyMutation.isPending}
            onClick={() => classifyMutation.mutate({ ids: selected, kind: "contact" })}
          >
            Contacts ({selected.length})
          </Button>
          <Button
            variant="outline"
            className="min-h-11 sm:min-h-9"
            disabled={selected.length === 0 || classifyMutation.isPending}
            onClick={() => classifyMutation.mutate({ ids: selected, kind: "broker" })}
          >
            Brokers ({selected.length})
          </Button>
          <Button
            className="min-h-11 sm:min-h-9"
            disabled={selected.length === 0 || integrateMutation.isPending}
            onClick={() => integrateMutation.mutate(selected)}
          >
            {integrateMutation.isPending ? "Déplacement…" : `Déplacer vers Prospects (${selected.length})`}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && rows.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Aucun contact à valider pour l'instant. Lancez l'analyse depuis les Paramètres.
        </div>
      )}

      {rows.length > 0 && (
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <Checkbox
            checked={allSelected}
            onCheckedChange={(v) => setSelected(v === true ? rows.map((r) => r.id) : [])}
          />
          Tout sélectionner ({rows.length})
        </label>
      )}

      <div className="grid gap-3">
        {rows.map((row) => (
          <div key={row.id} className="panel flex flex-col gap-3 p-4 md:flex-row md:items-start">
            <Checkbox
              className="mt-1"
              checked={selected.includes(row.id)}
              onCheckedChange={(v) =>
                setSelected((prev) =>
                  v === true ? [...prev, row.id] : prev.filter((id) => id !== row.id),
                )
              }
            />
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate font-semibold">{row.company_name || row.domain}</p>
              <p className="truncate text-sm text-muted-foreground">{row.job_title || "—"}</p>
              <p className="truncate pt-3 text-sm text-muted-foreground">{row.full_name || "—"}</p>
              <p className="truncate text-sm text-muted-foreground">{row.address || "—"}</p>
            </div>
            <div className="min-w-0 shrink-0 space-y-0.5 md:w-64">
              <p className="eyebrow">Contact</p>
              <p className="flex items-center gap-1 text-sm text-muted-foreground">
                <span className="truncate">{row.email}</span>
                <CopyEmail email={row.email} />
              </p>
              <p className="text-sm text-muted-foreground">{row.phone || "—"}</p>
              <p className="pt-1 text-xs text-muted-foreground">
                {row.occurrences} échange(s) dans votre boîte
              </p>
            </div>
            <div className="shrink-0 space-y-1 md:w-60">
              <div className="flex flex-wrap gap-1.5 pb-2">
                {(
                  [
                    ["Contacts", () => classifyMutation.mutate({ ids: [row.id], kind: "contact" })],
                    ["Brokers", () => classifyMutation.mutate({ ids: [row.id], kind: "broker" })],
                    ["Prospects", () => integrateMutation.mutate([row.id])],
                  ] as const
                ).map(([label, fn]) => (
                  <Button
                    key={label}
                    size="sm"
                    variant={label === "Prospects" ? "default" : "outline"}
                    className="min-h-10 sm:min-h-8"
                    onClick={fn}
                  >
                    {label}
                  </Button>
                ))}
              </div>
              <span className={VERDICT_PILL[row.verdict] ?? "status-pill status-en-veille"}>
                {row.verdict}
              </span>
              {row.reason && (
                <p className="text-xs text-muted-foreground">
                  {row.reason}
                  {row.site_url ? (
                    <>
                      {" — "}
                      <a
                        href={row.site_url}
                        target="_blank"
                        rel="noreferrer"
                        className="underline underline-offset-2"
                      >
                        site
                      </a>
                    </>
                  ) : null}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
