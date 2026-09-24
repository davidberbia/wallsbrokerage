import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Upload } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { Database } from "@/integrations/supabase/types";

type Row = Database["public"]["Tables"]["comparables"]["Row"];
type Kind = "location" | "vente";

export const Route = createFileRoute("/comparables")({
  head: () => ({
    meta: [
      { title: "Comparables location et vente — Walls Brokerage CRM" },
      { name: "description", content: "Base de comparables locatifs et de prix, identique au Générateur de brochures." },
      { property: "og:title", content: "Comparables — Walls Brokerage CRM" },
      { property: "og:description", content: "Comparables de location et de vente." },
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

const num = (v: unknown) => {
  if (v === null || v === undefined || v === "") return NaN;
  const n = Number(String(v).replace(/\s/g, "").replace(",", ".").replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : NaN;
};
const fmt = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "";

type Field = keyof Row;
type Col = { key: Field; label: string; w: string; numeric?: boolean; computed?: (r: Row) => number; d?: number };

const LOC_COLS: Col[] = [
  { key: "deal_date", label: "Date", w: "w-28" },
  { key: "asset_class", label: "Type d'actif", w: "w-32" },
  { key: "enseigne", label: "Enseigne", w: "w-32" },
  { key: "postal_code", label: "Code postal", w: "w-20" },
  { key: "city", label: "Ville", w: "w-28" },
  { key: "address", label: "Adresse", w: "w-44" },
  { key: "surface", label: "Surface", w: "w-20", numeric: true },
  { key: "weighted_surface", label: "Surface pondérée", w: "w-20", numeric: true },
  { key: "rent", label: "Loyer/an", w: "w-24", numeric: true },
  { key: "rent_m2", label: "€/m²", w: "w-20", numeric: true, computed: (r) => num(r.rent) / num(r.surface) },
  { key: "rent_m2_weighted", label: "Loyer/m²p", w: "w-20", numeric: true, computed: (r) => num(r.rent) / num(r.weighted_surface) },
];
const SALE_COLS: Col[] = [
  { key: "deal_date", label: "Date", w: "w-28" },
  { key: "enseigne", label: "Enseignes", w: "w-40" },
  { key: "postal_code", label: "Code postal", w: "w-20" },
  { key: "city", label: "Ville", w: "w-28" },
  { key: "address", label: "Adresse", w: "w-44" },
  { key: "surface", label: "Surface totale", w: "w-20", numeric: true },
  { key: "rent", label: "Loyer annuel total", w: "w-24", numeric: true },
  { key: "rent_m2", label: "Loyer/m²", w: "w-20", numeric: true, computed: (r) => num(r.rent) / num(r.surface) },
  { key: "price", label: "Prix de vente", w: "w-28", numeric: true },
  { key: "price_m2", label: "Prix/m²", w: "w-20", numeric: true, computed: (r) => num(r.price) / num(r.surface) },
  { key: "yield_pct", label: "Rendement %", w: "w-20", numeric: true, d: 2, computed: (r) => (num(r.rent) / num(r.price)) * 100 },
];

function ComparablesPage() {
  const qc = useQueryClient();
  const { isBroker } = useAuth();
  const [kind, setKind] = useState<Kind>("location");
  const [search, setSearch] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["comparables"],
    queryFn: async () => {
      const { data, error } = await supabase.from("comparables").select("*").limit(5000);
      if (error) throw error;
      return data as Row[];
    },
  });

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lo = num(min), hi = num(max);
    return (data ?? [])
      .filter((c) => (c.kind === "location" ? "location" : "vente") === kind)
      .filter((c) => {
        if (!q) return true;
        const cp = (c.postal_code ?? "").trim();
        if (/^\d{1,3}$/.test(q) && q.length <= 2 && cp.slice(0, 2) === q.padStart(2, "0")) return true;
        return cp.toLowerCase().includes(q) || (c.city ?? "").toLowerCase().includes(q);
      })
      .filter((c) => {
        const v = kind === "location" ? num(c.surface) : num(c.price);
        if (Number.isFinite(lo) && (!Number.isFinite(v) || v < lo)) return false;
        if (Number.isFinite(hi) && (!Number.isFinite(v) || v > hi)) return false;
        return true;
      })
      .sort((a, b) => (b.deal_date ?? "").localeCompare(a.deal_date ?? ""));
  }, [data, kind, search, min, max]);

  const cols = kind === "location" ? LOC_COLS : SALE_COLS;
  const refresh = () => qc.invalidateQueries({ queryKey: ["comparables"] });

  const save = async (r: Row, key: Field, raw: string) => {
    const col = cols.find((c) => c.key === key)!;
    let value: string | number | null = raw.trim() === "" ? null : raw.trim();
    if (col.numeric && value !== null) value = Number.isFinite(num(value)) ? num(value) : null;
    if (key === "deal_date" && value) {
      const d = new Date(String(value));
      value = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (String(r[key] ?? "") === String(value ?? "")) return;
    const { error } = await supabase.from("comparables").update({ [key]: value } as never).eq("id", r.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const add = async () => {
    const { error } = await supabase
      .from("comparables")
      .insert({ kind, excerpt: "", source: "Saisie manuelle", deal_date: new Date().toISOString() });
    if (error) toast.error(error.message);
    else refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Supprimer ce comparable ?")) return;
    const { error } = await supabase.from("comparables").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  // Import d'un export JSON du Générateur de brochures (mêmes champs).
  const importFile = async (file: File) => {
    try {
      const parsed = JSON.parse(await file.text());
      const list: Record<string, string>[] = Array.isArray(parsed) ? parsed : parsed.comparables ?? parsed.items ?? [];
      const key = (c: { kind: string; enseigne: string | null; city: string | null; surface: number | null; deal_date: string | null }) =>
        [c.kind, c.enseigne ?? "", c.city ?? "", c.surface ?? "", (c.deal_date ?? "").slice(0, 10)].join("|").toLowerCase();
      const existing = new Set((data ?? []).map(key));
      const n = (v: unknown) => (Number.isFinite(num(v)) ? num(v) : null);
      const inserts = list
        .map((c) => {
          const d = c.dateSignature ? new Date(c.dateSignature) : null;
          return {
            kind: c.kind === "prix" ? "vente" : "location",
            asset_class: c.typeActif || null,
            enseigne: c.enseigne || null,
            postal_code: c.codePostal || null,
            city: c.ville || null,
            address: c.adresse || null,
            surface: n(c.surface),
            weighted_surface: n(c.surfacePonderee),
            rent: n(c.loyerAnnuel),
            rent_m2: n(c.loyerM2),
            rent_m2_weighted: n(c.loyerM2Pondere),
            price: n(c.prixVente),
            price_m2: n(c.prixM2),
            yield_pct: n(c.rendement),
            deal_date: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null,
            notes: c.notes || null,
            source: c.source || "Générateur de brochures",
            excerpt: "",
          };
        })
        .filter((c) => {
          const k = key(c);
          if (existing.has(k)) return false;
          existing.add(k);
          return true;
        });
      for (let i = 0; i < inserts.length; i += 200) {
        const { error } = await supabase.from("comparables").insert(inserts.slice(i, i + 200));
        if (error) throw error;
      }
      toast.success(`${inserts.length} comparable(s) importé(s), ${list.length - inserts.length} doublon(s) ignoré(s).`);
      refresh();
    } catch (e) {
      toast.error(`Import impossible : ${(e as Error).message}`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Comparables</h1>
          <p className="text-sm text-muted-foreground">
            Même configuration que le Générateur de brochures. {rows.length} résultat(s).
          </p>
        </div>
        {isBroker && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Importer (Générateur)
            </Button>
            <Button onClick={add}>
              <Plus className="size-4" /> Ajouter
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-1">
        {(["location", "vente"] as Kind[]).map((k) => (
          <Button key={k} variant={kind === k ? "default" : "outline"} size="sm" onClick={() => { setKind(k); setMin(""); setMax(""); }}>
            {k === "location" ? "Comparables locatifs" : "Comparables de prix"}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 rounded-sm border border-border bg-card p-3 sm:grid-cols-[1fr_auto]">
        <Input placeholder="Département (2 chiffres), code postal ou ville…" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs uppercase tracking-wide text-muted-foreground">
            {kind === "location" ? "Surface (m²)" : "Prix (€)"}
          </span>
          <Input className="w-28" placeholder="min" value={min} onChange={(e) => setMin(e.target.value)} />
          <span className="text-muted-foreground">—</span>
          <Input className="w-28" placeholder="max" value={max} onChange={(e) => setMax(e.target.value)} />
        </div>
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Chargement…</p>
      ) : (
        <div className="max-h-[70vh] overflow-auto rounded-sm border border-border">
          <table className="w-full text-xs">
            <thead className="sticky top-0 z-10 bg-muted text-muted-foreground">
              <tr>
                {cols.map((c) => (
                  <th key={c.key} className="px-2 py-2 text-left font-medium">{c.label}</th>
                ))}
                <th className="w-8" />
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} className="py-8 text-center text-muted-foreground">
                    Aucun comparable {search ? "ne correspond à la recherche" : "pour le moment"}.
                  </td>
                </tr>
              ) : (
                rows.map((r) => (
                  <tr key={r.id} className="border-t border-border align-top" title={r.excerpt || r.source || ""}>
                    {cols.map((c) => {
                      const stored = r[c.key];
                      const computed = c.computed ? c.computed(r) : NaN;
                      let val = "";
                      if (c.key === "deal_date") val = stored ? String(stored).slice(0, 10) : "";
                      else if (c.numeric) val = Number.isFinite(num(stored)) ? fmt(num(stored), c.d ?? 0) : fmt(computed, c.d ?? 0);
                      else val = (stored as string | null) ?? "";
                      return (
                        <td key={c.key} className="px-1 py-1">
                          <input
                            key={`${r.id}-${c.key}-${val}`}
                            type={c.key === "deal_date" ? "date" : "text"}
                            defaultValue={val}
                            readOnly={!isBroker}
                            onBlur={(e) => isBroker && save(r, c.key, c.numeric ? e.target.value.replace(/\s/g, "") : e.target.value)}
                            className={`${c.w} rounded-sm border border-transparent bg-transparent px-1 py-1 hover:border-border focus:border-ring focus:outline-none ${c.numeric ? "text-right font-mono" : ""} ${c.computed ? "font-semibold text-primary" : ""}`}
                          />
                        </td>
                      );
                    })}
                    <td className="px-1 py-1">
                      {isBroker && (
                        <button aria-label="Supprimer" onClick={() => remove(r.id)} className="p-1 text-destructive">
                          <Trash2 className="size-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
