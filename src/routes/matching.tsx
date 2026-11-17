import { AgentSelect, useAgentFilter } from "@/components/AgentFilter";
import { useAuth } from "@/hooks/useAuth";
import { CompactRow } from "@/components/CompactRow";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Mail, Pencil, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InvestorForm, investorPayload, type InvestorDraft } from "@/components/InvestorForm";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { brochureFileName, formatThousands, parseThousands } from "@/lib/format";
import { fetchAssetDocuments, uploadDocument } from "@/lib/documents";
import { AppLayout } from "@/components/AppLayout";
import { CampaignDialog } from "@/components/CampaignDialog";
import { subjectFor } from "@/lib/subject";
import { CopyEmail } from "@/components/CopyEmail";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_CLASSES, REGIONS, STRATEGIES, formatEUR } from "@/lib/taxonomy";
import { matchInvestor, type Asset, type Criteria, type Investor } from "@/lib/types";

export const Route = createFileRoute("/matching")({
  validateSearch: (search: Record<string, unknown>): { asset?: string } =>
    typeof search["asset"] === "string" ? { asset: search["asset"] as string } : {},
  head: () => ({
    meta: [
      { title: "Matching investisseurs — Walls Brokerage CRM" },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      {
        name: "description",
        content:
          "Saisissez un actif et obtenez instantanément la liste des investisseurs à qui envoyer la brochure de vente.",
      },
      { property: "og:title", content: "Matching investisseurs — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Trouvez en un clic les acquéreurs dont le profil correspond à votre actif.",
      },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <MatchingPage />
    </AppLayout>
  ),
});

const ANY = "__any__";

type InvestorCriterion = {
  investor_id: string;
  asset_class: string;
  amount_bands: string[];
};

const displayInvestorName = (investor: Investor) => {
  const firstName = (investor.first_name ?? "").trim();
  const lastName = investor.full_name.trim();
  if (!firstName) return lastName || "—";
  if (lastName.toLocaleLowerCase("fr").startsWith(firstName.toLocaleLowerCase("fr"))) {
    return lastName;
  }
  return `${firstName} ${lastName}`.trim();
};

function MatchingPage() {
  const { canEdit } = useAuth();
  const { asset: assetParam } = Route.useSearch();
  const [criteria, setCriteria] = useState<Criteria>({
    price: null,
    yield_pct: null,
    asset_class: null,
    strategy: null,
    region: null,
  });
  const [assetId, setAssetId] = useState<string | null>(null);
  const [strict, setStrict] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [brochure, setBrochure] = useState<File | null>(null);
  const [prefilled, setPrefilled] = useState(false);
  const [savingBrochure, setSavingBrochure] = useState(false);
  const queryClient = useQueryClient();
  const af = useAgentFilter();
  const [editing, setEditing] = useState<InvestorDraft | null>(null);
  const [savingInvestor, setSavingInvestor] = useState(false);
  const saveInvestor = async (draft: InvestorDraft) => {
    if (!draft.id) return;
    setSavingInvestor(true);
    const { error } = await supabase
      .from("investors")
      .update(investorPayload(draft))
      .eq("id", draft.id);
    setSavingInvestor(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["investors"] });
    setEditing(null);
    toast.success("Profil enregistré");
  };
  const deleteInvestor = async (investor: Investor) => {
    const { error } = await supabase.from("investors").delete().eq("id", investor.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await queryClient.invalidateQueries({ queryKey: ["investors"] });
    toast.success("Investisseur supprimé");
  };

  const investorsQuery = useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await supabase.from("investors").select("*").order("full_name");
      if (error) throw error;
      return data as unknown as Investor[];
    },
  });

  const assetsQuery = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .neq("status", "prospection")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Asset[];
    },
  });

  const criteriaQuery = useQuery({
    queryKey: ["investor-criteria", "matching"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investor_criteria")
        .select("investor_id, asset_class, amount_bands");
      if (error) throw error;
      return data as InvestorCriterion[];
    },
  });

  const bandsByInvestor = useMemo(() => {
    const map = new Map<string, Set<string>>();
    for (const row of criteriaQuery.data ?? []) {
      if (criteria.asset_class && row.asset_class !== criteria.asset_class) continue;
      const bands = map.get(row.investor_id) ?? new Set<string>();
      for (const band of row.amount_bands ?? []) bands.add(band);
      map.set(row.investor_id, bands);
    }
    return map;
  }, [criteria.asset_class, criteriaQuery.data]);

  const results = useMemo(() => {
    const investors = (investorsQuery.data ?? []).filter((i) => af.keep((i as { owner_id?: string | null }).owner_id));
    return investors
      .map((i) => matchInvestor(i, criteria))
      .filter((r) => (strict ? r.misses.length === 0 : true))
      .sort((a, b) => b.score - a.score || b.reasons.length - a.reasons.length);
  }, [investorsQuery.data, criteria, strict, af.agent]);

  // Sélection : par défaut tous les investisseurs trouvés sont cochés.
  const visibleIds = useMemo(() => results.map((r) => r.investor.id), [results]);
  const isSelected = (id: string) => !selected.has(`-${id}`);
  const toggle = (id: string) => {
    const next = new Set(selected);
    const key = `-${id}`;
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setSelected(next);
  };
  const allSelected = visibleIds.every((id) => isSelected(id)) && visibleIds.length > 0;
  const toggleAll = () => {
    setSelected(allSelected ? new Set(visibleIds.map((id) => `-${id}`)) : new Set());
  };

  const toggleGroup = (ids: string[], on: boolean) => {
    const next = new Set(selected);
    for (const id of ids) {
      if (on) next.delete(`-${id}`);
      else next.add(`-${id}`);
    }
    setSelected(next);
  };
  const [openGroups, setOpenGroups] = useState<Set<string>>(new Set());
  // Une société = un bloc ; ses collaborateurs sont cochables un par un.
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; items: typeof results }>();
    for (const r of results) {
      const name = (r.investor.company ?? "").trim();
      const key = name ? `c:${name.toLocaleLowerCase("fr")}` : `i:${r.investor.id}`;
      const g = map.get(key) ?? { key, name: name || displayInvestorName(r.investor), items: [] };
      g.items.push(r);
      map.set(key, g);
    }
    return [...map.values()];
  }, [results]);

  const chosen = results.filter((r) => isSelected(r.investor.id));
  const emails = chosen.map((r) => r.investor.email).filter((e): e is string => Boolean(e));
  const asset = (assetsQuery.data ?? []).find((a) => a.id === assetId) ?? null;
  const storedBrochureName =
    asset?.brochure_url && !/^https?:\/\//.test(asset.brochure_url)
      ? brochureFileName(asset.brochure_url)
      : (asset?.brochure_url ?? null);
  const assetDocumentsQuery = useQuery({
    queryKey: ["asset-documents", asset?.id],
    queryFn: () => fetchAssetDocuments(asset!.id),
    enabled: Boolean(asset?.id),
  });
  const documentNames = (assetDocumentsQuery.data ?? []).map((d) => d.name);

  const applyAsset = (id: string) => {
    setSelected(new Set());
    if (id === ANY) {
      setAssetId(null);
      return;
    }
    const found = (assetsQuery.data ?? []).find((a) => a.id === id);
    if (!found) return;
    setAssetId(id);
    setCriteria({
      price: found.price,
      yield_pct: found.yield_pct,
      asset_class: found.asset_class,
      strategy: found.strategy,
      region: found.region,
    });
  };

  useEffect(() => {
    if (prefilled || !assetParam) return;
    const found = (assetsQuery.data ?? []).find((a) => a.id === assetParam);
    if (!found) return;
    setPrefilled(true);
    applyAsset(assetParam);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assetParam, assetsQuery.data, prefilled]);

  const logSends = async () => {
    if (!assetId || !asset) {
      toast.error("Sélectionnez un actif enregistré pour tracer l'envoi.");
      return;
    }
    const rows = chosen.map((r) => ({
      asset_id: assetId,
      investor_id: r.investor.id,
      email_to: r.investor.email,
      subject: subjectFor(asset),
      channel: "email",
      status: "envoyé",
    }));
    if (rows.length === 0) return;
    const { error } = await supabase.from("brochure_sends").insert(rows);
    if (error) toast.error(error.message);
    else toast.success(`${rows.length} envoi(s) enregistré(s) et horodaté(s)`);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Moteur de rapprochement</p>
        <h1 className="mt-1 text-3xl">Quel actif souhaitez-vous placer&nbsp;?</h1>
        <AgentSelect f={af} />
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Renseignez les caractéristiques de l'actif : l'outil interroge la base et affiche les
          investisseurs dont le profil correspond.
        </p>
      </div>

      <div className="panel p-4 sm:p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-3">
            <Label>Pré-remplir depuis un actif enregistré</Label>
            <Select value={assetId ?? ANY} onValueChange={applyAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un dossier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Choisir un dossier</SelectItem>
                {(assetsQuery.data ?? []).filter((a) => af.keep((a as { owner_id?: string | null }).owner_id)).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title} {a.city ? `— ${a.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="price">Prix (€)</Label>
            <Input
              id="price"
              inputMode="numeric"
              value={formatThousands(criteria.price)}
              onChange={(e) => setCriteria({ ...criteria, price: parseThousands(e.target.value) })}
              placeholder="2 500 000"
            />
          </div>
          <SelectField
            label="Classe d'actif"
            options={ASSET_CLASSES}
            value={criteria.asset_class}
            onChange={(v) => setCriteria({ ...criteria, asset_class: v })}
          />
          <SelectField
            label="Stratégie investisseur"
            options={STRATEGIES}
            value={criteria.strategy}
            onChange={(v) => setCriteria({ ...criteria, strategy: v })}
          />
          <SelectField
            label="Région"
            options={REGIONS}
            value={criteria.region}
            onChange={(v) => setCriteria({ ...criteria, region: v })}
          />
          <div className="flex items-end">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                setAssetId(null);
                setCriteria({
                  price: null,
                  yield_pct: null,
                  asset_class: null,
                  strategy: null,
                  region: null,
                });
              }}
            >
              Réinitialiser
            </Button>
          </div>

          <div className="space-y-2 lg:col-span-3">
            <Label htmlFor="brochure-upload">Upload brochure (PDF, 9 Mo max.)</Label>
            <Input
              id="brochure-upload"
              type="file"
              accept="application/pdf"
              onChange={async (e) => {
                const f = e.target.files?.[0] ?? null;
                if (f && f.size > 9 * 1024 * 1024) {
                  toast.error("La brochure ne doit pas dépasser 9 Mo.");
                  e.target.value = "";
                  setBrochure(null);
                  return;
                }
                setBrochure(f);
                if (f && asset) {
                  setSavingBrochure(true);
                  try {
                    const uploaded = await uploadDocument(`actifs/${asset.id}`, f);
                    const existing = await fetchAssetDocuments(asset.id);
                    const { error: docError } = await supabase.from("asset_documents").insert({
                      asset_id: asset.id,
                      path: uploaded.path,
                      name: uploaded.name,
                      sort_order: existing.length,
                    });
                    if (docError) throw docError;
                    if (existing.length === 0) {
                      const { error } = await supabase
                        .from("assets")
                        .update({ brochure_url: uploaded.path })
                        .eq("id", asset.id);
                      if (error) throw error;
                    }
                    await queryClient.invalidateQueries({ queryKey: ["assets"] });
                    await queryClient.invalidateQueries({
                      queryKey: ["asset-documents", asset.id],
                    });
                    setBrochure(null);
                    toast.success("Document enregistré sur l'actif");
                  } catch (err) {
                    toast.error(
                      err instanceof Error
                        ? err.message
                        : "Échec de l'enregistrement de la brochure",
                    );
                  } finally {
                    setSavingBrochure(false);
                  }
                }
              }}
            />
            <p className="text-xs text-muted-foreground">
              {savingBrochure
                ? "Enregistrement du document…"
                : documentNames.length > 0
                  ? `Documents joints automatiquement : ${documentNames.join(", ")}.`
                  : brochure
                    ? `Brochure prête : ${brochure.name} — le bouton « Envoyer la brochure » est activé.`
                    : storedBrochureName
                      ? `Brochure déjà associée à cet actif : ${storedBrochureName} — elle sera envoyée automatiquement.`
                      : "Ajoutez un ou plusieurs documents pour les joindre à l'envoi."}
            </p>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center">
        <h2 className="min-w-0 text-xl">
          {results.length} investisseur{results.length > 1 ? "s" : ""} ciblé
          {results.length > 1 ? "s" : ""}
          <span className="ml-2 text-sm text-muted-foreground">
            {chosen.length} sélectionné{chosen.length > 1 ? "s" : ""}
          </span>
        </h2>
        <div className="grid grid-cols-1 gap-2 sm:ml-auto sm:flex sm:flex-wrap">
          <Button variant="ghost" size="sm" disabled={results.length === 0} onClick={toggleAll}>
            {allSelected ? "Tout décocher" : "Tout cocher"}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setStrict(!strict)}>
            {strict ? "Voir aussi les correspondances partielles" : "Correspondances strictes"}
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={emails.length === 0}
            onClick={() => {
              navigator.clipboard.writeText(emails.join("; "));
              toast.success("Emails copiés");
            }}
          >
            <Copy className="size-4" /> Copier les emails
          </Button>
          <Button variant="outline" size="sm" disabled={chosen.length === 0} onClick={logSends}>
            <Mail className="size-4" /> Tracer un envoi manuel
          </Button>
          <CampaignDialog
            asset={asset}
            brochure={brochure}
            recipients={chosen.map((r) => r.investor)}
            onLaunched={() => {
              setSelected(new Set());
            }}
          />
        </div>
      </div>

      <div className="grid gap-3">
        {investorsQuery.isLoading && (
          <p className="text-sm text-muted-foreground">Chargement de la base…</p>
        )}
        {!investorsQuery.isLoading && results.length === 0 && (
          <div className="panel p-8 text-center text-sm text-muted-foreground">
            Aucun investisseur ne correspond à ces critères.
          </div>
        )}
        {groups.map((g) => {
          const row = ({ investor, score }: (typeof results)[number], nested = false) => (
            <CompactRow
              key={investor.id}
              title={displayInvestorName(investor)}
              subtitle={[nested ? investor.job_title : investor.company, investor.city, investor.email].filter(Boolean).join(" · ")}
              summary={`${score}%`}
              leading={
                <Checkbox
                  checked={isSelected(investor.id)}
                  onCheckedChange={() => toggle(investor.id)}
                  aria-label={`Sélectionner ${displayInvestorName(investor)}`}
                />
              }
              onOpen={() => setEditing({ ...investor })}
              onEdit={canEdit ? () => setEditing({ ...investor }) : undefined}
              onDelete={canEdit ? () => void deleteInvestor(investor) : undefined}
            />
          );
          if (g.items.length === 1) return row(g.items[0]!);
          const ids = g.items.map((r) => r.investor.id);
          const count = ids.filter(isSelected).length;
          const open = openGroups.has(g.key);
          return (
            <div key={g.key} className="panel p-2">
              <div className="flex min-h-11 items-center gap-3 px-1">
                <Checkbox
                  checked={count === ids.length ? true : count === 0 ? false : "indeterminate"}
                  onCheckedChange={() => toggleGroup(ids, count !== ids.length)}
                  aria-label={`Sélectionner toute la société ${g.name}`}
                />
                <button
                  type="button"
                  className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
                  onClick={() => {
                    const next = new Set(openGroups);
                    if (open) next.delete(g.key);
                    else next.add(g.key);
                    setOpenGroups(next);
                  }}
                >
                  <span className="truncate font-semibold">{g.name}</span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {count}/{ids.length} collaborateur{ids.length > 1 ? "s" : ""} {open ? "▲" : "▼"}
                  </span>
                </button>
              </div>
              {open && <div className="mt-2 grid gap-2 pl-3">{g.items.map((r) => row(r, true))}</div>}
            </div>
          );
        })}
      </div>
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="flex max-h-[96dvh] max-w-xl flex-col overflow-hidden sm:max-h-[90vh] sm:w-[calc(100%-2rem)]">
          <DialogHeader>
            <DialogTitle>Modifier le profil</DialogTitle>
          </DialogHeader>
          {editing && (
            <InvestorForm
              draft={editing}
              onChange={setEditing}
              onSubmit={() => void saveInvestor(editing)}
              saving={savingInvestor}
              submitLabel="Valider les modifications"
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SelectField({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly string[];
  value: string | null;
  onChange: (v: string | null) => void;
}) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value ?? ANY} onValueChange={(v) => onChange(v === ANY ? null : v)}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ANY}>Indifférent</SelectItem>
          {options.map((o) => (
            <SelectItem key={o} value={o}>
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
