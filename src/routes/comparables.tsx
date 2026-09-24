import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/comparables")({
  head: () => ({
    meta: [
      { title: "Comparables location et vente — Walls Brokerage CRM" },
      { name: "description", content: "Transactions et locations relevées automatiquement dans les newsletters et PDF reçus." },
      { property: "og:title", content: "Comparables — Walls Brokerage CRM" },
      { property: "og:description", content: "Comparables de location et de vente extraits de vos emails." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <ComparablesPage />
    </AppLayout>
  ),
});

const eur = (n: number) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

function ComparablesPage() {
  const [search, setSearch] = useState("");
  const [kind, setKind] = useState("tous");
  const [cls, setCls] = useState("toutes");
  const { data, isLoading } = useQuery({
    queryKey: ["comparables"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comparables")
        .select("*")
        .order("deal_date", { ascending: false, nullsFirst: false })
        .limit(2000);
      if (error) throw error;
      return data;
    },
  });
  const classes = useMemo(
    () => [...new Set((data ?? []).map((c) => c.asset_class).filter(Boolean) as string[])].sort(),
    [data],
  );
  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (data ?? []).filter(
      (c) =>
        (kind === "tous" || c.kind === kind) &&
        (cls === "toutes" || c.asset_class === cls) &&
        (!q || `${c.city ?? ""} ${c.address ?? ""} ${c.excerpt} ${c.source ?? ""}`.toLowerCase().includes(q)),
    );
  }, [data, search, kind, cls]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-2xl">Comparables</h1>
        <p className="text-sm text-muted-foreground">
          Relevés automatiquement dans vos newsletters et PDF reçus. {rows.length} résultat(s).
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-[1fr_160px_180px]">
        <Input placeholder="Ville, adresse, mot-clé…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <Select value={kind} onValueChange={setKind}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="tous">Location et vente</SelectItem>
            <SelectItem value="location">Location</SelectItem>
            <SelectItem value="vente">Vente</SelectItem>
          </SelectContent>
        </Select>
        <Select value={cls} onValueChange={setCls}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="toutes">Toutes classes</SelectItem>
            {classes.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : rows.length === 0 ? (
        <p className="rounded-sm border border-border p-6 text-center text-sm text-muted-foreground">
          Aucun comparable pour l'instant. Ils apparaîtront après les prochaines synchronisations.
        </p>
      ) : (
        <div className="space-y-2">
          {rows.map((c) => (
            <div key={c.id} className="rounded-sm border border-border bg-card p-3">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 text-sm">
                <span className={c.kind === "location" ? "status-pill status-en-veille" : "status-pill status-actif"}>
                  {c.kind === "location" ? "Location" : "Vente"}
                </span>
                <span className="font-semibold">{c.city ?? "Ville non détectée"}</span>
                {c.address && <span className="text-muted-foreground">{c.address}</span>}
                {c.asset_class && <span className="text-muted-foreground">· {c.asset_class}</span>}
                <span className="ml-auto font-mono text-xs text-muted-foreground">
                  {c.deal_date ? new Date(c.deal_date).toLocaleDateString("fr-FR") : ""}
                </span>
              </div>
              <div className="mt-1 flex flex-wrap gap-x-4 font-mono text-sm">
                {c.surface && <span>{Math.round(Number(c.surface)).toLocaleString("fr-FR")} m²</span>}
                {c.price && <span>{eur(Number(c.price))}</span>}
                {c.rent && <span>Loyer {eur(Number(c.rent))}/an</span>}
                {c.price_m2 && (
                  <span>{Math.round(Number(c.price_m2)).toLocaleString("fr-FR")} €/m²{c.kind === "location" ? "/an" : ""}</span>
                )}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">{c.excerpt}</p>
              {c.source && <p className="mt-1 text-xs text-muted-foreground">Source : {c.source}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
