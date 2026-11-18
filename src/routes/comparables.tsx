import { AcquisitionFields } from "@/components/AcquisitionFields";
import { CompactRow, RecordDialog } from "@/components/CompactRow";
import { comparableMetric } from "@/lib/comparable-metrics";
import { COMPARABLE_CLASSES, normalizeAssetClass } from "@/lib/comparable-classes";
import { Label } from "@/components/ui/label";
import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { extractComparablesFromFile } from "@/lib/comparables-import.functions";
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
      { title: "Comparables location et vente — Wallsbrokerage CRM" },
      {
        name: "description",
        content: "Base de comparables locatifs et de prix, identique au Générateur de brochures.",
      },
      { property: "og:title", content: "Comparables — Wallsbrokerage CRM" },
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
  const n = Number(
    String(v)
      .replace(/\s/g, "")
      .replace(",", ".")
      .replace(/[^\d.-]/g, ""),
  );
  return Number.isFinite(n) ? n : NaN;
};
const fmt = (n: number, d = 0) =>
  Number.isFinite(n) ? n.toLocaleString("fr-FR", { maximumFractionDigits: d }) : "";

type Field = keyof Row;
type Col = {
  key: Field;
  label: string;
  w: string;
  numeric?: boolean;
  computed?: (r: Row) => number;
  d?: number;
};

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
  {
    key: "rent_m2",
    label: "€/m²",
    w: "w-20",
    numeric: true,
    computed: (r) => num(r.rent) / num(r.surface),
  },
  {
    key: "rent_m2_weighted",
    label: "Loyer/m²p",
    w: "w-20",
    numeric: true,
    computed: (r) => num(r.rent) / num(r.weighted_surface),
  },
];
const SALE_COLS: Col[] = [
  { key: "deal_date", label: "Date", w: "w-28" },
  { key: "enseigne", label: "Enseignes", w: "w-40" },
  { key: "postal_code", label: "Code postal", w: "w-20" },
  { key: "city", label: "Ville", w: "w-28" },
  { key: "address", label: "Adresse", w: "w-44" },
  { key: "surface", label: "Surface totale", w: "w-20", numeric: true },
  { key: "rent", label: "Loyer annuel total", w: "w-24", numeric: true },
  {
    key: "rent_m2",
    label: "Loyer/m²",
    w: "w-20",
    numeric: true,
    computed: (r) => num(r.rent) / num(r.surface),
  },
  { key: "price", label: "Prix de vente", w: "w-28", numeric: true },
  {
    key: "price_m2",
    label: "Prix/m²",
    w: "w-20",
    numeric: true,
    computed: (r) => num(r.price) / num(r.surface),
  },
  {
    key: "yield_pct",
    label: "Rendement %",
    w: "w-20",
    numeric: true,
    d: 2,
    computed: (r) => (num(r.rent) / num(r.price)) * 100,
  },
];

function ComparablesPage() {
  const qc = useQueryClient();
  const { isBroker } = useAuth();
  const [detailId, setDetailId] = useState<string | null>(null);
  const [kind, setKind] = useState<Kind>("location");
  const [search, setSearch] = useState("");
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");
  const [fClass, setFClass] = useState("");
  const [fCity, setFCity] = useState("");
  const [fStreet, setFStreet] = useState("");
  const extractFile = useServerFn(extractComparablesFromFile);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["comparables", kind, fClass, fCity, fStreet],
    queryFn: async () => {
      let q = supabase.from("comparables").select("*");
      q = kind === "location" ? q.eq("kind", "location") : q.neq("kind", "location");
      if (fClass) q = q.eq("asset_class", fClass);
      if (fCity) q = q.eq("city", fCity);
      if (fStreet) q = q.eq("street", fStreet);
      const { data, error } = await q.order("deal_date", { ascending: false, nullsFirst: false }).limit(500);
      if (error) throw error;
      return data as Row[];
    },
  });

  const { data: facets } = useQuery({
    queryKey: ["comparable-facets"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("comparable_facets");
      if (error) throw error;
      return data ?? [];
    },
  });
  const sortFr = (a: string, b: string) => a.localeCompare(b, "fr");
  const uniq = (l: (string | null)[]) => [...new Set(l.filter(Boolean) as string[])].sort(sortFr);
  const classOpts: string[] = [...COMPARABLE_CLASSES];
  const cityOpts = uniq((facets ?? []).filter((f) => !fClass || f.asset_class === fClass).map((f) => f.city));
  const streetOpts = fCity
    ? uniq((facets ?? []).filter((f) => f.city === fCity && (!fClass || f.asset_class === fClass)).map((f) => f.street))
    : [];

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    const lo = num(min),
      hi = num(max);
    return (data ?? [])
      .filter((c) => {
        if (!q) return true;
        const cp = (c.postal_code ?? "").trim();
        if (/^\d{1,3}$/.test(q) && q.length <= 2 && cp.slice(0, 2) === q.padStart(2, "0"))
          return true;
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
    const col = [...LOC_COLS, ...SALE_COLS].find((c) => c.key === key);
    let value: string | number | null = raw.trim() === "" ? null : raw.trim();
    if (col?.numeric && value !== null) value = Number.isFinite(num(value)) ? num(value) : null;
    if (key === "deal_date" && value) {
      const d = new Date(String(value));
      value = Number.isNaN(d.getTime()) ? null : d.toISOString();
    }
    if (String(r[key] ?? "") === String(value ?? "")) return;
    const { error } = await supabase
      .from("comparables")
      .update({ [key]: value } as never)
      .eq("id", r.id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const add = async () => {
    const { error } = await supabase
      .from("comparables")
      .insert({
        kind,
        excerpt: "",
        source: "Saisie manuelle",
        deal_date: new Date().toISOString(),
      });
    if (error) toast.error(error.message);
    else refresh();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("comparables").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  // Import d'un export JSON du Générateur de brochures (mêmes champs).
  const importFile = async (file: File) => {
    try {
      type Src = {
        kind?: string;
        typeActif?: string;
        enseigne?: string;
        codePostal?: string;
        ville?: string;
        adresse?: string;
        surface?: string;
        surfacePonderee?: string;
        loyerAnnuel?: string;
        loyerM2?: string;
        loyerM2Pondere?: string;
        prixVente?: string;
        prixM2?: string;
        rendement?: string;
        dateSignature?: string;
        notes?: string;
        source?: string;
      };
      let list: Src[] = [];
      if (/\.(docx|pptx|pdf)$/i.test(file.name)) {
        if (file.size > 20_000_000) throw new Error("Fichier trop volumineux (20 Mo max)");
        const buf = new Uint8Array(await file.arrayBuffer());
        let bin = "";
        for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
        toast.info("Lecture du document…");
        list = (await extractFile({ data: { name: file.name, mime: file.type, base64: btoa(bin) } })) as Src[];
      } else if (/\.(xlsx|xlsm|xls|xlsb|csv)$/i.test(file.name)) {
        const XLSX = await import("xlsx");
        const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
        const norm = (s: string) =>
          s
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "")
            .toLowerCase();
        const pick = (h: string): keyof Src | null => {
          const n = norm(h);
          if (n.startsWith("type d")) return "typeActif";
          if (n.startsWith("enseigne") || n.startsWith("preneur") || n.startsWith("locataire")) return "enseigne";
          if (n === "cp" || n.startsWith("cp ")) return "codePostal";
          if (n.startsWith("commune")) return "ville";
          if (n.startsWith("rue") || n.startsWith("adr")) return "adresse";
          if (n.startsWith("ville")) return "ville";
          if (n.startsWith("code postal")) return "codePostal";
          if (n.startsWith("adresse")) return "adresse";
          if (n.startsWith("surface pond")) return "surfacePonderee";
          if (n.startsWith("surface")) return "surface";
          if (n.includes("loyer") && n.includes("pond")) return "loyerM2Pondere";
          if (n.includes("loyer") && n.includes("m²")) return "loyerM2";
          if (n.includes("loyer")) return "loyerAnnuel";
          if (n.startsWith("prix de vente")) return "prixVente";
          if (n.startsWith("prix /") || n.startsWith("prix/")) return "prixM2";
          if (n.startsWith("rendement")) return "rendement";
          if (n === "date") return "dateSignature";
          if (n.startsWith("notes")) return "notes";
          return null;
        };
        for (const name of wb.SheetNames) {
          const kindSheet = /vente|prix/i.test(name) ? "prix" : "location";
          const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[name]!, {
            defval: "",
            raw: false,
          });
          for (const r of rows) {
            const o: Src = { kind: kindSheet, source: "Générateur de brochures" };
            for (const [h, v] of Object.entries(r)) {
              const k = pick(h);
              let s = String(v ?? "").trim();
              if (!k || !s) continue;
              if (k !== "dateSignature" && k !== "notes" && /^0([.,]0+)?$/.test(s)) continue;
              if (k === "dateSignature") {
                const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
                if (m) {
                  const [, dd = "", mm = "", yy = ""] = m;
                  s = `${yy.length === 2 ? "20" + yy : yy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
                }
              }
              o[k] = s;
            }
            if (o.enseigne || o.adresse || o.ville) list.push(o);
          }
        }
      } else {
        const parsed = JSON.parse(await file.text());
        list = Array.isArray(parsed) ? parsed : (parsed.comparables ?? parsed.items ?? []);
      }
      const key = (c: {
        kind: string;
        enseigne: string | null;
        city: string | null;
        surface: number | null;
        deal_date: string | null;
      }) =>
        [c.kind, c.enseigne ?? "", c.city ?? "", c.surface ?? "", (c.deal_date ?? "").slice(0, 10)]
          .join("|")
          .toLowerCase();
      const existing = new Set((data ?? []).map(key));
      const n = (v: unknown) => (Number.isFinite(num(v)) ? num(v) : null);
      const inserts = list
        .map((c) => {
          const d = c.dateSignature ? new Date(c.dateSignature) : null;
          return {
            kind: c.kind === "prix" ? "vente" : "location",
            asset_class: normalizeAssetClass(c.typeActif),
            enseigne: c.enseigne || null,
            postal_code: c.codePostal || null,
            city: c.ville || null,
            address: c.adresse || null,
            surface: n(c.surface),
            weighted_surface:
              n(c.surfacePonderee) ?? (c.kind !== "prix" && n(c.surface) ? Math.round(n(c.surface)! * 0.65 * 100) / 100 : null),
            rent: n(c.loyerAnnuel),
            rent_m2: n(c.loyerM2),
            rent_m2_weighted: n(c.loyerM2Pondere),
            price: n(c.prixVente),
            price_m2: n(c.prixM2),
            yield_pct: n(c.rendement),
            deal_date: d && !Number.isNaN(d.getTime()) ? d.toISOString() : null,
            notes: c.notes || null,
            source: c.source || file.name,
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
      toast.success(
        `${inserts.length} comparable(s) importé(s), ${list.length - inserts.length} doublon(s) ignoré(s).`,
      );
      refresh();
    } catch (e) {
      toast.error(`Import impossible : ${(e as Error).message}`);
    }
  };

  const detail = (data ?? []).find((r) => r.id === detailId);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl">Comparables</h1>
          <p className="text-sm text-muted-foreground">
            Même configuration que le Générateur de brochures. {rows.length}{rows.length >= 500 ? "+ (affinez les filtres)" : ""} résultat(s).
          </p>
        </div>
        {isBroker && (
          <div className="flex flex-wrap gap-2">
            <input
              ref={fileRef}
              type="file"
              accept=".json,.xlsx,.xls,.xlsm,.csv,.docx,.pptx,.pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) importFile(f);
                e.target.value = "";
              }}
            />
            <Button variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="size-4" /> Importer un document
            </Button>
            <Button onClick={add}>
              <Plus className="size-4" /> Ajouter
            </Button>
          </div>
        )}
      </div>

      <div className="flex gap-1">
        {(["location", "vente"] as Kind[]).map((k) => (
          <Button
            key={k}
            variant={kind === k ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setKind(k);
              setMin("");
              setMax("");
            }}
          >
            {k === "location" ? "Comparables locatifs" : "Comparables de prix"}
          </Button>
        ))}
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {[
          { v: fClass, set: (x: string) => { setFClass(x); setFCity(""); setFStreet(""); }, opts: classOpts, ph: "Toutes typologies" },
          { v: fCity, set: (x: string) => { setFCity(x); setFStreet(""); }, opts: cityOpts, ph: "Toutes villes" },
          { v: fStreet, set: setFStreet, opts: streetOpts, ph: fCity ? "Toutes rues" : "Rue (choisir une ville)" },
        ].map((f, i) => (
          <select
            key={i}
            value={f.v}
            disabled={i === 2 && !fCity}
            onChange={(e) => f.set(e.target.value)}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground disabled:opacity-50"
          >
            <option value="">{f.ph}</option>
            {f.opts.map((o) => (
              <option key={o} value={o}>{o}</option>
            ))}
          </select>
        ))}
      </div>

      <div className="grid gap-2 rounded-sm border border-border bg-card p-3 sm:grid-cols-[1fr_auto]">
        <Input
          placeholder="Département (2 chiffres), code postal ou ville…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <div className="flex items-center gap-2">
          <span className="whitespace-nowrap text-xs uppercase tracking-wide text-muted-foreground">
            {kind === "location" ? "Surface (m²)" : "Prix (€)"}
          </span>
          <Input
            className="w-28"
            placeholder="min"
            value={min}
            onChange={(e) => setMin(e.target.value)}
          />
          <span className="text-muted-foreground">—</span>
          <Input
            className="w-28"
            placeholder="max"
            value={max}
            onChange={(e) => setMax(e.target.value)}
          />
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      <div className="overflow-hidden border-y border-border">
        {rows.map((r) => (
          <CompactRow
            key={r.id}
            title={[r.city || "Ville non renseignée", r.enseigne || r.address || "Comparable"].join(
              " · ",
            )}
            subtitle={[r.address, r.asset_class, r.deal_date?.slice(0, 10)]
              .filter(Boolean)
              .join(" · ")}
            summary={(() => {const m = comparableMetric(r);return `${m.label} : ${m.value == null ? "à renseigner" : `${fmt(m.value,2)} ${m.unit}`}`;})()}
            onOpen={() => setDetailId(r.id)}
            onEdit={isBroker ? () => setDetailId(r.id) : undefined}
            onDelete={isBroker ? () => void remove(r.id) : undefined}
          />
        ))}
        {!isLoading && !rows.length && (
          <p className="py-6 text-sm text-muted-foreground">
            Aucun comparable ne correspond à la recherche.
          </p>
        )}
      </div>
      <RecordDialog title="Fiche du comparable" open={!!detail} onClose={() => setDetailId(null)}>
        {detail && (
          <div className="grid gap-3 sm:grid-cols-2">
            <AcquisitionFields value={detail.acquisition_details as import("@/lib/comparable-metrics").AcquisitionDetails ?? {}} price={detail.price ?? 0} disabled={!isBroker} onChange={async next=>{const {error}=await supabase.from("comparables").update({acquisition_details:JSON.parse(JSON.stringify(next))}).eq("id",detail.id);if(error)toast.error(error.message);else await qc.invalidateQueries({queryKey:["comparables"]});}} />

            {[
              ...cols,
              ...(kind === "vente"
                ? LOC_COLS.filter((c) => !cols.some((existing) => existing.key === c.key))
                : SALE_COLS.filter((c) => !cols.some((existing) => existing.key === c.key))),
              { key: "source" as Field, label: "Source", w: "" },
              { key: "notes" as Field, label: "Notes", w: "" },
              { key: "excerpt" as Field, label: "Extrait", w: "" },
            ].map((c) => {
              const stored = detail[c.key];
              const computed = c.computed ? c.computed(detail) : NaN;
              const val =
                c.key === "deal_date"
                  ? String(stored ?? "").slice(0, 10)
                  : c.numeric
                    ? Number.isFinite(num(stored))
                      ? fmt(num(stored), c.d ?? 0)
                      : fmt(computed, c.d ?? 0)
                    : String(stored ?? "");
              return (
                <div key={c.key} className="min-w-0 space-y-1">
                  <Label htmlFor={`comparable-${c.key}`}>{c.label}</Label>
                  {c.key === "asset_class" ? (
                    <select
                      id={`comparable-${c.key}`}
                      key={`${detail.id}-${c.key}-${val}`}
                      defaultValue={val}
                      disabled={!isBroker}
                      onChange={(e) => {
                        if (isBroker) void save(detail, c.key, e.target.value);
                      }}
                      className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm text-foreground disabled:opacity-50"
                    >
                      <option value="">—</option>
                      {COMPARABLE_CLASSES.map((cl) => (
                        <option key={cl} value={cl}>
                          {cl}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <Input
                      id={`comparable-${c.key}`}
                      key={`${detail.id}-${c.key}-${val}`}
                      type={c.key === "deal_date" ? "date" : "text"}
                      defaultValue={val}
                      readOnly={!isBroker}
                      onBlur={(e) => {
                        if (isBroker) void save(detail, c.key, e.target.value);
                      }}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}
      </RecordDialog>
    </div>
  );
}
