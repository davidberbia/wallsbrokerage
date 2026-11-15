import { useAuth } from "@/hooks/useAuth";
import { CompactRow, RecordDialog, RecordFacts } from "@/components/CompactRow";
import { matchesAssetSearch } from "@/lib/list-search";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle2,
  ExternalLink,
  Loader2,
  Pencil,
  Plus,
  Presentation,
  Sparkles,
  Target,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { formatThousands, parseThousands } from "@/lib/format";
import { compressFile } from "@/lib/compress";
import { extractAssetFields } from "@/lib/asset-extract.functions";
import {
  MAX_DOCUMENT_BYTES,
  fetchAssetDocuments,
  openDocument,
  uploadDocument,
} from "@/lib/documents";
import { AppLayout } from "@/components/AppLayout";
import { ShareDialog } from "@/components/ShareDialog";
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
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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
  const { canEdit } = useAuth();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Asset | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedDocs, setRemovedDocs] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ label: string; file: File }[]>([]);
  const [step, setStep] = useState(0);
  const [fullEdit, setFullEdit] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);
  const navigate = useNavigate();
  const openEditor = (d: Draft | null) => {
    setEditing(d);
    setFullEdit(Boolean(d?.id));
    setStep(0);
    setCreatedId(null);
    setNewFiles([]);
    setRemovedDocs([]);
    setPhotos([]);
  };

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
        transaction_type: draft.transaction_type ?? null,
        address: draft.address ?? null,
        postal_code: draft.postal_code ?? null,
        rent: draft.rent ?? null,
        owner_name: draft.owner_name ?? null,
        owner_email: draft.owner_email ?? null,
        owner_phone: draft.owner_phone ?? null,
        mandate_exclusive: draft.mandate_exclusive ?? null,
        mandate_type: draft.mandate_type ?? null,
        mandate_start: draft.mandate_start || null,
        mandate_end: draft.mandate_end || null,
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

      if (photos.length > 0) {
        const rows = [] as {
          asset_id: string;
          path: string;
          name: string;
          sort_order: number;
          category: string;
        }[];
        for (const [i, p] of photos.entries()) {
          const up = await uploadDocument(`actifs/${assetId}/photos`, p.file);
          rows.push({
            asset_id: assetId!,
            path: up.path,
            name: `${p.label} — ${up.name}`,
            sort_order: i,
            category: "photo",
          });
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
      qc.invalidateQueries({ queryKey: ["asset-photos", assetId] });
      qc.invalidateQueries({ queryKey: ["asset-detail-photos", assetId] });
      if (fullEdit) {
        openEditor(null);
        toast.success("Actif enregistré");
        return;
      }
      setNewFiles([]);
      setRemovedDocs([]);
      setPhotos([]);
      setEditing((d) => (d ? { ...d, id: assetId } : d));
      if (step >= 3) setCreatedId(assetId);
      else setStep((s) => s + 1);
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

  const filtered = (data ?? []).filter((asset) => matchesAssetSearch(asset, search));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <p className="eyebrow">Portefeuille</p>
          <h1 className="mt-1 text-3xl">Actifs à placer</h1>
        </div>
        <Dialog
          open={editing !== null}
          onOpenChange={(o) => {
            if (!o) openEditor(null);
          }}
        >
          <DialogTrigger asChild>
            <Button className="min-h-11 shrink-0" onClick={() => openEditor({ ...emptyDraft })}>
              <Plus className="size-4" /> Nouvel actif
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editing?.id ? "Modifier l'actif" : "Nouvel actif"}</DialogTitle>
            </DialogHeader>
            {editing && createdId && (
              <div className="space-y-4 py-4 text-center">
                <CheckCircle2 className="mx-auto size-10 text-primary" />
                <p className="text-lg font-medium">Votre bien est créé.</p>
                <p className="text-sm text-muted-foreground">
                  Souhaitez-vous générer{" "}
                  {/appartement|maison/i.test(editing.asset_class ?? "")
                    ? "la fiche de présentation"
                    : "la brochure de vente"}{" "}
                  ?
                </p>
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button
                    className="min-h-11"
                    onClick={() => {
                      const id = createdId;
                      openEditor(null);
                      navigate({ to: "/presentation", search: { asset: id } });
                    }}
                  >
                    <Presentation className="size-4" /> Générer maintenant
                  </Button>
                  <Button className="min-h-11" variant="outline" onClick={() => openEditor(null)}>
                    Plus tard
                  </Button>
                </div>
              </div>
            )}
            {editing && !createdId && (
              <AssetForm
                fullEdit={fullEdit}
                step={step}
                onBack={() => setStep((s) => Math.max(0, s - 1))}
                photos={photos}
                onPhotos={setPhotos}
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

      <Input
        aria-label="Rechercher un actif par ville ou rue"
        placeholder="Ville, rue, nom, référence ou code postal…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      <p className="text-xs text-muted-foreground">{filtered.length} actif(s)</p>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && filtered.length === 0 && (
        <p className="py-6 text-sm text-muted-foreground">
          Aucun actif {search ? "ne correspond à la recherche." : "enregistré."}
        </p>
      )}
      <div className="overflow-hidden border-y border-border">
        {filtered.map((asset) => (
          <CompactRow
            key={asset.id}
            title={[asset.city, asset.title].filter(Boolean).join(" · ")}
            subtitle={[asset.address, asset.asset_class, asset.status].filter(Boolean).join(" · ")}
            summary={`${asset.surface ?? "—"} m² · ${formatEUR(asset.price ?? asset.rent)}`}
            onOpen={() => setDetail(asset)}
            onEdit={canEdit ? () => openEditor(asset) : undefined}
            onDelete={canEdit ? () => remove.mutate(asset.id) : undefined}
          />
        ))}
      </div>
      <RecordDialog
        title={detail?.title ?? "Actif"}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail && (
          <AssetDetails
            asset={detail}
            onEdit={() => {
              openEditor(detail);
              setDetail(null);
            }}
          />
        )}
      </RecordDialog>
    </div>
  );
}

const STEPS = ["Type de bien", "Infos de base", "Photos", "Mandat"];
const PROPERTY_TYPES = [...ASSET_CLASSES, "Appartement", "Maison"].filter(
  (v, i, a) => a.indexOf(v) === i,
);
const PHOTO_SLOTS_RESIDENTIAL = [
  "Photo principale",
  "Séjour",
  "Cuisine",
  "Chambre",
  "Salle de bains",
  "Extérieur",
];
const PHOTO_SLOTS_COMMERCIAL = ["Photo principale", "Façade", "Intérieur", "Vue aérienne", "Autre"];

function AssetForm({
  fullEdit,
  step,
  onBack,
  photos,
  onPhotos,
  draft,
  onChange,
  newFiles,
  onNewFiles,
  removedDocs,
  onRemovedDocs,
  onSubmit,
  saving,
}: {
  fullEdit: boolean;
  draft: Draft;
  onChange: (d: Draft) => void;
  newFiles: File[];
  onNewFiles: (f: File[]) => void;
  removedDocs: string[];
  onRemovedDocs: (ids: string[]) => void;
  onSubmit: () => void;
  saving: boolean;
  step: number;
  onBack: () => void;
  photos: { label: string; file: File }[];
  onPhotos: (p: { label: string; file: File }[]) => void;
}) {
  const residential = /appartement|maison/i.test(draft.asset_class ?? "");
  const slots = residential ? PHOTO_SLOTS_RESIDENTIAL : PHOTO_SLOTS_COMMERCIAL;
  const { data: savedPhotos } = useQuery({
    queryKey: ["asset-photos", draft.id],
    enabled: Boolean(draft.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_documents")
        .select("id, name, path")
        .eq("asset_id", draft.id!)
        .eq("category", "photo");
      if (error) throw error;
      return data ?? [];
    },
  });
  const hasMainPhoto =
    photos.some((p) => p.label === "Photo principale") ||
    (savedPhotos ?? []).some((p) => p.name.startsWith("Photo principale"));
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const [extracting, setExtracting] = useState(false);
  const { data: documents } = useQuery({
    queryKey: ["asset-documents", draft.id],
    queryFn: () => fetchAssetDocuments(draft.id!),
    enabled: Boolean(draft.id),
  });
  const keptDocuments = (documents ?? []).filter((d) => !removedDocs.includes(d.id));

  const extractFromDocument = async (file: File) => {
    setExtracting(true);
    try {
      const compressed = await compressFile(file);
      if (compressed.size > MAX_DOCUMENT_BYTES) {
        toast.error(`${file.name} dépasse 9 Mo même après compression.`);
        return;
      }
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result).split(",")[1] ?? "");
        reader.onerror = () => reject(new Error("Lecture du fichier impossible"));
        reader.readAsDataURL(compressed);
      });
      const fields = await extractAssetFields({
        data: {
          name: compressed.name,
          mimeType: compressed.type || "application/octet-stream",
          base64,
        },
      });
      const patch: Partial<Draft> = {};
      for (const key of [
        "title",
        "reference",
        "asset_class",
        "strategy",
        "region",
        "city",
        "price",
        "yield_pct",
        "surface",
        "description",
      ] as const) {
        const value = fields?.[key];
        if (value != null && value !== "" && (draft[key] == null || draft[key] === "")) {
          Object.assign(patch, { [key]: value });
        }
      }
      if (Object.keys(patch).length > 0) {
        onChange({ ...draft, ...patch });
        toast.success("Champs pré-remplis depuis le document — vérifiez avant d'enregistrer.");
      } else {
        toast.info("Aucune information exploitable trouvée dans ce document.");
      }
      onNewFiles([...newFiles, compressed]);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Lecture du document impossible");
    } finally {
      setExtracting(false);
    }
  };

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!fullEdit && step === 0 && (!draft.asset_class || !draft.transaction_type)) {
          toast.error("Choisissez le type de bien et la transaction.");
          return;
        }
        if (!fullEdit && step === 2 && !hasMainPhoto) {
          toast.error("La photo principale est obligatoire.");
          return;
        }
        onSubmit();
      }}
    >
      {!fullEdit && (
        <div className="flex gap-1 overflow-x-auto pb-1">
          {STEPS.map((label, i) => (
            <span
              key={label}
              className={`shrink-0 rounded-md border px-2 py-1 text-xs ${i === step ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground"}`}
            >
              {i + 1}. {label}
            </span>
          ))}
        </div>
      )}
      {(fullEdit || step === 0) && (
        <div className="grid gap-4">
          <Field label="Intitulé *">
            <Input required value={draft.title} onChange={(e) => set({ title: e.target.value })} />
          </Field>
          <Field label="Type de bien *">
            <Choice
              options={PROPERTY_TYPES}
              value={draft.asset_class ?? ""}
              onChange={(v) => set({ asset_class: v })}
            />
          </Field>
          <Field label="Transaction *">
            <div className="grid grid-cols-2 gap-2">
              {["Vente", "Location"].map((t) => (
                <Button
                  key={t}
                  type="button"
                  className="min-h-11"
                  variant={draft.transaction_type === t ? "default" : "outline"}
                  onClick={() => set({ transaction_type: t })}
                >
                  {t}
                </Button>
              ))}
            </div>
          </Field>
        </div>
      )}
      {(fullEdit || step === 1) && (
        <>
          <Field label="Pré-remplir depuis un document (brochure, teaser, avis de valeur)">
            <div className="flex items-center gap-3">
              <Input
                type="file"
                accept=".pdf,image/*"
                disabled={extracting}
                aria-label="Importer un document pour pré-remplir"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  e.target.value = "";
                  if (!file) return;
                  if (file.size > 30 * 1024 * 1024) {
                    toast.error(`${file.name} est trop lourd (30 Mo max. avant compression).`);
                    return;
                  }
                  void extractFromDocument(file);
                }}
              />
              {extracting && (
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Lecture du document…
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3" /> Les caractéristiques détectées remplissent les champs
              vides ci-dessous ; le document est joint à l'actif.
            </p>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Adresse">
              <Input
                value={draft.address ?? ""}
                onChange={(e) => set({ address: e.target.value })}
              />
            </Field>
            <Field label="Code postal">
              <Input
                inputMode="numeric"
                value={draft.postal_code ?? ""}
                onChange={(e) => set({ postal_code: e.target.value })}
              />
            </Field>
            <Field label="Loyer annuel (€)">
              <Input
                inputMode="numeric"
                value={formatThousands(draft.rent)}
                onChange={(e) => set({ rent: parseThousands(e.target.value) })}
              />
            </Field>
            <Field label="Référence">
              <Input
                value={draft.reference ?? ""}
                onChange={(e) => set({ reference: e.target.value })}
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
              <Choice
                options={REGIONS}
                value={draft.region ?? ""}
                onChange={(v) => set({ region: v })}
              />
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
          <Field label="Documents de l'actif (brochures, annexes — 9 Mo max. par fichier)">
            {(keptDocuments.length > 0 || newFiles.length > 0) && (
              <ul className="mb-2 space-y-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {keptDocuments.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      className="truncate text-left underline-offset-2 hover:underline"
                      onClick={() => {
                        void openDocument(doc.path).catch(() =>
                          toast.error("Document introuvable"),
                        );
                      }}
                    >
                      {doc.name}
                    </button>
                    <button
                      type="button"
                      aria-label={`Supprimer ${doc.name}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => onRemovedDocs([...removedDocs, doc.id])}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
                {newFiles.map((file, i) => (
                  <li key={`${file.name}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{file.name} (à ajouter)</span>
                    <button
                      type="button"
                      aria-label={`Retirer ${file.name}`}
                      className="text-muted-foreground hover:text-foreground"
                      onClick={() => onNewFiles(newFiles.filter((_, idx) => idx !== i))}
                    >
                      <X className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <Input
              type="file"
              multiple
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (picked.length === 0) return;
                void (async () => {
                  const compressed = await Promise.all(picked.map((f) => compressFile(f)));
                  const tooBig = compressed.find((f) => f.size > MAX_DOCUMENT_BYTES);
                  if (tooBig) {
                    toast.error(`${tooBig.name} dépasse 9 Mo même après compression.`);
                    return;
                  }
                  onNewFiles([...newFiles, ...compressed]);
                })();
              }}
            />
            <p className="mt-1 text-xs text-muted-foreground">
              {keptDocuments.length + newFiles.length === 0
                ? "Aucun document pour le moment."
                : `${keptDocuments.length + newFiles.length} document(s) seront joints aux campagnes.`}
            </p>
          </Field>

          <Field label="Description">
            <Textarea
              rows={3}
              value={draft.description ?? ""}
              onChange={(e) => set({ description: e.target.value })}
            />
          </Field>
        </>
      )}
      {(fullEdit || step === 2) && (
        <div className="grid gap-3">
          <p className="text-sm text-muted-foreground">
            Seule la photo principale est obligatoire.
          </p>
          {slots.map((label) => {
            const pending = photos.find((p) => p.label === label);
            const saved = (savedPhotos ?? []).filter((p) => p.name.startsWith(label));
            return (
              <Field key={label} label={label === "Photo principale" ? `${label} *` : label}>
                {saved.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    ✓ {saved.length} photo(s) enregistrée(s)
                  </p>
                )}
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    e.target.value = "";
                    if (!f) return;
                    void compressFile(f).then((c) =>
                      onPhotos([...photos.filter((p) => p.label !== label), { label, file: c }]),
                    );
                  }}
                />
                {pending && <p className="text-xs">{pending.file.name} (à ajouter)</p>}
              </Field>
            );
          })}
        </div>
      )}
      {(fullEdit || step === 3) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Propriétaire">
            <Input
              value={draft.owner_name ?? ""}
              onChange={(e) => set({ owner_name: e.target.value })}
            />
          </Field>
          <Field label="Email du propriétaire">
            <Input
              type="email"
              value={draft.owner_email ?? ""}
              onChange={(e) => set({ owner_email: e.target.value })}
            />
          </Field>
          <Field label="Téléphone du propriétaire">
            <Input
              type="tel"
              value={draft.owner_phone ?? ""}
              onChange={(e) => set({ owner_phone: e.target.value })}
            />
          </Field>
          <Field label="Exclusivité">
            <Choice
              options={["Exclusif", "Non exclusif"]}
              value={
                draft.mandate_exclusive == null
                  ? ""
                  : draft.mandate_exclusive
                    ? "Exclusif"
                    : "Non exclusif"
              }
              onChange={(v) => set({ mandate_exclusive: v === "Exclusif" })}
            />
          </Field>
          <Field label="Type de mandat">
            <Choice
              options={["Mandat de vente", "Mandat de location"]}
              value={draft.mandate_type ?? ""}
              onChange={(v) => set({ mandate_type: v })}
            />
          </Field>
          <div />
          <Field label="Début du mandat">
            <Input
              type="date"
              value={draft.mandate_start ?? ""}
              onChange={(e) => set({ mandate_start: e.target.value })}
            />
          </Field>
          <Field label="Fin du mandat">
            <Input
              type="date"
              value={draft.mandate_end ?? ""}
              onChange={(e) => set({ mandate_end: e.target.value })}
            />
          </Field>
        </div>
      )}
      <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
        {!fullEdit && (
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            disabled={step === 0 || saving}
            onClick={onBack}
          >
            ← Retour
          </Button>
        )}
        <Button type="submit" className="min-h-11" disabled={saving}>
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {fullEdit ? "Enregistrer" : step === 3 ? "Terminer" : "Suivant →"}
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

function AssetDetails({ asset, onEdit }: { asset: Asset; onEdit: () => void }) {
  const docs = useQuery({
    queryKey: ["asset-documents", asset.id],
    queryFn: () => fetchAssetDocuments(asset.id),
  });
  const photos = useQuery({
    queryKey: ["asset-detail-photos", asset.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("asset_documents")
        .select("id, path, name")
        .eq("asset_id", asset.id)
        .eq("category", "photo");
      return Promise.all(
        (data ?? []).map(async (p) => {
          const { data: signed } = await supabase.storage
            .from("brochures")
            .createSignedUrl(p.path, 600);
          return { ...p, url: signed?.signedUrl };
        }),
      );
    },
  });
  return (
    <>
      <div className="flex flex-wrap gap-2">
        <Button onClick={onEdit}>
          <Pencil className="size-4" /> Modifier
        </Button>
        <Button variant="outline" asChild>
          <Link to="/matching" search={{ asset: asset.id }}>
            <Target className="size-4" /> Matching
          </Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/presentation" search={{ asset: asset.id }}>
            <Presentation className="size-4" /> Teaser
          </Link>
        </Button>
        <ShareDialog assetId={asset.id} />
      </div>
      <RecordFacts
        facts={[
          ["Référence", asset.reference],
          ["Type", asset.asset_class],
          ["Transaction", asset.transaction_type],
          ["Adresse", [asset.address, asset.postal_code, asset.city].filter(Boolean).join(" · ")],
          ["Région", asset.region],
          ["Surface", `${asset.surface ?? "—"} m²`],
          ["Prix", formatEUR(asset.price)],
          ["Loyer annuel", formatEUR(asset.rent)],
          ["Rendement", asset.yield_pct == null ? null : `${asset.yield_pct}%`],
          ["Statut", asset.status],
          ["Stratégie", asset.strategy],
          ["Description", asset.description],
          ["Propriétaire", asset.owner_name],
          ["Email propriétaire", asset.owner_email],
          ["Téléphone propriétaire", asset.owner_phone],
          ["Mandat", asset.mandate_type],
          [
            "Exclusivité",
            asset.mandate_exclusive == null
              ? "—"
              : asset.mandate_exclusive
                ? "Exclusif"
                : "Non exclusif",
          ],
          ["Début", asset.mandate_start],
          ["Fin", asset.mandate_end],
        ]}
      />
      <div className="grid grid-cols-2 gap-2">
        {photos.data
          ?.filter((p) => p.url)
          .map((p) => (
            <img
              key={p.id}
              src={p.url}
              alt={p.name}
              className="aspect-video w-full rounded-sm object-cover"
            />
          ))}
      </div>
      <h3>Documents</h3>
      {docs.data?.map((d) => (
        <Button
          key={d.id}
          variant="outline"
          className="w-full min-w-0 justify-start"
          onClick={() => void openDocument(d.path).catch(() => toast.error("Document introuvable"))}
        >
          <ExternalLink className="size-4 shrink-0" />
          <span className="truncate">{d.name}</span>
        </Button>
      ))}
    </>
  );
}
