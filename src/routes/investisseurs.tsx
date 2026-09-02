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
import { matchAmountBand, useLists } from "@/lib/lists";
import type { Investor } from "@/lib/types";

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

function InvestorsPage() {
  const qc = useQueryClient();
  const { canEdit } = useAuth();
  const { amountBands } = useLists();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InvestorDraft | null>(null);
  const [bands, setBands] = useState<BandsByAsset>({});

  const openEdit = async (investor?: Investor) => {
    if (!investor) {
      setBands({});
      setEditing({ ...emptyDraft });
      return;
    }
    setEditing(investor);
    const { data } = await supabase
      .from("investor_criteria")
      .select("asset_class, amount_bands")
      .eq("investor_id", investor.id);
    const map: BandsByAsset = {};
    for (const row of data ?? []) map[row.asset_class] = row.amount_bands ?? [];
    setBands(map);
  };

  const { data, isLoading } = useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investors").select("*").order("full_name");
      if (error) throw error;
      return data as unknown as Investor[];
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
          strategies: draft.strategies ?? [],
          amount_bands: bands[asset] ?? [],
          regions: draft.regions ?? [],
        }));
        const { error: insError } = await supabase.from("investor_criteria").insert(rows);
        if (insError) throw insError;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["investors"] });
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
    if (!q) return data ?? [];
    return (data ?? []).filter((i) =>
      [i.full_name, i.company, i.email, i.city].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, search]);

  const bandOf = (investor: Investor) => {
    const band = matchAmountBand(amountBands, investor.budget_min, investor.budget_max);
    if (band) return band;
    if (investor.budget_min == null && investor.budget_max == null) return "—";
    return `${formatEUR(investor.budget_min)} – ${formatEUR(investor.budget_max)}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <p className="eyebrow">Base acquéreurs</p>
          <h1 className="mt-1 text-3xl">Investisseurs</h1>
        </div>
        <div className="ml-auto flex gap-3">
          <Input
            placeholder="Rechercher…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-56"
          />
          {canEdit && (
            <Dialog
              open={editing !== null}
              onOpenChange={(o) => setEditing(o ? (editing ?? { ...emptyDraft }) : null)}
            >
              <DialogTrigger asChild>
                <Button onClick={() => openEdit()}>
                  <Plus className="size-4" /> Nouvel investisseur
                </Button>
              </DialogTrigger>
              <DialogContent className="flex max-h-[90vh] w-[calc(100%-2rem)] max-w-xl flex-col overflow-hidden">
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
                    bands={bands}
                    onBandsChange={setBands}
                  />
                )}
              </DialogContent>
            </Dialog>
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
            {/* ── Desktop : mise en page demandée (4 colonnes) ── */}
            <div className="hidden items-start gap-x-4 gap-y-1 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,auto)_minmax(0,auto)_auto]">
              {/* Ligne 1 : société + actions */}
              <p className="min-w-0 truncate font-semibold">
                {investor.company || investor.full_name}
              </p>
              <div />
              <div />
              <div className="flex items-start justify-end gap-2">
                <span
                  className={
                    investor.status === "black listé"
                      ? "inline-flex items-center rounded-md border border-transparent bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground"
                      : "inline-flex items-center rounded-md border border-transparent bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
                  }
                >
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

              {/* Ligne 2 : type d'investisseur */}
              <p className="min-w-0 text-sm text-muted-foreground">
                {investor.investor_profile || "—"}
              </p>
              <div />
              <div />
              <div />

              {/* Ligne 3 : prénom/nom | tranche (label) | email */}
              <p className="min-w-0 truncate text-sm text-muted-foreground">
                {displayName(investor)}
              </p>
              <p className="min-w-0 text-xs uppercase tracking-wide text-muted-foreground">
                Tranche d'investissement
              </p>
              <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
                <span className="truncate">{investor.email || "—"}</span>
                <CopyEmail email={investor.email} />
              </p>
              <div />

              {/* Ligne 4 : adresse | tranche (valeur) | téléphone */}
              <p className="min-w-0 text-sm text-muted-foreground">
                {formatInvestorAddress(investor)}
              </p>
              <p className="min-w-0 text-sm font-medium">{bandOf(investor)}</p>
              <p className="flex min-w-0 items-center gap-1 text-sm text-muted-foreground">
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
              <div />
            </div>

            {/* ── Tablette / mobile : 2 colonnes ── */}
            <div className="grid items-start gap-4 md:hidden sm:grid-cols-[1fr_auto]">
              <div className="min-w-0 space-y-1">
                <p className="truncate font-semibold">
                  {investor.company || investor.full_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {investor.investor_profile || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[investor.first_name, investor.full_name].filter(Boolean).join(" ") || "—"}
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
                  <span
                    className={
                      investor.status === "black listé"
                        ? "inline-flex items-center rounded-md border border-transparent bg-destructive px-2.5 py-1 text-xs font-semibold text-destructive-foreground"
                        : "inline-flex items-center rounded-md border border-transparent bg-secondary px-2.5 py-1 text-xs font-semibold text-secondary-foreground"
                    }
                  >
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
