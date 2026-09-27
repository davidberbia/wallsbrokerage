import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DealDetail } from "@/components/DealDetail";
import type { Tables } from "@/integrations/supabase/types";
import { STAGE_NAMES, TARGET_STAGE, dealFee, inVintage, nameKey, stageWeight, weightedFee } from "@/lib/deal-stages";

type Deal = Tables<"deals">;
type Mode = "targets" | "pipeline";

const eur = (n: number | null | undefined) =>
  n == null || n === 0 ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
const m2 = (n: number | null | undefined) => (n == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " m²");

const ALL_STAGES = [TARGET_STAGE, ...STAGE_NAMES];

function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(String(v).replace(/[\s\u00a0€]/g, "").replace(/m²|m2/gi, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}
function normalizeStage(v: unknown): string {
  const s = String(v ?? "").toLowerCase();
  if (/acte|sign|vendu|factur|encaiss/.test(s)) return "Acte";
  if (/promesse|compromis/.test(s)) return "Promesse";
  if (/loi|lettre/.test(s)) return "LOI acceptée";
  if (/offre/.test(s)) return "Offre";
  if (/commerciali|mandat/.test(s)) return "Commercialisation";
  if (/avis|valeur|estimation/.test(s)) return "Avis de valeur";
  if (/perdu|abandon|annul/.test(s)) return "Perdu";
  if (/cible/.test(s)) return "Cible";
  return "Acte"; // historique des ventes : par défaut, affaire réalisée
}

export function DealsTable({ mode }: { mode: Mode }) {
  const qc = useQueryClient();
  const isMobile = useIsMobile();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [draft, setDraft] = useState({ name: "", stage: mode === "targets" ? TARGET_STAGE : "Avis de valeur", price: "", fee: "", surface: "", rent: "" });
  const fileRef = useRef<HTMLInputElement>(null);

  const deals = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*").order("last_activity_at", { ascending: false, nullsFirst: false }).limit(5000);
      if (error) throw error;
      return data;
    },
  });

  const all = deals.data ?? [];
  const years = useMemo(() => {
    const ys = new Set<number>([thisYear, ...all.map((d) => d.vintage)]);
    return [...ys].sort((a, b) => b - a);
  }, [all, thisYear]);

  const rows = all.filter((d) => (mode === "targets" ? d.stage === TARGET_STAGE : d.stage !== TARGET_STAGE) && inVintage(d, year));
  const totals = rows.reduce(
    (t, d) => ({ fee: t.fee + dealFee(d), weighted: t.weighted + weightedFee(d), price: t.price + Number(d.amount ?? 0) }),
    { fee: 0, weighted: 0, price: 0 },
  );
  const realised = rows.filter((d) => d.stage === "Acte").reduce((s, d) => s + dealFee(d), 0);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["deals"] });
    void qc.invalidateQueries({ queryKey: ["nav-counts"] });
  };

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("deals").update({ stage, last_activity_at: new Date().toISOString() }).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, stage }) => qc.setQueryData<Deal[]>(["deals"], (old) => old?.map((d) => (d.id === id ? { ...d, stage } : d))),
    onSuccess: (_r, v) => {
      if (mode === "targets" && v.stage !== TARGET_STAGE) toast.success(`Basculé dans « Affaires en cours » (${v.stage})`);
      if (mode === "pipeline" && v.stage === TARGET_STAGE) toast.success("Renvoyé dans « Cibles »");
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: refresh,
  });

  const create = useMutation({
    mutationFn: async () => {
      const name = draft.name.trim();
      if (!name) throw new Error("Donnez un nom au dossier.");
      const { data, error } = await supabase
        .from("deals")
        .insert({
          name,
          name_key: nameKey(name),
          stage: draft.stage,
          amount: parseNum(draft.price),
          fee_amount: parseNum(draft.fee),
          surface: parseNum(draft.surface),
          rent: parseNum(draft.rent),
          vintage: year,
          source: "manuel",
          last_activity_at: new Date().toISOString(),
        })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      toast.success("Dossier créé");
      setDraft({ name: "", stage: mode === "targets" ? TARGET_STAGE : "Avis de valeur", price: "", fee: "", surface: "", rent: "" });
      setCreateOpen(false);
      refresh();
      setOpenId(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const importExcel = async (file: File) => {
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: true });
      const existing = new Set(all.map((d) => `${d.name_key}|${d.vintage}`));
      const out: Record<string, unknown>[] = [];
      for (const sheetName of wb.SheetNames) {
        const sheetYear = Number(/(20\d{2})/.exec(sheetName)?.[1]) || null;
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, { defval: null });
        for (const raw of json) {
          const r = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim(), v]));
          const pick = (...keys: RegExp[]) => {
            for (const re of keys) for (const [k, v] of Object.entries(r)) if (re.test(k) && v != null && v !== "") return v;
            return null;
          };
          const name = String(pick(/^nom/, /cible|dossier|actif|affaire|operation|adresse|name/) ?? "").trim();
          if (!name) continue;
          const dateV = pick(/^date/, /annee|millesime|year/);
          const vintage =
            dateV instanceof Date ? dateV.getFullYear() : Number(/(20\d{2}|19\d{2})/.exec(String(dateV ?? ""))?.[1]) || sheetYear || year;
          const key = nameKey(name);
          if (existing.has(`${key}|${vintage}`)) continue;
          existing.add(`${key}|${vintage}`);
          const stage = normalizeStage(pick(/statut|etape|stage|etat/));
          out.push({
            name: name.slice(0, 200),
            name_key: key,
            stage,
            surface: parseNum(pick(/surface|m2|m²/)),
            rent: parseNum(pick(/loyer|rent/)),
            amount: parseNum(pick(/prix|montant|valeur|price/)),
            fee_amount: parseNum(pick(/honorair|fee|commission/)),
            vintage,
            source: "import Excel",
            paid_at: stage === "Acte" ? `${vintage}-12-31` : null,
          });
        }
      }
      if (!out.length) {
        toast.error("Aucune ligne nouvelle trouvée (colonne « Nom » attendue).");
        return;
      }
      for (let i = 0; i < out.length; i += 200) {
        const { error } = await supabase.from("deals").insert(out.slice(i, i + 200) as never);
        if (error) throw error;
      }
      toast.success(`${out.length} ligne(s) importée(s)`);
      refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Import impossible");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const title = mode === "targets" ? "Cibles" : "Affaires en cours";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "targets"
              ? "Opportunités détectées automatiquement (emails, pièces jointes, liens) ou saisies. Changez le statut pour la faire basculer dans « Affaires en cours »."
              : "CA pondéré sur les honoraires : Avis de valeur 10 % · Commercialisation 20 % · Offre 30 % · LOI acceptée 50 % · Promesse 75 % · Acte 100 % · Perdu 0 %."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={(e) => e.target.files?.[0] && importExcel(e.target.files[0])} />
          <Button type="button" variant="outline" className="min-h-11 sm:min-h-9" onClick={() => fileRef.current?.click()}>
            <FileSpreadsheet className="size-4" /> Import Excel
          </Button>
          <Button type="button" className="min-h-11 sm:min-h-9" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Nouveau dossier
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Millésimes">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={y === year}
            onClick={() => setYear(y)}
            className={
              "min-h-10 rounded-sm border px-3 text-sm font-mono transition-colors " +
              (y === year ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary")
            }
          >
            {y}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[
          ["Lignes", String(rows.length)],
          ["Honoraires", eur(totals.fee)],
          [mode === "targets" ? "Prix cumulés" : "CA pondéré", mode === "targets" ? eur(totals.price) : eur(totals.weighted)],
          [mode === "targets" ? "CA pondéré" : "CA réalisé (Acte)", mode === "targets" ? eur(totals.weighted) : eur(realised)],
        ].map(([k, v]) => (
          <div key={k} className="rounded-sm border border-border bg-card p-3">
            <div className="text-xs text-muted-foreground">{k}</div>
            <div className="font-mono text-base font-semibold">{v}</div>
          </div>
        ))}
      </div>

      <div className="overflow-x-auto rounded-sm border border-border bg-card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <th className="sticky left-0 z-10 bg-muted px-3 py-2">Nom de la {mode === "targets" ? "cible" : "affaire"}</th>
              <th className="px-3 py-2 text-right">Surface</th>
              <th className="px-3 py-2 text-right">Loyer</th>
              <th className="px-3 py-2 text-right">Prix</th>
              <th className="px-3 py-2 text-right">Honoraires</th>
              <th className="px-3 py-2">Statut</th>
              <th className="px-3 py-2 text-right">CA pondéré</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr key={d.id} className="border-b border-border last:border-0 hover:bg-muted/30">
                <td className="sticky left-0 z-10 max-w-[260px] bg-card px-3 py-2">
                  <button type="button" className="block w-full truncate text-left font-medium hover:underline" onClick={() => setOpenId(d.id)} title={d.name}>
                    {d.name}
                  </button>
                  <span className="block truncate text-xs text-muted-foreground">
                    {[d.source, d.vintage !== year ? `report ${d.vintage}` : null].filter(Boolean).join(" · ")}
                  </span>
                </td>
                <td className="px-3 py-2 text-right font-mono">{m2(d.surface)}</td>
                <td className="px-3 py-2 text-right font-mono">{eur(d.rent)}</td>
                <td className="px-3 py-2 text-right font-mono">{eur(d.amount)}</td>
                <td className="px-3 py-2 text-right font-mono">{eur(dealFee(d))}</td>
                <td className="px-3 py-2">
                  <Select value={d.stage} onValueChange={(s) => move.mutate({ id: d.id, stage: s })}>
                    <SelectTrigger className="h-9 w-[170px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_STAGES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                          {s !== TARGET_STAGE ? ` (${Math.round(stageWeight(s) * 100)} %)` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </td>
                <td className="px-3 py-2 text-right font-mono">{eur(weightedFee(d))}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-3 py-8 text-center text-sm text-muted-foreground">
                  {deals.isLoading ? "Chargement…" : `Aucune ligne pour ${year}.`}
                </td>
              </tr>
            )}
          </tbody>
          {rows.length > 0 && (
            <tfoot>
              <tr className="border-t border-border bg-muted/40 font-semibold">
                <td className="sticky left-0 z-10 bg-muted px-3 py-2">Total {year}</td>
                <td />
                <td />
                <td className="px-3 py-2 text-right font-mono">{eur(totals.price)}</td>
                <td className="px-3 py-2 text-right font-mono">{eur(totals.fee)}</td>
                <td />
                <td className="px-3 py-2 text-right font-mono">{eur(totals.weighted)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Les lignes non soldées (hors « Acte » et « Perdu ») des années précédentes sont reportées automatiquement sur l'année suivante.
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="deal-name">Nom</Label>
              <Input id="deal-name" value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Ex. Portefeuille Enedis" />
            </div>
            <div className="sm:col-span-2">
              <Label>Statut</Label>
              <Select value={draft.stage} onValueChange={(v) => setDraft({ ...draft, stage: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_STAGES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {(
              [
                ["price", "Prix (€)"],
                ["fee", "Honoraires (€)"],
                ["surface", "Surface (m²)"],
                ["rent", "Loyer annuel (€)"],
              ] as const
            ).map(([k, label]) => (
              <div key={k}>
                <Label htmlFor={`deal-${k}`}>{label}</Label>
                <Input id={`deal-${k}`} inputMode="decimal" value={draft[k]} onChange={(e) => setDraft({ ...draft, [k]: e.target.value })} />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" className="min-h-11 w-full sm:w-auto" disabled={create.isPending} onClick={() => create.mutate()}>
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent side={isMobile ? "bottom" : "right"} className="w-full overflow-y-auto sm:max-w-xl max-md:max-h-[90vh]">
          {openId && <DealDetail id={openId} onClose={() => setOpenId(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
