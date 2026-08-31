import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Copy, Mail, Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_CLASSES, REGIONS, STRATEGIES, formatEUR } from "@/lib/taxonomy";
import { matchInvestor, type Asset, type Criteria, type Investor } from "@/lib/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Matching investisseurs — Walls Brokerage CRM" },
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
    <AppLayout>
      <MatchingPage />
    </AppLayout>
  ),
});

const ANY = "__any__";

function MatchingPage() {
  const [criteria, setCriteria] = useState<Criteria>({
    price: null,
    yield_pct: null,
    asset_class: null,
    strategy: null,
    region: null,
  });
  const [assetId, setAssetId] = useState<string | null>(null);
  const [strict, setStrict] = useState(true);

  const investorsQuery = useQuery({
    queryKey: ["investors"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .order("full_name");
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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as unknown as Asset[];
    },
  });

  const results = useMemo(() => {
    const investors = investorsQuery.data ?? [];
    return investors
      .map((i) => matchInvestor(i, criteria))
      .filter((r) => (strict ? r.misses.length === 0 : true))
      .sort((a, b) => b.score - a.score || b.reasons.length - a.reasons.length);
  }, [investorsQuery.data, criteria, strict]);

  const emails = results
    .map((r) => r.investor.email)
    .filter((e): e is string => Boolean(e));

  const applyAsset = (id: string) => {
    if (id === ANY) {
      setAssetId(null);
      return;
    }
    const asset = (assetsQuery.data ?? []).find((a) => a.id === id);
    if (!asset) return;
    setAssetId(id);
    setCriteria({
      price: asset.price,
      yield_pct: asset.yield_pct,
      asset_class: asset.asset_class,
      strategy: asset.strategy,
      region: asset.region,
    });
  };

  const logSends = async () => {
    if (!assetId) {
      toast.error("Sélectionnez un actif enregistré pour tracer l'envoi.");
      return;
    }
    const rows = results.map((r) => ({ asset_id: assetId, investor_id: r.investor.id }));
    if (rows.length === 0) return;
    const { error } = await supabase.from("brochure_sends").insert(rows);
    if (error) toast.error(error.message);
    else toast.success(`${rows.length} envoi(s) enregistré(s)`);
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Moteur de rapprochement</p>
        <h1 className="mt-1 text-3xl">Quel actif souhaitez-vous placer&nbsp;?</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Renseignez les caractéristiques de l'actif : l'outil interroge la base et affiche les
          investisseurs dont le profil correspond.
        </p>
      </div>

      <div className="panel p-6">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="space-y-2 lg:col-span-3">
            <Label>Pré-remplir depuis un actif enregistré</Label>
            <Select value={assetId ?? ANY} onValueChange={applyAsset}>
              <SelectTrigger>
                <SelectValue placeholder="Saisie libre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ANY}>Saisie libre</SelectItem>
                {(assetsQuery.data ?? []).map((a) => (
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
              type="number"
              value={criteria.price ?? ""}
              onChange={(e) =>
                setCriteria({ ...criteria, price: e.target.value ? Number(e.target.value) : null })
              }
              placeholder="2 500 000"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="yield">Rendement (%)</Label>
            <Input
              id="yield"
              type="number"
              step="0.1"
              value={criteria.yield_pct ?? ""}
              onChange={(e) =>
                setCriteria({
                  ...criteria,
                  yield_pct: e.target.value ? Number(e.target.value) : null,
                })
              }
              placeholder="6.5"
            />
          </div>
          <SelectField
            label="Classe d'actif"
            options={ASSET_CLASSES}
            value={criteria.asset_class}
            onChange={(v) => setCriteria({ ...criteria, asset_class: v })}
          />
          <SelectField
            label="Stratégie"
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
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-xl">
          {results.length} investisseur{results.length > 1 ? "s" : ""} ciblé
          {results.length > 1 ? "s" : ""}
        </h2>
        <div className="ml-auto flex flex-wrap gap-2">
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
          <Button
            variant="outline"
            size="sm"
            disabled={emails.length === 0}
            onClick={() => {
              window.location.href = `mailto:?bcc=${encodeURIComponent(emails.join(","))}`;
            }}
          >
            <Mail className="size-4" /> Envoyer la brochure
          </Button>
          <Button size="sm" disabled={results.length === 0} onClick={logSends}>
            <Send className="size-4" /> Tracer l'envoi
          </Button>
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
        {results.map(({ investor, score, reasons, misses }) => (
          <div key={investor.id} className="panel flex flex-wrap items-center gap-4 p-4">
            <div className="min-w-56 flex-1">
              <p className="font-medium">{investor.full_name}</p>
              <p className="text-sm text-muted-foreground">
                {[investor.company, investor.city].filter(Boolean).join(" · ") || "—"}
              </p>
              <p className="text-sm text-muted-foreground">{investor.email ?? "sans email"}</p>
            </div>
            <div className="text-sm text-muted-foreground">
              {formatEUR(investor.budget_min)} – {formatEUR(investor.budget_max)}
            </div>
            <div className="flex flex-wrap gap-1">
              {reasons.map((r) => (
                <Badge key={r} variant="secondary">
                  {r}
                </Badge>
              ))}
              {misses.map((m) => (
                <Badge key={m} variant="outline" className="text-muted-foreground line-through">
                  {m}
                </Badge>
              ))}
            </div>
            <div className="w-14 text-right font-display text-lg">{score}%</div>
          </div>
        ))}
      </div>
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
