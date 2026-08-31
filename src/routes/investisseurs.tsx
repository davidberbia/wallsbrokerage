import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { MultiSelect } from "@/components/MultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ASSET_CLASSES,
  FINANCINGS,
  HORIZONS,
  INVESTOR_STATUS,
  REGIONS,
  STRATEGIES,
  formatEUR,
} from "@/lib/taxonomy";
import type { Investor } from "@/lib/types";

export const Route = createFileRoute("/investisseurs")({
  head: () => ({
    meta: [
      { title: "Base investisseurs — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Gérez les profils investisseurs : budget, classes d'actifs, stratégies, régions et rendement attendu.",
      },
      { property: "og:title", content: "Base investisseurs — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Tous les profils acquéreurs et leurs critères d'investissement.",
      },
    ],
  }),
  component: () => (
    <AppLayout>
      <InvestorsPage />
    </AppLayout>
  ),
});

type Draft = Partial<Investor> & { full_name: string };

const emptyDraft: Draft = {
  full_name: "",
  asset_classes: [],
  strategies: [],
  regions: [],
  status: "actif",
};

function InvestorsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Draft | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investors").select("*").order("full_name");
      if (error) throw error;
      return data as unknown as Investor[];
    },
  });

  const save = useMutation({
    mutationFn: async (draft: Draft) => {
      const payload = {
        full_name: draft.full_name,
        company: draft.company ?? null,
        email: draft.email ?? null,
        phone: draft.phone ?? null,
        city: draft.city ?? null,
        budget_min: draft.budget_min ?? null,
        budget_max: draft.budget_max ?? null,
        asset_classes: draft.asset_classes ?? [],
        strategies: draft.strategies ?? [],
        regions: draft.regions ?? [],
        min_yield: draft.min_yield ?? null,
        holding_horizon: draft.holding_horizon ?? null,
        financing: draft.financing ?? null,
        status: draft.status ?? "actif",
        notes: draft.notes ?? null,
      };
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
  });

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data ?? [];
    return (data ?? []).filter((i) =>
      [i.full_name, i.company, i.email, i.city].some((v) => v?.toLowerCase().includes(q)),
    );
  }, [data, search]);

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
                />
              )}
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && filtered.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Aucun investisseur pour l'instant. Créez le premier profil.
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((investor) => (
          <div key={investor.id} className="panel p-4">
            <div className="flex flex-wrap items-start gap-4">
              <div className="min-w-56 flex-1">
                <p className="font-medium">{investor.full_name}</p>
                <p className="text-sm text-muted-foreground">
                  {[investor.company, investor.city].filter(Boolean).join(" · ") || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {[investor.email, investor.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="text-sm">
                <p className="eyebrow">Budget</p>
                <p>
                  {formatEUR(investor.budget_min)} – {formatEUR(investor.budget_max)}
                </p>
                {investor.min_yield != null && (
                  <p className="text-muted-foreground">Rdt ≥ {investor.min_yield}%</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary">{investor.status}</Badge>
                <Button variant="ghost" size="icon" onClick={() => setEditing(investor)}>
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

function InvestorForm({
  draft,
  onChange,
  onSubmit,
  saving,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  onSubmit: () => void;
  saving: boolean;
}) {
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Nom complet *">
          <Input
            required
            value={draft.full_name}
            onChange={(e) => set({ full_name: e.target.value })}
          />
        </Field>
        <Field label="Société">
          <Input value={draft.company ?? ""} onChange={(e) => set({ company: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={draft.email ?? ""}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="Téléphone">
          <Input value={draft.phone ?? ""} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="Ville">
          <Input value={draft.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
        </Field>
        <Field label="Statut">
          <Select value={draft.status ?? "actif"} onValueChange={(v) => set({ status: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {INVESTOR_STATUS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Budget minimum (€)">
          <Input
            type="number"
            value={draft.budget_min ?? ""}
            onChange={(e) => set({ budget_min: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <Field label="Budget maximum (€)">
          <Input
            type="number"
            value={draft.budget_max ?? ""}
            onChange={(e) => set({ budget_max: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <Field label="Rendement minimum (%)">
          <Input
            type="number"
            step="0.1"
            value={draft.min_yield ?? ""}
            onChange={(e) => set({ min_yield: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <Field label="Horizon de détention">
          <Select
            value={draft.holding_horizon ?? ""}
            onValueChange={(v) => set({ holding_horizon: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {HORIZONS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <Field label="Financement">
          <Select value={draft.financing ?? ""} onValueChange={(v) => set({ financing: v })}>
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {FINANCINGS.map((f) => (
                <SelectItem key={f} value={f}>
                  {f}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Classes d'actifs recherchées">
        <MultiSelect
          options={ASSET_CLASSES}
          value={draft.asset_classes ?? []}
          onChange={(v) => set({ asset_classes: v })}
        />
      </Field>
      <Field label="Stratégies">
        <MultiSelect
          options={STRATEGIES}
          value={draft.strategies ?? []}
          onChange={(v) => set({ strategies: v })}
        />
      </Field>
      <Field label="Régions ciblées">
        <MultiSelect
          options={REGIONS}
          value={draft.regions ?? []}
          onChange={(v) => set({ regions: v })}
        />
      </Field>
      <Field label="Notes">
        <Textarea
          rows={3}
          value={draft.notes ?? ""}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </Field>

      <DialogFooter>
        <Button type="submit" disabled={saving}>
          Enregistrer
        </Button>
      </DialogFooter>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}
