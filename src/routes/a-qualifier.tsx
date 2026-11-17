import { CompactRow, RecordDialog, RecordFacts } from "@/components/CompactRow";
import { Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
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
  ignoreMailscanCandidates,
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
  const ignore = useServerFn(ignoreMailscanCandidates);

  const [detailId, setDetailId] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    full_name: "",
    company_name: "",
    email: "",
    phone: "",
    job_title: "",
    address: "",
  });
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(100);
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
    qc.setQueryData(["mailscan-candidates"], (old: typeof data) =>
      (old ?? []).filter((r) => !gone.has(r.id)),
    );
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
    mutationFn: (v: { ids: string[]; kind: "contact" | "broker" | "notary" | "buyer" }) =>
      classify({ data: v }),
    onMutate: (v) => hide(v.ids),
    onSuccess: (r, v) => {
      toast.success(
        `${r.count} contact(s) classé(s) dans ${
          v.kind === "broker"
            ? "Brokers"
            : v.kind === "notary"
              ? "Notaires"
              : v.kind === "buyer"
                ? "Acheteurs"
                : "Contacts"
        }`,
      );
      done();
    },
    onError: restore,
  });

  // Suppression définitive : la fiche reste en base marquée « supprimé », donc elle ne sera jamais re-scrapée.
  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => ignore({ data: { ids } }),
    onMutate: (ids) => hide(ids),
    onSuccess: (r) => {
      toast.success(`${r.count} contact(s) supprimé(s) — ils ne seront plus réimportés.`);
      done();
    },
    onError: restore,
  });

  const detail = (data ?? []).find((r) => r.id === detailId);
  const edit = (row: NonNullable<typeof data>[number]) => {
    setDetailId(row.id);
    setEditing(true);
    setForm({
      full_name: row.full_name ?? "",
      company_name: row.company_name ?? "",
      email: row.email ?? "",
      phone: row.phone ?? "",
      job_title: row.job_title ?? "",
      address: row.address ?? "",
    });
  };
  const saveContact = async () => {
    if (!detailId) return;
    const { error } = await supabase.from("mailscan_candidates").update(form).eq("id", detailId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setEditing(false);
    setDetailId(null);
    void qc.invalidateQueries({ queryKey: ["mailscan-candidates"] });
    toast.success("Fiche enregistrée");
  };
  const allSelected = rows.length > 0 && selected.length === rows.length;

  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Boîte mail</p>
        <h1 className="mt-1 text-3xl">À qualifier</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Tous les contacts trouvés automatiquement (emails, newsletters, pièces jointes). Classez
          chaque fiche en un clic : Acheteur, Broker (confrère), Notaire ou Prospect.
        </p>
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
        <div className="flex flex-col gap-2 sm:ml-auto">
          <div className="grid grid-cols-3 gap-2">
            <Button
              variant="outline"
              className="min-h-11 px-2 text-[13px] sm:min-h-9 sm:px-4 sm:text-sm"
              disabled={selected.length === 0 || classifyMutation.isPending}
              onClick={() => classifyMutation.mutate({ ids: selected, kind: "buyer" })}
            >
              Acheteur ({selected.length})
            </Button>
            <Button
              variant="outline"
              className="min-h-11 px-2 text-[13px] sm:min-h-9 sm:px-4 sm:text-sm"
              disabled={selected.length === 0 || classifyMutation.isPending}
              onClick={() => classifyMutation.mutate({ ids: selected, kind: "broker" })}
            >
              Broker ({selected.length})
            </Button>
            <Button
              variant="outline"
              className="min-h-11 px-2 text-[13px] sm:min-h-9 sm:px-4 sm:text-sm"
              disabled={selected.length === 0 || classifyMutation.isPending}
              onClick={() => classifyMutation.mutate({ ids: selected, kind: "notary" })}
            >
              Notaire ({selected.length})
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="success"
              className="min-h-11 sm:min-h-9"
              disabled={selected.length === 0 || integrateMutation.isPending}
              onClick={() => integrateMutation.mutate(selected)}
            >
              {integrateMutation.isPending
                ? "Prospect…"
                : `Prospect (${selected.length})`}
            </Button>
            <Button
              variant="destructive"
              className="min-h-11 sm:min-h-9"
              disabled={selected.length === 0 || deleteMutation.isPending}
              onClick={() => {
                if (
                  confirm(
                    `Supprimer définitivement ${selected.length} contact(s) ? Ils ne seront plus jamais réimportés.`,
                  )
                )
                  deleteMutation.mutate(selected);
              }}
            >
              Supprimer ({selected.length})
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            On ne peut pas déplacer les contacts à qualifier directement dans Investisseurs sans
            passer par Prospect, car il faut remplir la fiche stratégique.
          </p>
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

      <div className="overflow-hidden border-y border-border">
        {rows.slice(0, visible).map((row) => (
          <CompactRow
            key={row.id}
            title={[row.company_name, row.full_name || row.email].filter(Boolean).join(" · ")}
            subtitle={row.email}
            leading={
              <Checkbox
                aria-label={`Sélectionner ${row.email}`}
                checked={selected.includes(row.id)}
                onCheckedChange={(v) =>
                  setSelected((prev) =>
                    v === true ? [...prev, row.id] : prev.filter((id) => id !== row.id),
                  )
                }
              />
            }
            onOpen={() => {
              setDetailId(row.id);
              setEditing(false);
            }}
            onEdit={() => edit(row)}
            onDelete={() => deleteMutation.mutate([row.id])}
          />
        ))}
      </div>
      <RecordDialog
        title={detail?.full_name || detail?.email || "Contact à qualifier"}
        open={!!detail}
        onClose={() => {
          setDetailId(null);
          setEditing(false);
        }}
      >
        {detail && (
          <>
            {editing ? (
              <form
                className="grid gap-3"
                onSubmit={(e) => {
                  e.preventDefault();
                  void saveContact();
                }}
              >
                {(
                  [
                    ["full_name", "Nom"],
                    ["company_name", "Société"],
                    ["email", "Email"],
                    ["phone", "Téléphone"],
                    ["job_title", "Fonction"],
                    ["address", "Adresse"],
                  ] as const
                ).map(([key, label]) => (
                  <label key={key} className="grid gap-1 text-sm">
                    {label}
                    <Input
                      type={key === "email" ? "email" : "text"}
                      value={form[key]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    />
                  </label>
                ))}
                <Button type="submit">Enregistrer</Button>
              </form>
            ) : (
              <>
                <Button onClick={() => edit(detail)}>
                  <Pencil className="size-4" /> Modifier
                </Button>
                <RecordFacts
                  facts={[
                    ["Nom", detail.full_name],
                    ["Société", detail.company_name],
                    [
                      "Email",
                      <span className="flex items-center gap-1 break-all">
                        {detail.email}
                        <CopyEmail email={detail.email} />
                      </span>,
                    ],
                    ["Téléphone", detail.phone],
                    ["Fonction", detail.job_title],
                    ["Adresse", detail.address],
                    ["Échanges", detail.occurrences],
                    ["Qualification", detail.verdict],
                    ["Motif", detail.reason],
                    ["Site", detail.site_url],
                  ]}
                />
                <div className="flex flex-wrap gap-2">
                  {(
                    [
                      [
                        "Divers",
                        () => classifyMutation.mutate({ ids: [detail.id], kind: "contact" }),
                      ],
                      [
                        "Brokers",
                        () => classifyMutation.mutate({ ids: [detail.id], kind: "broker" }),
                      ],
                      [
                        "Notaires",
                        () => classifyMutation.mutate({ ids: [detail.id], kind: "notary" }),
                      ],
                      ["Prospects", () => integrateMutation.mutate([detail.id])],
                    ] as const
                  ).map(([label, action]) => (
                    <Button
                      key={label}
                      variant="outline"
                      onClick={() => {
                        action();
                        setDetailId(null);
                      }}
                    >
                      Vers {label}
                    </Button>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </RecordDialog>
      {rows.length > visible && (
        <Button
          variant="outline"
          className="min-h-11 w-full"
          onClick={() => setVisible((v) => v + 100)}
        >
          Afficher plus ({rows.length - visible} restants)
        </Button>
      )}
    </div>
  );
}
