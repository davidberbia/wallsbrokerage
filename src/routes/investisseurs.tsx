import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { CopyEmail } from "@/components/CopyEmail";
import { InvestorForm, investorPayload, type InvestorDraft } from "@/components/InvestorForm";
import { useAuth } from "@/hooks/useAuth";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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

function InvestorsPage() {
  const qc = useQueryClient();
  const { canEdit } = useAuth();
  const { amountBands } = useLists();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<InvestorDraft | null>(null);

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
      const { error } = draft.id
        ? await supabase.from("investors").update(payload).eq("id", draft.id)
        : await supabase.from("investors").insert(payload);
      if (error) throw error;
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
                <Button onClick={() => setEditing({ ...emptyDraft })}>
                  <Plus className="size-4" /> Nouvel investisseur
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
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
                    submitLabel="Valider"
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
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-56 flex-1">
                <p className="font-medium">{investor.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {[investor.company, investor.investor_profile].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[investor.address, investor.postal_code, investor.city]
                    .filter(Boolean)
                    .join(", ") || "—"}
                </p>
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  {[investor.email, investor.phone].filter(Boolean).join(" · ") || "—"}
                  <CopyEmail email={investor.email} />
                </p>
              </div>
              <div className="text-sm">
                <p className="eyebrow">Tranche d'investissement</p>
                <p>{bandOf(investor)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{investor.status}</Badge>
                {canEdit && (
                  <>
                    <Button
                      variant="ghost"
                      size="icon"
                      aria-label="Modifier"
                      onClick={() => setEditing(investor)}
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
            <div className="mt-3 flex flex-wrap gap-1">
              {[...investor.asset_classes, ...investor.strategies, ...investor.regions].map((t) => (
                <Badge key={t} variant="outline">
                  {t}
                </Badge>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
