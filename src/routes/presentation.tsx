import { AgentSelect, useAgentFilter } from "@/components/AgentFilter";
import { useAuth } from "@/hooks/useAuth";
import { CompactRow } from "@/components/CompactRow";
import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense, useMemo } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { openDocument, safeFileName } from "@/lib/documents";

const BrochureBuilder = lazy(() =>
  import("@/components/brochure/BrochureBuilder").then((m) => ({ default: m.BrochureBuilder })),
);

export const Route = createFileRoute("/presentation")({
  validateSearch: (s: Record<string, unknown>): { asset?: string | undefined } => ({
    asset: typeof s["asset"] === "string" ? s["asset"] : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Teasers — brochures de vente — Walls Brokerage CRM" },
      {
        name: "description",
        content: "Générez étape par étape la brochure de vente PowerPoint d'un actif.",
      },
      { property: "og:title", content: "Teasers — Walls Brokerage CRM" },
      { property: "og:description", content: "Génération des brochures de vente par étapes." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <PresentationPage />
    </AppLayout>
  ),
});

const fr = (n: number | null | undefined) =>
  n == null ? "" : new Intl.NumberFormat("fr-FR").format(n);

function PresentationPage() {
  const { canEdit } = useAuth();
  const { asset: assetId } = Route.useSearch();
  const navigate = Route.useNavigate();
  const qc = useQueryClient();
  const af = useAgentFilter();

  const assets = useQuery({
    queryKey: ["presentation-assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select(
          "id, owner_id, title, city, surface, price, asset_class, description, address, postal_code, rent, transaction_type",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const asset = assets.data?.find((a) => a.id === assetId);

  const history = useQuery({
    queryKey: ["presentation-history", assetId],
    enabled: Boolean(assetId),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_documents")
        .select("id, path, name, created_at")
        .eq("asset_id", assetId!)
        .like("name", "Brochure_%")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const cover = useQuery({
    queryKey: ["presentation-cover", assetId],
    enabled: Boolean(assetId),
    queryFn: async () => {
      const { data } = await supabase
        .from("asset_documents")
        .select("path, name")
        .eq("asset_id", assetId!)
        .eq("category", "photo")
        .like("name", "Photo principale%")
        .limit(1)
        .maybeSingle();
      if (!data) return null;
      const { data: blob } = await supabase.storage.from("brochures").download(data.path);
      if (!blob) return null;
      const dataUrl = await new Promise<string>((res) => {
        const r = new FileReader();
        r.onload = () => res(String(r.result));
        r.readAsDataURL(blob);
      });
      return { dataUrl, name: data.name };
    },
  });

  const planImages = useQuery({
    queryKey: ["presentation-plans", assetId],
    enabled: Boolean(assetId),
    queryFn: async () => {
      const { data } = await supabase
        .from("asset_documents")
        .select("path, name")
        .eq("asset_id", assetId!)
        .eq("category", "plan")
        .order("sort_order");
      const { pdfToImages } = await import("@/lib/pdf-to-images");
      const out: { dataUrl: string; name: string; title: string }[] = [];
      for (const d of data ?? []) {
        const { data: blob } = await supabase.storage.from("brochures").download(d.path);
        if (!blob) continue;
        const base = d.name.replace(/\.pdf$/i, "");
        try {
          const pages = await pdfToImages(await blob.arrayBuffer());
          pages.forEach((dataUrl, i) =>
            out.push({ dataUrl, name: `${base}-p${i + 1}.jpg`, title: pages.length > 1 ? `Plan — ${base} (${i + 1})` : `Plan — ${base}` }),
          );
        } catch (e) {
          console.warn("Plan illisible", d.name, e);
        }
      }
      return out;
    },
  });

  const seed = useMemo(
    () =>
      asset
        ? {
            nomSite: asset.title,
            ville: asset.city ?? "",
            typeBien: asset.asset_class ?? "",
            surface: fr(asset.surface),
            prixVente: fr(asset.price),
            adresse: asset.address ?? "",
            codePostal: asset.postal_code ?? "",
            loyerAnnuel: fr(asset.rent),
            typeVente: asset.transaction_type ?? "",
            ...(cover.data ? { photoCouverture: cover.data } : {}),
            ...(planImages.data?.length ? { plans: planImages.data } : {}),
          }
        : undefined,
    [asset, cover.data, planImages.data],
  );

  const onGenerated = async (base64: string, filename: string) => {
    if (!assetId) return;
    const bin = atob(base64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, "");
    const name = `${filename.replace(/\.pptx$/i, "")}_${stamp}.pptx`;
    const path = `assets/${assetId}/${crypto.randomUUID()}-${safeFileName(name)}`;
    const { error } = await supabase.storage.from("brochures").upload(path, new Blob([bytes]), {
      contentType: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    });
    if (error) throw error;
    const { count } = await supabase
      .from("asset_documents")
      .select("id", { count: "exact", head: true })
      .eq("asset_id", assetId);
    const { error: e2 } = await supabase
      .from("asset_documents")
      .insert({ asset_id: assetId, path, name, sort_order: count ?? 0 });
    if (e2) throw e2;
    toast.success("Brochure enregistrée dans l'actif");
    qc.invalidateQueries({ queryKey: ["presentation-history", assetId] });
  };

  const remove = async (id: string, path: string) => {
    await supabase.from("asset_documents").delete().eq("id", id);
    await supabase.storage.from("brochures").remove([path]);
    qc.invalidateQueries({ queryKey: ["presentation-history", assetId] });
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Teasers</h1>
        <AgentSelect f={af} />
        <p className="text-sm text-muted-foreground">
          Choisissez un actif puis générez sa brochure étape par étape.
        </p>
      </div>
      {!assetId && (
        <div className="overflow-hidden border-y border-border">
          {(assets.data ?? []).filter((a) => af.keep(a.owner_id)).map((a) => (
            <CompactRow
              key={a.id}
              title={[a.city, a.title].filter(Boolean).join(" · ")}
              subtitle={a.asset_class}
              onOpen={() => navigate({ search: { asset: a.id } })}
              onEdit={canEdit ? () => navigate({ search: { asset: a.id } }) : undefined}
            />
          ))}
        </div>
      )}
      {assetId && (
        <Select value={assetId} onValueChange={(v) => navigate({ search: { asset: v } })}>
          <SelectTrigger className="h-11 w-full max-w-xl">
            <SelectValue placeholder="Choisir un actif" />
          </SelectTrigger>
          <SelectContent>
            {(assets.data ?? []).filter((a) => af.keep(a.owner_id)).map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.title}
                {a.city ? ` — ${a.city}` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}

      {assetId && (
        <div className="rounded-lg border p-3">
          <div className="mb-2 text-sm font-semibold">Brochures générées</div>
          {history.data?.length ? (
            <ul className="space-y-1">
              {history.data.map((d) => (
                <CompactRow
                  key={d.id}
                  title={d.name}
                  subtitle={new Date(d.created_at).toLocaleString("fr-FR")}
                  onOpen={() => void openDocument(d.path)}
                  onEdit={
                    canEdit
                      ? () => {
                          document
                            .querySelector("[data-brochure-editor]")
                            ?.scrollIntoView({ behavior: "smooth" });
                        }
                      : undefined
                  }
                  onDelete={canEdit ? () => void remove(d.id, d.path) : undefined}
                  trailing={
                    <Button
                      size="icon"
                      variant="ghost"
                      className="size-11"
                      aria-label={`Télécharger ${d.name}`}
                      title="Télécharger"
                      onClick={() => void openDocument(d.path)}
                    >
                      <Download className="size-4" />
                    </Button>
                  }
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Aucune brochure pour cet actif.</p>
          )}
        </div>
      )}

      {assetId && asset && !cover.isLoading && !cover.data && (
        <p className="panel p-4 text-sm">
          Ajoutez la <strong>photo principale</strong> dans la fiche de l'actif (étape Photos) pour créer la brochure.
        </p>
      )}
      {assetId && asset && !cover.isLoading && cover.data && (
        <div data-brochure-editor className="min-w-0">
          <ClientOnly>
            <Suspense fallback={<Loader2 className="m-6 h-6 w-6 animate-spin" />}>
              <BrochureBuilder {...(seed ? { seed } : {})} onGenerated={onGenerated} />
            </Suspense>
          </ClientOnly>
        </div>
      )}
    </div>
  );
}
