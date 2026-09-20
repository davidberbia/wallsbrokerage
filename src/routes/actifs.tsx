import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, Pencil, Plus, Target, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatThousands, parseThousands } from "@/lib/format";
import { AppLayout } from "@/components/AppLayout";
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
import { ASSET_CLASSES, ASSET_STATUS, REGIONS, STRATEGIES, formatEUR } from "@/lib/taxonomy";
import type { Asset } from "@/lib/types";

export const Route = createFileRoute("/actifs")({
  head: () => ({
    meta: [
      { title: "Actifs à placer — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Enregistrez vos actifs à la vente : classe, stratégie, région, prix, rendement et brochure.",
      },
      { property: "og:title", content: "Actifs à placer — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Le portefeuille d'actifs à commercialiser et leurs brochures.",
      },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <AssetsPage />
    </AppLayout>
  ),
});

type Draft = Partial<Asset> & { title: string };
const emptyDraft: Draft = { title: "", status: "disponible" };

function AssetsPage() {
  const qc = useQueryClient();
  const [editing, setEditing] = useState<Draft | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedDocs, setRemovedDocs] = useState<string[]>([]);

  const { data, isLoading } = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Asset[];
    },
  });

  const openBrochure = async (value: string) => {
    try {
      await openDocument(value);
    } catch {
      toast.error("Document introuvable");
    }
  };

  const save = useMutation({
    mutationFn: async (draft: Draft) => {
      const payload = {
        title: draft.title,
        reference: draft.reference ?? null,
        asset_class: draft.asset_class ?? null,
        strategy: draft.strategy ?? null,
        region: draft.region ?? null,
        city: draft.city ?? null,
        price: draft.price ?? null,
        yield_pct: draft.yield_pct ?? null,
        surface: draft.surface ?? null,
        description: draft.description ?? null,
        status: draft.status ?? "disponible",
      };
      let assetId = draft.id ?? null;
      if (assetId) {
        const { error } = await supabase.from("assets").update(payload).eq("id", assetId);
        if (error) throw error;
      } else {
        const { data: created, error } = await supabase
          .from("assets")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        assetId = created.id;
      }

      if (removedDocs.length > 0) {
        const { error } = await supabase.from("asset_documents").delete().in("id", removedDocs);
        if (error) throw error;
      }

      if (newFiles.length > 0) {
        const existing = await fetchAssetDocuments(assetId!);
        let order = existing.length;
        const rows = [] as { asset_id: string; path: string; name: string; sort_order: number }[];
        for (const file of newFiles) {
          const uploaded = await uploadDocument(`actifs/${assetId}`, file);
          rows.push({ asset_id: assetId!, ...uploaded, sort_order: order++ });
        }
        const { error } = await supabase.from("asset_documents").insert(rows);
        if (error) throw error;
      }

      // Compatibilité : le premier document reste la brochure principale de l'actif.
      const documents = await fetchAssetDocuments(assetId!);
      await supabase
        .from("assets")
        .update({ brochure_url: documents[0]?.path ?? null })
        .eq("id", assetId!);
      return assetId!;
    },
    onSuccess: (assetId) => {
      qc.invalidateQueries({ queryKey: ["assets"] });
      qc.invalidateQueries({ queryKey: ["asset-documents", assetId] });
      setEditing(null);
      setNewFiles([]);
      setRemovedDocs([]);
      toast.success("Actif enregistré");
    },
    onError: (e: Error) => toast.error(e.message),
  });


  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assets").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["assets"] }),
  });

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <p className="eyebrow">Portefeuille</p>
          <h1 className="mt-1 text-3xl">Actifs à placer</h1>
        </div>
        <Dialog
          open={editing !== null}
          onOpenChange={(o) => setEditing(o ? (editing ?? { ...emptyDraft }) : null)}
        >
          <DialogTrigger asChild>
            <Button className="min-h-11 shrink-0" onClick={() => setEditing({ ...emptyDraft })}>
              <Plus className="size-4" /> Nouvel actif
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Modifier l'actif" : "Nouvel actif"}</DialogTitle>
            </DialogHeader>
            {editing && (
              <AssetForm
                draft={editing}
                onChange={setEditing}
                newFiles={newFiles}
                onNewFiles={setNewFiles}
                removedDocs={removedDocs}
                onRemovedDocs={setRemovedDocs}
                onSubmit={() => save.mutate(editing)}
                saving={save.isPending}
              />
            )}

          </DialogContent>
        </Dialog>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && (data ?? []).length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Aucun actif enregistré. Ajoutez votre premier mandat.
        </div>
      )}

      <div className="grid gap-3">
        {(data ?? []).map((asset) => (
          <div key={asset.id} className="panel grid gap-4 p-4 sm:flex sm:flex-wrap sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{asset.title}</p>
              <p className="text-sm text-muted-foreground">
                {[asset.reference, asset.city, asset.region].filter(Boolean).join(" · ") || "—"}
              </p>
              <div className="mt-2 flex flex-wrap gap-1">
                {[asset.asset_class, asset.strategy].filter(Boolean).map((t) => (
                  <Badge key={t as string} variant="outline">
                    {t}
                  </Badge>
                ))}
                <Badge variant="secondary">{asset.status}</Badge>
              </div>
            </div>
            <div className="text-sm">
              <p className="font-display text-lg">{formatEUR(asset.price)}</p>
              {asset.yield_pct != null && (
                <p className="text-muted-foreground">Rendement {asset.yield_pct}%</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {asset.brochure_url && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Ouvrir la brochure"
                  onClick={() => {
                    if (asset.brochure_url) void openBrochure(asset.brochure_url);
                  }}
                >
                  <ExternalLink className="size-4" />
                </Button>
              )}

              <Button variant="outline" size="sm" asChild>
                <Link to="/" search={{ asset: asset.id }}>
                  <Target className="size-4" /> Matcher
                </Link>
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setEditing(asset)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Supprimer"
                onClick={() => remove.mutate(asset.id)}
              >
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AssetForm({
  draft,
  onChange,
  brochureFile,
  onBrochureFile,
  onSubmit,
  saving,
}: {
  draft: Draft;
  onChange: (d: Draft) => void;
  brochureFile: File | null;
  onBrochureFile: (f: File | null) => void;
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
        <Field label="Intitulé *">
          <Input required value={draft.title} onChange={(e) => set({ title: e.target.value })} />
        </Field>
        <Field label="Référence">
          <Input
            value={draft.reference ?? ""}
            onChange={(e) => set({ reference: e.target.value })}
          />
        </Field>
        <Field label="Classe d'actif">
          <Choice
            options={ASSET_CLASSES}
            value={draft.asset_class ?? ""}
            onChange={(v) => set({ asset_class: v })}
          />
        </Field>
        <Field label="Stratégie">
          <Choice
            options={STRATEGIES}
            value={draft.strategy ?? ""}
            onChange={(v) => set({ strategy: v })}
          />
        </Field>
        <Field label="Région">
          <Choice options={REGIONS} value={draft.region ?? ""} onChange={(v) => set({ region: v })} />
        </Field>
        <Field label="Ville">
          <Input value={draft.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
        </Field>
        <Field label="Prix (€)">
          <Input
            inputMode="numeric"
            value={formatThousands(draft.price)}
            onChange={(e) => set({ price: parseThousands(e.target.value) })}
          />
        </Field>
        <Field label="Rendement (%)">
          <Input
            type="number"
            step="0.1"
            value={draft.yield_pct ?? ""}
            onChange={(e) => set({ yield_pct: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <Field label="Surface (m²)">
          <Input
            type="number"
            value={draft.surface ?? ""}
            onChange={(e) => set({ surface: e.target.value ? Number(e.target.value) : null })}
          />
        </Field>
        <Field label="Statut">
          <Choice
            options={ASSET_STATUS}
            value={draft.status ?? "disponible"}
            onChange={(v) => set({ status: v })}
          />
        </Field>
      </div>
      <Field label="Brochure de l'actif (PDF, 9 Mo max.)">
        <Input
          type="file"
          accept="application/pdf"
          onChange={(e) => {
            const f = e.target.files?.[0] ?? null;
            if (f && f.type !== "application/pdf") {
              toast.error("Seuls les fichiers PDF sont acceptés.");
              e.target.value = "";
              onBrochureFile(null);
              return;
            }
            if (f && f.size > 9 * 1024 * 1024) {
              toast.error("La brochure ne doit pas dépasser 9 Mo.");
              e.target.value = "";
              onBrochureFile(null);
              return;
            }
            onBrochureFile(f);
          }}
        />
        <p className="mt-1 text-xs text-muted-foreground">
          {brochureFile
            ? `Nouveau fichier : ${brochureFile.name}`
            : draft.brochure_url
              ? "Une brochure est déjà associée à cet actif."
              : "Aucune brochure pour le moment."}
        </p>
      </Field>

      <Field label="Description">
        <Textarea
          rows={3}
          value={draft.description ?? ""}
          onChange={(e) => set({ description: e.target.value })}
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

function Choice({
  options,
  value,
  onChange,
}: {
  options: readonly string[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o}>
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
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
