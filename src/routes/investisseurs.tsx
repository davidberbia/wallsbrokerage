import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Phone, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { CopyEmail } from "@/components/CopyEmail";
import { InvestorForm, investorPayload, type InvestorDraft } from "@/components/InvestorForm";
import type { BandsByAsset } from "@/components/AssetClassBands";
import { StrategyMatrixDialog, type StrategiesByAsset } from "@/components/StrategyMatrixDialog";
import { useAuth } from "@/hooks/useAuth";


import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { formatEUR } from "@/lib/taxonomy";
import type { Investor, InvestorCriteria } from "@/lib/types";

export const Route = createFileRoute("/investisseurs")({
  head: () => ({
    meta: [
      { title: "Base investisseurs — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Gérez les profils investisseurs : tranche d'investissement, classes d'actifs, stratégies et régions.",
      },
      { property: "og:title", content: "Base investisseurs — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Tous les profils acquéreurs et leurs critères d'investissement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <InvestorsPage />
    </AppLayout>
  ),
});

const emptyDraft: InvestorDraft = {
  full_name: "",
  asset_classes: [],
  strategies: [],
  regions: [],
  status: "actif",
};

function formatInvestorAddress(investor: Investor) {
  const postalCity = [investor.postal_code, investor.city].filter(Boolean).join(" ");
  let address = (investor.address ?? "").replace(/,?\s*France,?\s*$/i, "").trim();

  if (postalCity) {
    const escapedPostalCity = postalCity.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    address = address.replace(new RegExp(`,?\\s*${escapedPostalCity}$`, "i"), "").trim();
  }

  return [address, postalCity].filter(Boolean).join(", ") || "—";
}

function displayName(investor: Investor) {
  const first = (investor.first_name ?? "").trim();
  const full = (investor.full_name ?? "").trim();
  if (!first && !full) return "—";
  if (!first) return full;
  if (!full) return first;
  if (full.toLowerCase().startsWith(first.toLowerCase())) return full;
  return `${first} ${full}`;
}

const STATUS_PILL: Record<string, string> = {
  actif: "status-pill status-actif",
  "à qualifier": "status-pill status-a-qualifier",
  "en veille": "status-pill status-en-veille",
  inactif: "status-pill status-inactif",
  "black listé": "status-pill status-blackliste",
};

const statusPill = (status: string) => STATUS_PILL[status] ?? "status-pill status-en-veille";

function InvestorsPage() {
  const qc = useQueryClient();
  const { canEdit } = useAuth();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InvestorDraft | null>(null);
  const [bands, setBands] = useState<BandsByAsset>({});
  const [assetStrategies, setAssetStrategies] = useState<StrategiesByAsset>({});
  const [strategyOpen, setStrategyOpen] = useState(false);


  const openEdit = async (investor?: Investor) => {
    if (!investor) {
      setBands({});
      setAssetStrategies({});
      setEditing({ ...emptyDraft });
      return;
    }
    setEditing(investor);
    const { data } = await supabase
      .from("investor_criteria")
      .select("asset_class, amount_bands, strategies")
      .eq("investor_id", investor.id);
    const map: BandsByAsset = {};
    const stratMap: StrategiesByAsset = {};
    for (const row of data ?? []) {
      map[row.asset_class] = row.amount_bands ?? [];
      stratMap[row.asset_class] = row.strategies ?? [];
    }
    setBands(map);
    setAssetStrategies(stratMap);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investors").select("*").order("full_name");
      if (error) throw error;
      return data as unknown as Investor[];
    },
  });

  const { data: allCriteria } = useQuery({
    queryKey: ["investor-criteria", "investor-list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_criteria")
        .select("id, investor_id, bubble_id, asset_class, investor_profile, strategies, amount_bands, regions, city_scope, periphery_scope, city_targets");
      if (error) throw error;
      return data as InvestorCriteria[];
    },
  });

  const save = useMutation({
    mutationFn: async (draft: InvestorDraft) => {
      const payload = investorPayload(draft);
      let investorId = draft.id;
      if (investorId) {
        const { error } = await supabase.from("investors").update(payload).eq("id", investorId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase
          .from("investors")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        investorId = data.id;
      }
      const assets = draft.asset_classes ?? [];
      const { error: delError } = await supabase
        .from("investor_criteria")
        .delete()
        .eq("investor_id", investorId);
      if (delError) throw delError;
      if (assets.length > 0) {
        if (!investorId) throw new Error("Profil investisseur introuvable");
        const rows = assets.map((asset) => ({
          investor_id: investorId,
          asset_class: asset,
          investor_profile: draft.investor_profile ?? null,
          strategies: assetStrategies[asset] ?? [],
          amount_bands: bands[asset] ?? [],
          regions: draft.regions ?? [],
        }));
        const { error: insError } = await supabase.from("investor_criteria").insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["investors"] });
      qc.invalidateQueries({ queryKey: ["investor-criteria"] });
      setEditing(null);
      toast.success("Profil enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("investors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["investors"] });
      toast.success("Investisseur supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const list = q
      ? (data ?? []).filter((i) =>
          [i.full_name, i.company, i.email, i.city].some((v) => v?.toLowerCase().includes(q)),
        )
      : (data ?? []);
    // Tri alphabétique sur le libellé affiché (société, sinon nom du contact).
    return [...list].sort((a, b) =>
      (a.company || displayName(a)).localeCompare(b.company || displayName(b), "fr", {
        sensitivity: "base",
      }),
    );
  }, [data, search]);

  const bandOf = (investor: Investor) => {
    const detailedBands = [
      ...new Set(
        (allCriteria ?? [])
          .filter((criterion) => criterion.investor_id === investor.id)
          .flatMap((criterion) => criterion.amount_bands ?? []),
      ),
    ];
    if (detailedBands.length > 0) return detailedBands.join(" · ");
    if (investor.budget_min == null && investor.budget_max == null) return "—";
    return `${formatEUR(investor.budget_min)} – ${formatEUR(investor.budget_max)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end">
        <div>
          <p className="eyebrow">Base acquéreurs</p>
          <h1 className="mt-1 text-3xl">Investisseurs</h1>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:ml-auto sm:flex sm:w-auto">
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full sm:w-56"
          />
          {canEdit && (
            <Dialog
              open={editing !== null}
              onOpenChange={(o) => setEditing(o ? (editing ?? { ...emptyDraft }) : null)}
            >
              <DialogTrigger asChild>
                <Button className="min-h-11 w-full sm:w-auto" onClick={() => openEdit()}>
                  <Plus className="size-4" /> Nouvel investisseur
                </Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[96dvh] max-w-xl flex-col overflow-hidden sm:max-h-[90vh] sm:w-[calc(100%-2rem)]">
                <DialogHeader>
                  <DialogTitle>
                    {editing?.id ? "Modifier le profil" : "Nouveau profil investisseur"}
                  </DialogTitle>
                </DialogHeader>
                {editing && (
                  <InvestorForm
                    draft={editing}
                    onChange={setEditing}
                    onSubmit={() => save.mutate(editing)}
                    saving={save.isPending}
                    submitLabel={editing.id ? "Valider les modifications" : "Créer l’investisseur"}
                    onStrategyClick={() => setStrategyOpen(true)}
                  />
                )}
              </DialogContent>
            </Dialog>
          )}
          {editing && (
            <StrategyMatrixDialog
              open={strategyOpen}
              onOpenChange={setStrategyOpen}
              value={{
                assetClasses: editing.asset_classes ?? [],
                bands,
                strategiesByAsset: assetStrategies,
                regions: editing.regions ?? [],
              }}
              onChange={(next) => {
                setBands(next.bands);
                setAssetStrategies(next.strategiesByAsset);
                setEditing({
                  ...editing,
                  asset_classes: next.assetClasses,
                  strategies: [...new Set(Object.values(next.strategiesByAsset).flat())],
                  regions: next.regions,
                });
              }}
            />
          )}
        </div>

      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Aucun investisseur pour l'instant.
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((investor) => (
          <div key={investor.id} className="panel p-4">
            {/* ── Desktop : mise en page comme l'image (3 colonnes) ── */}
            <div className="hidden items-start gap-6 md:flex">
              {/* Colonne 1 : société / type / contact / adresse */}
              <div className="min-w-0 flex-1 space-y-0.5">
                <p className="truncate font-semibold">
                  {investor.company || displayName(investor)}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {investor.investor_profile || "—"}
                </p>
                <p className="truncate pt-3 text-sm text-muted-foreground">
                  {displayName(investor)}
                </p>
                <p className="truncate text-sm text-muted-foreground">
                  {formatInvestorAddress(investor)}
                </p>
              </div>

              {/* Colonne 2 : tranche / email / téléphone */}
              <div className="shrink-0 space-y-0.5">
                <p className="eyebrow">Tranche d'investissement</p>
                <p className="text-sm font-medium">{bandOf(investor)}</p>
                <p className="flex items-center gap-1 pt-3 text-sm text-muted-foreground">
                  <span className="truncate">{investor.email || "—"}</span>
                  <CopyEmail email={investor.email} />
                </p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span>{investor.phone || "—"}</span>
                  {investor.phone && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-foreground"
                      asChild
                      aria-label="Appeler"
                      title="Appeler"
                    >
                      <a href={`tel:${investor.phone}`}>
                        <Phone className="size-3.5" />
                      </a>
                    </Button>
                  )}
                </p>
              </div>

              {/* Colonne 3 : statut + actions */}
              <div className="flex shrink-0 items-center gap-2">
                <span className={statusPill(investor.status)}>
                  {investor.status}
                </span>
                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Modifier"
                      onClick={() => openEdit(investor)}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remove.mutate(investor.id)}
                      aria-label="Supprimer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </>
                )}
              </div>
            </div>

            {/* ── Tablette / mobile : 2 colonnes ── */}
            <div className="grid items-start gap-4 md:hidden sm:grid-cols-[minmax(0,1fr)_auto]">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-semibold">
                  {investor.company || displayName(investor)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {investor.investor_profile || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {displayName(investor)}
                </p>
                <p className="text-sm text-muted-foreground">
                  {formatInvestorAddress(investor)}
                </p>
              </div>
              <div className="min-w-0 space-y-1 text-sm">
                <p className="eyebrow">Tranche d'investissement</p>
                <p>{bandOf(investor)}</p>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <span className="truncate">{investor.email || "—"}</span>
                  <CopyEmail email={investor.email} />
                </p>
                <p className="flex items-center gap-1 text-muted-foreground">
                  <span className="truncate">{investor.phone || "—"}</span>
                  {investor.phone && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="size-6 text-muted-foreground hover:text-foreground"
                      asChild
                      aria-label="Appeler"
                      title="Appeler"
                    >
                      <a href={`tel:${investor.phone}`}>
                        <Phone className="size-3.5" />
                      </a>
                    </Button>
                  )}
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className={statusPill(investor.status)}>

                    {investor.status}
                  </span>
                  {canEdit && (
                    <>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label="Modifier"
                        onClick={() => openEdit(investor)}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => remove.mutate(investor.id)}
                        aria-label="Supprimer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
