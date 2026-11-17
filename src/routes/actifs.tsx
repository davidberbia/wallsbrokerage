import { AgentSelect, useAgentFilter } from "@/components/AgentFilter";
import { ResidentialFields, RESIDENTIAL_LABELS } from "@/components/ResidentialFields";
import { useAuth } from "@/hooks/useAuth";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { HelpCircle, FileSignature } from "lucide-react";
import { lookupSiren } from "@/lib/siren.functions";
import { mandantText, type OwnerDetails } from "@/lib/siren";
import { MergePicker } from "@/components/MergePicker";
import { mergeAssetFields, ASSET_CHILD_TABLES } from "@/lib/asset-merge";
import { Merge } from "lucide-react";
import { CompactRow, RecordDialog, RecordFacts } from "@/components/CompactRow";
import { matchesAssetSearch } from "@/lib/list-search";
import { addOneYear , feeText, feeChargeText } from "@/lib/mandate-template";
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
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_CLASSES, ASSET_CLASS_GROUPS, ASSET_SUBCLASSES, ASSET_STATUS, REGIONS, STRATEGIES, assetKindLabel, formatEUR } from "@/lib/taxonomy";
import type { Asset, PortfolioLot } from "@/lib/types";

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
  const af = useAgentFilter();
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<Asset | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [removedDocs, setRemovedDocs] = useState<string[]>([]);
  const [photos, setPhotos] = useState<{ label: string; file: File }[]>([]);
  const [plans, setPlans] = useState<File[]>([]);
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
        residential_details: draft.residential_details ?? {},
        publish_on_site: draft.publish_on_site ?? false,
        hide_street_number: (draft.hide_street_number || draft.hide_street_name) ?? false,
        hide_street_name: draft.hide_street_name ?? false,
        reference: draft.reference ?? null,
        asset_class: draft.asset_class ?? null,
        asset_subclass: ASSET_SUBCLASSES[draft.asset_class ?? ""] ? draft.asset_subclass ?? null : null,
        is_portfolio: draft.is_portfolio ?? false,
        portfolio_lots: draft.is_portfolio ? (draft.portfolio_lots ?? []) : [],
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
        owner_kind: draft.owner_kind ?? null,
        owner_details: draft.owner_details ?? {},
        parking_count: draft.parking_count ?? null,
        outdoor_surface: draft.outdoor_surface ?? null,
        weighted_surface: draft.weighted_surface ?? null,
        mandate_exclusive: draft.mandate_exclusive ?? null,
        mandate_type: draft.mandate_type ?? null,
        fee_mode: draft.fee_mode ?? null,
        fee_value: draft.fee_value ?? null,
        fee_payer: draft.fee_payer ?? null,
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

      if (plans.length > 0) {
        const { count } = await supabase.from("asset_documents").select("id", { count: "exact", head: true }).eq("asset_id", assetId!).eq("category", "plan");
        const rows = [] as { asset_id: string; path: string; name: string; sort_order: number; category: string }[];
        for (const [i, f] of plans.entries()) {
          const up = await uploadDocument(`actifs/${assetId}/plans`, f);
          rows.push({ asset_id: assetId!, path: up.path, name: up.name, sort_order: (count ?? 0) + i, category: "plan" });
        }
        const { error } = await supabase.from("asset_documents").insert(rows);
        if (error) throw error;
        setPlans([]);
      }

      // Pas de photo = pas de diffusion sur le site.
      if (payload.publish_on_site) {
        const { count } = await supabase.from("asset_documents").select("id", { count: "exact", head: true }).eq("asset_id", assetId!).eq("category", "photo");
        if (!count) await supabase.from("assets").update({ publish_on_site: false, hide_street_number: false, hide_street_name: false }).eq("id", assetId!);
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
      qc.invalidateQueries({ queryKey: ["asset-plans", assetId] });
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

  const [mergeFor, setMergeFor] = useState<Asset | null>(null);
  const mergeAssets = useMutation({
    mutationFn: async ({ keep, ids }: { keep: Asset; ids: string[] }) => {
      const others = (data ?? []).filter((a) => ids.includes(a.id));
      const patch = mergeAssetFields(keep as never, others as never);
      // Libère les références uniques des doublons avant de les reporter.
      if (patch["reference"]) {
        const { error } = await supabase.from("assets").update({ reference: null } as never).in("id", ids);
        if (error) throw error;
      }
      if (Object.keys(patch).length) {
        const { error } = await supabase.from("assets").update(patch as never).eq("id", keep.id);
        if (error) throw error;
      }
      for (const t of ASSET_CHILD_TABLES) {
        const { error } = await supabase.from(t).update({ asset_id: keep.id } as never).in("asset_id", ids);
        if (error) throw error;
      }
      const { error } = await supabase.from("assets").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Actifs fusionnés"); setMergeFor(null); },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => { void qc.invalidateQueries({ queryKey: ["assets"] }); void qc.invalidateQueries({ queryKey: ["deals"] }); },
  });

  const filtered = (data ?? []).filter((asset) => af.keep((asset as { owner_id?: string | null }).owner_id) && matchesAssetSearch(asset, search));

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4">
        <div>
          <p className="eyebrow">Portefeuille</p>
          <h1 className="mt-1 text-3xl">Actifs à placer</h1>
        <AgentSelect f={af} />
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
                plans={plans}
                onPlans={setPlans}
                onPhotos={setPhotos}
                draft={editing}
                onChange={setEditing}
                newFiles={newFiles}
                onNewFiles={setNewFiles}
                removedDocs={removedDocs}
                onRemovedDocs={setRemovedDocs}
                onSubmit={() => (!fullEdit && !editing.id && step < 3 ? setStep((x) => x + 1) : save.mutate(editing))}
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
            trailing={canEdit ? (
              <Button variant="ghost" size="icon" className="size-11" title="Fusionner" aria-label={`Fusionner ${asset.title}`} onClick={() => setMergeFor(asset)}>
                <Merge className="size-4" />
              </Button>
            ) : undefined}
          />
        ))}
      </div>
      <MergePicker
        open={!!mergeFor}
        title={mergeFor?.title ?? ""}
        initialSearch={mergeFor?.city ?? ""}
        items={filtered.filter((a) => a.id !== mergeFor?.id).map((a) => ({ id: a.id, title: [a.city, a.title].filter(Boolean).join(" · "), subtitle: [a.reference && `N° ${a.reference}`, a.address, a.asset_class].filter(Boolean).join(" · ") }))}
        busy={mergeAssets.isPending}
        onClose={() => setMergeFor(null)}
        onMerge={(ids) => mergeFor && mergeAssets.mutate({ keep: mergeFor, ids })}
      />
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
  plans,
  onPlans,
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
  plans: File[];
  onPlans: (f: File[]) => void;
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
  const { data: savedPlans } = useQuery({
    queryKey: ["asset-plans", draft.id],
    enabled: Boolean(draft.id),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_documents")
        .select("id, name, path")
        .eq("asset_id", draft.id!)
        .eq("category", "plan")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });
  const hasPhoto = photos.length > 0 || (savedPhotos ?? []).length > 0;
  const set = (patch: Partial<Draft>) => onChange({ ...draft, ...patch });
  const [extracting, setExtracting] = useState(false);
  const { data: documents } = useQuery({
    queryKey: ["asset-documents", draft.id],
    queryFn: () => fetchAssetDocuments(draft.id!),
    enabled: Boolean(draft.id),
  });
  const keptDocuments = (documents ?? []).filter((d) => !removedDocs.includes(d.id));

  const extractFromDocument = async (file: File, extra: File[] = []) => {
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
      onNewFiles([...newFiles, compressed, ...extra]);
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
        if ((fullEdit || step === 3) && draft.owner_kind === "morale" && !/^\d{9}$/.test((draft.owner_details?.siren ?? "").replace(/\s/g, ""))) {
          toast.error("Le SIREN (9 chiffres) est obligatoire pour une société.");
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
            <ClassChoice
              options={PROPERTY_TYPES}
              value={draft.asset_class ?? ""}
              onChange={(v) => set({ asset_class: v, asset_subclass: null })}
            />
          </Field>
          {ASSET_SUBCLASSES[draft.asset_class ?? ""] && (
            <Field label="Sous-classe">
              <div className="grid grid-cols-3 gap-2">
                {ASSET_SUBCLASSES[draft.asset_class ?? ""]!.map((t) => (
                  <Button key={t} type="button" className="min-h-11" variant={draft.asset_subclass === t ? "default" : "outline"} onClick={() => set({ asset_subclass: t })}>
                    {t}
                  </Button>
                ))}
              </div>
            </Field>
          )}
          <label className="flex min-h-11 items-center gap-3 rounded-md border px-3">
            <input type="checkbox" className="size-5 accent-primary" checked={draft.is_portfolio ?? false} onChange={(e) => set({ is_portfolio: e.target.checked, portfolio_lots: e.target.checked && !(draft.portfolio_lots ?? []).length ? [{}, {}] : (draft.portfolio_lots ?? []) })} />
            <span className="text-sm">Portefeuille (plusieurs biens à des adresses différentes)</span>
          </label>
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
          <Field label="Documents de l'actif (brochure, teaser, avis de valeur, annexes — 9 Mo max.)">
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
            <div className="flex items-center gap-3">
              <Input
                type="file"
                multiple
                accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
                disabled={extracting}
                aria-label="Ajouter des documents"
                onChange={(e) => {
                  const picked = Array.from(e.target.files ?? []);
                  e.target.value = "";
                  const [first, ...rest] = picked;
                  if (!first) return;
                  if (picked.some((f) => f.size > 30 * 1024 * 1024)) {
                    toast.error("Fichier trop lourd (30 Mo max. avant compression).");
                    return;
                  }
                  void (async () => {
                    const extra = await Promise.all(rest.map((f) => compressFile(f)));
                    const tooBig = extra.find((f) => f.size > MAX_DOCUMENT_BYTES);
                    if (tooBig) return void toast.error(`${tooBig.name} dépasse 9 Mo même après compression.`);
                    await extractFromDocument(first, extra);
                  })();
                }}
              />
              {extracting && (
                <span className="flex shrink-0 items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="size-4 animate-spin" /> Lecture…
                </span>
              )}
            </div>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
              <Sparkles className="size-3" /> Le premier document pré-remplit les champs vides ; tous sont joints à l'actif.
            </p>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field label="Adresse">
                <Input value={draft.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
              </Field>
            </div>
            <Field label="Code postal">
              <Input inputMode="numeric" value={draft.postal_code ?? ""} onChange={(e) => set({ postal_code: e.target.value })} />
            </Field>
            <Field label="Ville">
              <Input value={draft.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
            </Field>
            <Field label="Région">
              <Choice options={REGIONS} value={draft.region ?? ""} onChange={(v) => set({ region: v })} />
            </Field>
            <Field label="Statut">
              <Choice options={ASSET_STATUS} value={draft.status ?? "disponible"} onChange={(v) => set({ status: v })} />
            </Field>
            {draft.is_portfolio && (
              <div className="sm:col-span-2">
                <LotsEditor lots={draft.portfolio_lots ?? []} onChange={(lots) => set({ portfolio_lots: lots, surface: sumOf(lots, "surface"), rent: sumOf(lots, "rent") })} />
              </div>
            )}
            <Field label={draft.is_portfolio ? "Surface totale (m²)" : "Surface (m²)"}>
              <Input type="number" value={draft.surface ?? ""} onChange={(e) => set({ surface: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            {!residential && (
              <Field label="Surface pondérée (m²)">
                <Input type="number" value={draft.weighted_surface ?? ""} onChange={(e) => set({ weighted_surface: e.target.value ? Number(e.target.value) : null })} />
              </Field>
            )}
            <Field label="Surface extérieure (m²)">
              <Input type="number" min={0} value={draft.outdoor_surface ?? ""} onChange={(e) => set({ outdoor_surface: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Nombre de parkings">
              <Input type="number" min={0} value={draft.parking_count ?? ""} onChange={(e) => set({ parking_count: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <Field label="Prix (€)">
              <Input inputMode="numeric" value={formatThousands(draft.price)} onChange={(e) => set({ price: parseThousands(e.target.value) })} />
            </Field>
            <Field label="Loyer annuel (€)">
              <Input inputMode="numeric" value={formatThousands(draft.rent)} onChange={(e) => set({ rent: parseThousands(e.target.value) })} />
            </Field>
            <Field label="Rendement (%)">
              <Input type="number" step="0.1" value={draft.yield_pct ?? ""} onChange={(e) => set({ yield_pct: e.target.value ? Number(e.target.value) : null })} />
            </Field>
            <div className="space-y-2">
              <div className="flex items-center gap-1">
                <Label>Stratégie (facultatif)</Label>
                <StrategyHelp />
              </div>
              <Choice options={STRATEGIES} value={draft.strategy ?? ""} onChange={(v) => set({ strategy: v })} />
            </div>
          </div>
          {residential && <ResidentialFields value={draft.residential_details ?? {}} onChange={v => set({residential_details:v})} />}
          <div className="space-y-3 rounded-md border border-border p-3">
            <label className="flex min-h-11 items-center gap-3 text-sm">
              <input type="checkbox" className="size-5 accent-primary" disabled={!hasPhoto}
                checked={hasPhoto && !!draft.publish_on_site}
                onChange={e => set(e.target.checked ? { publish_on_site: true } : { publish_on_site: false, hide_street_number: false, hide_street_name: false })} />
              Diffuser sur le site Wallsbroker
            </label>
            {!hasPhoto && <p className="text-xs text-muted-foreground">Ajoutez au moins une photo (étape Photos) pour diffuser sur le site.</p>}
            {hasPhoto && draft.publish_on_site && ([["hide_street_number","Masquer le n° de la rue"],["hide_street_name","Masquer le nom de la rue"]] as const).map(([key,label]) => (
              <label key={key} className="flex min-h-11 items-center gap-3 pl-6 text-sm">
                <input type="checkbox" className="size-5 accent-primary" disabled={key === "hide_street_number" && !!draft.hide_street_name}
                  checked={key === "hide_street_number" ? !!(draft.hide_street_number || draft.hide_street_name) : !!draft[key]}
                  onChange={e => set(key === "hide_street_name" && e.target.checked ? {hide_street_name:true,hide_street_number:true} : {[key]: e.target.checked})} />
                {label}
              </label>))}
          </div>
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
            Aucune photo n'est obligatoire ici. La photo principale sera demandée pour créer la brochure, et au moins une photo pour diffuser sur le site.
          </p>
          {slots.map((label) => {
            const pending = photos.find((p) => p.label === label);
            const saved = (savedPhotos ?? []).filter((p) => p.name.startsWith(label));
            return (
              <Field key={label} label={label}>
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
          <Field label="Plans (PDF)">
            {(savedPlans ?? []).length > 0 && (
              <p className="text-xs text-muted-foreground">✓ {savedPlans!.length} plan(s) enregistré(s)</p>
            )}
            <Input
              type="file"
              accept="application/pdf,.pdf"
              multiple
              onChange={(e) => {
                const fs = Array.from(e.target.files ?? []);
                e.target.value = "";
                if (fs.length) onPlans([...plans, ...fs]);
              }}
            />
            {plans.map((f, i) => (
              <p key={i} className="flex items-center justify-between gap-2 text-xs">
                <span className="truncate">{f.name} (à ajouter)</span>
                <button type="button" className="text-destructive" onClick={() => onPlans(plans.filter((_, j) => j !== i))}>Retirer</button>
              </p>
            ))}
            <p className="text-xs text-muted-foreground">Chaque page devient une page de la brochure.</p>
          </Field>
        </div>
      )}
      {(fullEdit || step === 3) && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Mandat / Référence">
              <Input disabled value={draft.reference ?? ""} placeholder="Généré automatiquement à la création" />
            </Field>
          </div>
          <div className="sm:col-span-2">
            <OwnerFields draft={draft} set={set} />
          </div>
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
          <Field label="Honoraires">
            <div className="flex gap-2">
              <Input
                type="number"
                inputMode="decimal"
                value={draft.fee_value ?? ""}
                onChange={(e) => set({ fee_value: e.target.value === "" ? null : Number(e.target.value), fee_mode: draft.fee_mode ?? "pct" })}
              />
              <Choice options={["%", "€ HT"]} value={draft.fee_mode === "ht" ? "€ HT" : draft.fee_value != null || draft.fee_mode === "pct" ? "%" : ""} onChange={(v) => set({ fee_mode: v === "%" ? "pct" : "ht" })} />
            </div>
          </Field>
          <Field label="Honoraires à la charge de">
            <Choice options={["Mandant", "Acquéreur", "Preneur"]} value={draft.fee_payer ?? ""} onChange={(v) => set({ fee_payer: v })} />
          </Field>
          <Field label="Début du mandat">
            <Input
              type="date"
              value={draft.mandate_start ?? ""}
              onChange={(e) =>
                set({
                  mandate_start: e.target.value,
                  mandate_end: e.target.value ? addOneYear(e.target.value) : (draft.mandate_end ?? null),
                })
              }
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

function ClassChoice({ options, value, onChange }: { options: readonly string[]; value: string; onChange: (v: string) => void }) {
  const grouped = new Set(ASSET_CLASS_GROUPS.flatMap(([, l]) => l));
  const others = options.filter((o) => !grouped.has(o));
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger>
        <SelectValue placeholder="—" />
      </SelectTrigger>
      <SelectContent>
        {ASSET_CLASS_GROUPS.map(([g, list]) => {
          const items = list.filter((o) => options.includes(o));
          return items.length ? (
            <SelectGroup key={g}>
              <SelectLabel>{g}</SelectLabel>
              {items.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
            </SelectGroup>
          ) : null;
        })}
        {others.length > 0 && (
          <SelectGroup>
            <SelectLabel>Autres</SelectLabel>
            {others.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}

const sumOf = (lots: PortfolioLot[], k: "surface" | "rent") => {
  const t = lots.reduce((a, l) => a + (Number(l[k]) || 0), 0);
  return t || null;
};

function LotsEditor({ lots, onChange }: { lots: PortfolioLot[]; onChange: (l: PortfolioLot[]) => void }) {
  const up = (i: number, patch: Partial<PortfolioLot>) => onChange(lots.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  const num = (v: string) => (v ? Number(v) : null);
  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Biens du portefeuille (état locatif)</p>
      {lots.map((l, i) => (
        <div key={i} className="grid gap-2 rounded-md border p-3 sm:grid-cols-2">
          <div className="flex items-center justify-between sm:col-span-2">
            <span className="text-sm font-medium">Bien {i + 1}</span>
            <Button type="button" variant="ghost" size="sm" className="min-h-11" onClick={() => onChange(lots.filter((_, j) => j !== i))}>
              <Trash2 className="size-4" /> Retirer
            </Button>
          </div>
          <Input className="sm:col-span-2" placeholder="Adresse" value={l.address ?? ""} onChange={(e) => up(i, { address: e.target.value })} />
          <Input inputMode="numeric" placeholder="Code postal" value={l.postal_code ?? ""} onChange={(e) => up(i, { postal_code: e.target.value })} />
          <Input placeholder="Ville" value={l.city ?? ""} onChange={(e) => up(i, { city: e.target.value })} />
          <ClassChoice options={PROPERTY_TYPES} value={l.asset_class ?? ""} onChange={(v) => up(i, { asset_class: v })} />
          <Input type="number" placeholder="Surface (m²)" value={l.surface ?? ""} onChange={(e) => up(i, { surface: num(e.target.value) })} />
          <Input placeholder="Locataire (vide si libre)" value={l.tenant ?? ""} onChange={(e) => up(i, { tenant: e.target.value })} />
          <Input inputMode="numeric" placeholder="Loyer annuel (€ HT HC)" value={formatThousands(l.rent ?? null)} onChange={(e) => up(i, { rent: parseThousands(e.target.value) })} />
        </div>
      ))}
      <Button type="button" variant="outline" className="min-h-11 w-full" onClick={() => onChange([...lots, {}])}>
        <Plus className="size-4" /> Ajouter un bien
      </Button>
    </div>
  );
}

const STRATEGY_HELP: [string, string][] = [
  ["Core", "Actifs de première catégorie, bien localisés, loués à des locataires solides sur des baux longs. Rendement sécurisé, liquidité forte."],
  ["Core+", "Fondamentaux du Core avec une marge de valorisation limitée : renégociation de baux, relocation ponctuelle, optimisation des charges."],
  ["Value-added", "Vacance partielle ou obsolescence technique nécessitant des travaux. Plus risqué mais moins cher, avec une revalorisation significative à terme."],
  ["Opportuniste", "Actifs à réhabiliter, restructurer lourdement ou reconstruire, voire promotion en blanc : risques élevés pour une forte profitabilité."],
];

function StrategyHelp() {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Explication des stratégies" className="inline-flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
          onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
          <HelpCircle className="size-4" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-80 space-y-2 text-sm">
        {STRATEGY_HELP.map(([t, d]) => (
          <p key={t}><strong>{t}</strong> — {d}</p>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function OwnerFields({ draft, set }: { draft: Draft; set: (p: Partial<Draft>) => void }) {
  const kind = draft.owner_kind ?? "physique";
  const d = draft.owner_details ?? {};
  const setD = (patch: OwnerDetails) => set({ owner_details: { ...d, ...patch } });
  const [loading, setLoading] = useState(false);
  const fetchSiren = async () => {
    setLoading(true);
    try {
      const r = await lookupSiren({ data: { siren: d.siren ?? "" } });
      set({ owner_name: r.company_name, owner_details: { ...d, ...r } });
      toast.success("Informations de la société récupérées.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Recherche impossible");
    } finally {
      setLoading(false);
    }
  };
  const txt = (key: keyof OwnerDetails, label: string, extra: Partial<React.ComponentProps<typeof Input>> = {}) => (
    <Field label={label}>
      <Input value={d[key] ?? ""} onChange={(e) => setD({ [key]: e.target.value })} {...extra} />
    </Field>
  );
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div className="grid grid-cols-2 gap-2 sm:col-span-2">
        {([["physique", "Personne physique"], ["morale", "Société"]] as const).map(([k, l]) => (
          <Button key={k} type="button" className="min-h-11" variant={kind === k ? "default" : "outline"} onClick={() => set({ owner_kind: k })}>{l}</Button>
        ))}
      </div>
      {kind === "morale" ? (
        <>
          <Field label="SIREN *">
            <div className="flex gap-2">
              <Input required inputMode="numeric" pattern="[0-9 ]{9,11}" value={d.siren ?? ""} onChange={(e) => setD({ siren: e.target.value })} />
              <Button type="button" variant="outline" className="min-h-11 shrink-0" disabled={loading} onClick={fetchSiren}>
                {loading ? <Loader2 className="size-4 animate-spin" /> : "Rechercher"}
              </Button>
            </div>
          </Field>
          <Field label="Raison sociale">
            <Input value={draft.owner_name ?? ""} onChange={(e) => set({ owner_name: e.target.value, owner_details: { ...d, company_name: e.target.value } })} />
          </Field>
          {txt("legal_form", "Forme juridique")}
          {txt("rcs_city", "RCS (ville)")}
          <div className="sm:col-span-2">{txt("address", "Siège social")}</div>
          {txt("representative", "Représentant légal")}
          {txt("representative_role", "Qualité (Président, Gérant…)")}
          <label className="flex min-h-11 items-center gap-3 text-sm sm:col-span-2">
            <input type="checkbox" className="size-5 accent-primary" checked={d.proxy === "1"} onChange={(e) => setD(e.target.checked ? { proxy: "1" } : { proxy: "", proxy_name: "" })} />
            Signataire par procuration
          </label>
          {d.proxy === "1" && <div className="sm:col-span-2">{txt("proxy_name", "Nom du signataire mandaté")}</div>}
        </>
      ) : (
        <>
          <Field label="Civilité">
            <Choice options={["M.", "Mme"]} value={d.civility ?? ""} onChange={(v) => setD({ civility: v })} />
          </Field>
          <Field label="Prénom et nom">
            <Input value={draft.owner_name ?? ""} onChange={(e) => set({ owner_name: e.target.value })} />
          </Field>
          <div className="sm:col-span-2">{txt("address", "Adresse du propriétaire")}</div>
        </>
      )}
      <Field label="Email">
        <Input type="email" value={draft.owner_email ?? ""} onChange={(e) => set({ owner_email: e.target.value })} />
      </Field>
      <Field label="Téléphone">
        <Input type="tel" value={draft.owner_phone ?? ""} onChange={(e) => set({ owner_phone: e.target.value })} />
      </Field>
    </div>
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
  const qc = useQueryClient();
  const createMandate = useMutation({
    mutationFn: async () => {
      let { data: m } = await supabase.from("mandates").select("number, number_suffix").eq("asset_id", asset.id).maybeSingle();
      if (!m) {
        const { data: me } = await supabase.auth.getUser();
        const { data: agent } = await supabase.from("commercial_agents").select("id").eq("user_id", me.user?.id ?? "").maybeSingle();
        const { data: inserted, error } = await supabase.from("mandates")
          .insert({ asset_id: asset.id, asset_title: asset.title, agent_id: agent?.id ?? null })
          .select("number, number_suffix").single();
        if (error) throw error;
        m = inserted;
      }
      const ref = `${m.number}${m.number_suffix ? ` ${m.number_suffix}` : ""}`;
      const { error } = await supabase.from("assets").update({ reference: ref }).eq("id", asset.id);
      if (error) throw error;
      return ref;
    },
    onSuccess: (ref) => { toast.success(`Mandat N° ${ref} créé`); void qc.invalidateQueries({ queryKey: ["assets"] }); },
    onError: (e: Error) => toast.error(e.message),
  });
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
        {!asset.reference && (
          <Button variant="outline" disabled={createMandate.isPending} onClick={() => createMandate.mutate()}>
            <FileSignature className="size-4" /> Créer le mandat
          </Button>
        )}
      </div>
      <RecordFacts
        facts={[
          ["Mandat / Référence", asset.reference],
          ["Type", [asset.asset_class, asset.asset_subclass].filter(Boolean).join(" · ") || null],
          ...((asset.is_portfolio ? (asset.portfolio_lots ?? []) : []).map((l, i) => [`Bien ${i + 1}`, [[l.address, l.postal_code, l.city].filter(Boolean).join(" "), l.asset_class, l.surface ? `${l.surface} m²` : "", l.tenant, l.rent ? formatEUR(l.rent) : ""].filter(Boolean).join(" · ")] as [string, string | null])),
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
          ...Object.entries(asset.residential_details ?? {}).map(([key,value]) => [RESIDENTIAL_LABELS[key] || key, value == null ? null : String(value)] as [string, string | null]),
          ["Propriétaire", asset.owner_kind === "morale" ? mandantText("morale", asset.owner_name, asset.owner_details ?? {}) : asset.owner_name],
          ["Surface pondérée (m²)", asset.weighted_surface == null ? null : String(asset.weighted_surface)],
          ["Surface extérieure (m²)", asset.outdoor_surface == null ? null : String(asset.outdoor_surface)],
          ["Parkings", asset.parking_count == null ? null : String(asset.parking_count)],
          ["Email propriétaire", asset.owner_email],
          ["Téléphone propriétaire", asset.owner_phone],
          ["Type de mandat", asset.mandate_type],
          ["Honoraires", [feeText(asset.fee_mode, asset.fee_value), feeChargeText(asset.fee_payer)].filter(Boolean).join(", ")],
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
