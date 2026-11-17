import { correspondents as thirdParties } from "@/lib/correspondents";
import { useSelfEmails } from "@/hooks/useSelfEmails";
import { useAuth } from "@/hooks/useAuth";
import { CompactRow } from "@/components/CompactRow";
import { Fragment, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { FileSpreadsheet, Merge, Plus, Sparkles } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { suggestDealMerges } from "@/lib/deal-dedup.functions";
import { Checkbox } from "@/components/ui/checkbox";
import { MergePicker } from "@/components/MergePicker";
import { assetKindLabel, shortClassLabel, locationLabel } from "@/lib/taxonomy";
import { cityKey, mergeDealFields, type MergeGroup } from "@/lib/deal-merge";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DealDetail } from "@/components/DealDetail";
import type { Tables } from "@/integrations/supabase/types";
import {
  STAGE_NAMES,
  TARGET_STAGE,
  dealFee,
  inVintage,
  nameKey,
  stageWeight,
  weightedFee,
  suiviColumn,
  suiviTotals,
  ASSET_STAGES,
} from "@/lib/deal-stages";

type Deal = Tables<"deals">;
type Mode = "targets" | "pipeline";

const eur = (n: number | null | undefined) =>
  n == null || n === 0
    ? "—"
    : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " €";
const m2 = (n: number | null | undefined) =>
  n == null ? "—" : new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(n) + " m²";

const ALL_STAGES = [TARGET_STAGE, ...STAGE_NAMES];

function parseNum(v: unknown): number | null {
  if (v == null || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const n = Number(
    String(v)
      .replace(/[\s\u00a0€]/g, "")
      .replace(/m²|m2/gi, "")
      .replace(",", "."),
  );
  return Number.isFinite(n) ? n : null;
}
function normalizeStage(v: unknown): string {
  const s = String(v ?? "").toLowerCase();
  if (/acte|sign|vendu|factur|encaiss/.test(s)) return "Vendu";
  if (/promesse|compromis/.test(s)) return "Promesse";
  if (/loi|lettre/.test(s)) return "LOI acceptée";
  if (/offre/.test(s)) return "Offre";
  if (/commerciali|mandat/.test(s)) return "Disponible";
  if (/avis|valeur|estimation/.test(s)) return "Avis de valeur";
  if (/perdu|abandon|annul/.test(s)) return "Perdu";
  if (/cible|prospection/.test(s)) return "Prospection";
  return "Vendu"; // historique des ventes : par défaut, affaire réalisée
}

export function DealsTable({ mode }: { mode: Mode }) {
  const { canEdit, user } = useAuth();
  const qc = useQueryClient();
  const selfEmails = useSelfEmails();
  const isMobile = useIsMobile();
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [openId, setOpenId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [mergeFor, setMergeFor] = useState<Deal | null>(null);
  const [mergePick, setMergePick] = useState<string[]>([]);
  const suggest = useServerFn(suggestDealMerges);
  const [aiGroups, setAiGroups] = useState<MergeGroup[] | null>(null);
  const [aiIndex, setAiIndex] = useState(0);
  const [aiPick, setAiPick] = useState<string[]>([]);
  const [aiBusy, setAiBusy] = useState(false);
  const [draft, setDraft] = useState({
    name: "",
    stage: mode === "targets" ? TARGET_STAGE : "Avis de valeur",
    price: "",
    fee: "",
    surface: "",
    rent: "",
  });
  const fileRef = useRef<HTMLInputElement>(null);

  const deals = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("last_activity_at", { ascending: false, nullsFirst: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });

  const dealAssets = useQuery({
    queryKey: ["deal-assets"],
    queryFn: async () => {
      const { data, error } = await supabase.from("assets").select("id,asset_class,asset_subclass,city,address").limit(5000);
      if (error) throw error;
      return new Map((data ?? []).map((a) => [a.id, a]));
    },
  });
  const assetOf = (d: { asset_id: string | null }) => (d.asset_id ? dealAssets.data?.get(d.asset_id) : undefined);
  const classOf = (d: { asset_id: string | null; name: string }) => assetOf(d)?.asset_class || null;

  const agents = useQuery({
    queryKey: ["deal-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_deal_agents");
      if (error) throw error;
      return data ?? [];
    },
  });
  const [agent, setAgent] = useState("all");
  const all = (deals.data ?? []).filter((d) => agent === "all" || d.owner_id === agent);
  const years = useMemo(() => {
    const ys = new Set<number>([thisYear, ...all.map((d) => d.vintage)]);
    return [...ys].sort((a, b) => b - a);
  }, [all, thisYear]);

  const rows = all.filter(
    (d) =>
      (mode === "targets" ? d.stage === TARGET_STAGE : d.stage !== TARGET_STAGE && !ASSET_STAGES.includes(d.stage)) &&
      inVintage(d, year),
  ).sort((a, b) => Number(a.stage === "Perdu") - Number(b.stage === "Perdu"));
  const lostRows = rows.filter((d) => d.stage === "Perdu");
  const firstLost = rows.findIndex((d) => d.stage === "Perdu");
  const lostFee = lostRows.reduce((s, d) => s + dealFee(d), 0);
  const totals = rows.reduce(
    (t, d) => ({
      fee: t.fee + dealFee(d),
      weighted: t.weighted + weightedFee(d),
      price: t.price + Number(d.amount ?? 0),
    }),
    { fee: 0, weighted: 0, price: 0 },
  );
  const realised = rows.filter((d) => d.stage === "Vendu").reduce((s, d) => s + dealFee(d), 0);

  const suivi = suiviTotals(rows);
  const goals = useQuery({
    queryKey: ["deal-goals"],
    enabled: mode === "pipeline",
    queryFn: async () => {
      const { data, error } = await supabase.from("deal_year_goals").select("*");
      if (error) throw error;
      return data;
    },
  });
  const goal = Number(goals.data?.find((g) => g.year === year)?.goal ?? 0);
  const saveGoal = async (v: string) => {
    const n = parseNum(v) ?? 0;
    const { error } = await supabase.from("deal_year_goals").upsert({ year, goal: n });
    if (error) toast.error(error.message);
    else void qc.invalidateQueries({ queryKey: ["deal-goals"] });
  };
  const pct = (n: number) => (goal > 0 ? `${Math.round((n / goal) * 100)} %` : "—");

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["deals"] });
    void qc.invalidateQueries({ queryKey: ["nav-counts"] });
    void qc.invalidateQueries({ queryKey: ["assets"] });
  };

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase
        .from("deals")
        .update({ stage, last_activity_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, stage }) =>
      qc.setQueryData<Deal[]>(["deals"], (old) =>
        old?.map((d) => (d.id === id ? { ...d, stage } : d)),
      ),
    onSuccess: (_r, v) => {
      if (ASSET_STAGES.includes(v.stage)) toast.success("Déplacé dans « Actifs »");
      else if (mode === "targets" && v.stage !== TARGET_STAGE)
        toast.success(`Basculé dans « Suivi des affaires » (${v.stage})`);
      if (mode === "pipeline" && v.stage === TARGET_STAGE)
        toast.success("Renvoyé dans « À relancer »");
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: refresh,
  });

  const merge = useMutation({
    mutationFn: async ({ keep, others }: { keep: Deal; others: Deal[] }) => {
      if (!others.length) throw new Error("Cochez au moins une ligne.");
      const ids = others.map((o) => o.id);
      const patch = mergeDealFields(keep as never, others as never);
      const { error } = await supabase.from("deals").update({ ...patch, last_activity_at: new Date().toISOString() } as never).eq("id", keep.id);
      if (error) throw error;
      const { error: e2 } = await supabase.from("mail_messages").update({ deal_id: keep.id }).in("deal_id", ids);
      if (e2) throw e2;
      const { data: mine } = await supabase.from("deal_contacts").select("email").eq("deal_id", keep.id);
      const known = new Set((mine ?? []).map((c) => c.email.toLowerCase()));
      const { data: theirs } = await supabase.from("deal_contacts").select("id,email").in("deal_id", ids);
      const move = (theirs ?? []).filter((c) => !known.has(c.email.toLowerCase()) && (known.add(c.email.toLowerCase()), true));
      if (move.length) {
        const { error: e3 } = await supabase.from("deal_contacts").update({ deal_id: keep.id }).in("id", move.map((c) => c.id));
        if (e3) throw e3;
      }
      const { error: e4 } = await supabase.from("deals").delete().in("id", ids);
      if (e4) throw e4;
    },
    onSuccess: () => {
      toast.success("Lignes fusionnées");
      setMergeFor(null);
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: refresh,
  });
  const correspondents = useQuery({
    queryKey: ["deal-correspondents", selfEmails.join(",")],
    enabled: mode === "targets",
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mail_messages")
        .select("deal_id,from_email,to_display,received_at")
        .not("deal_id", "is", null)
        .order("received_at", { ascending: true })
        .limit(5000);
      if (error) throw error;
      // Personne principale : l'expéditeur tiers du premier mail ; à défaut, le destinataire.
      const senders = new Map<string, Set<string>>();
      const others = new Map<string, Set<string>>();
      const add = (m: Map<string, Set<string>>, k: string, list: string[]) => {
        const set = m.get(k) ?? new Set<string>();
        for (const e of list) set.add(e);
        m.set(k, set);
      };
      for (const m of data ?? []) {
        add(senders, m.deal_id!, thirdParties([m.from_email ?? ""], selfEmails));
        add(others, m.deal_id!, thirdParties([m.to_display ?? ""], selfEmails));
      }
      const map = new Map<string, Set<string>>();
      for (const k of new Set([...senders.keys(), ...others.keys()])) map.set(k, new Set([...(senders.get(k) ?? []), ...(others.get(k) ?? [])]));
      return map;
    },
  });
  const mailsOf = (id: string) => [...(correspondents.data?.get(id) ?? [])];
  const byId = new Map(all.map((d) => [d.id, d]));
  const aiGroup = aiGroups?.[aiIndex];
  const aiRows = (aiGroup?.ids ?? []).map((id) => byId.get(id)).filter((d): d is Deal => !!d && d.stage === TARGET_STAGE);
  const openAiGroup = (groups: MergeGroup[], i: number) => {
    setAiIndex(i);
    setAiPick(groups[i]?.ids ?? []);
    if (i >= groups.length) {
      setAiGroups(null);
      toast.success(groups.length ? "Toutes les propositions ont été passées en revue" : "Aucun doublon trouvé par l'IA");
    }
  };
  const runAi = async () => {
    setAiBusy(true);
    try {
      const groups = await suggest();
      setAiGroups(groups);
      openAiGroup(groups, 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Analyse impossible");
    } finally {
      setAiBusy(false);
    }
  };
  const aiMerge = async () => {
    const picked = aiRows.filter((d) => aiPick.includes(d.id));
    if (picked.length < 2) { toast.error("Cochez au moins deux lignes."); return; }
    await merge.mutateAsync({ keep: picked[0]!, others: picked.slice(1) });
    openAiGroup(aiGroups!, aiIndex + 1);
  };

  const create = useMutation({
    mutationFn: async () => {
      const name = draft.name.trim();
      if (!name) throw new Error("Donnez un nom au dossier.");
      const { data, error } = await supabase
        .from("deals")
        .insert({
          name,
          owner_id: user?.id ?? null,
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
      setDraft({
        name: "",
        stage: mode === "targets" ? TARGET_STAGE : "Avis de valeur",
        price: "",
        fee: "",
        surface: "",
        rent: "",
      });
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
        const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(wb.Sheets[sheetName]!, {
          defval: null,
        });
        for (const raw of json) {
          const r = Object.fromEntries(
            Object.entries(raw).map(([k, v]) => [
              k
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .toLowerCase()
                .trim(),
              v,
            ]),
          );
          const pick = (...keys: RegExp[]) => {
            for (const re of keys)
              for (const [k, v] of Object.entries(r))
                if (re.test(k) && v != null && v !== "") return v;
            return null;
          };
          const name = String(
            pick(/^nom/, /cible|dossier|actif|affaire|operation|adresse|name/) ?? "",
          ).trim();
          if (!name) continue;
          const dateV = pick(/^date/, /annee|millesime|year/);
          const vintage =
            dateV instanceof Date
              ? dateV.getFullYear()
              : Number(/(20\d{2}|19\d{2})/.exec(String(dateV ?? ""))?.[1]) || sheetYear || year;
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
            paid_at: stage === "Vendu" ? `${vintage}-12-31` : null,
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

  const title = mode === "targets" ? "À relancer" : "Suivi des affaires";

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">{title}</h1>
          <p className="text-sm text-muted-foreground">
            {mode === "targets"
              ? "Opportunités détectées automatiquement (emails, pièces jointes, liens) ou saisies. Changez le statut pour la faire basculer dans « Suivi des affaires »."
              : "Pondération : Avis de valeur 10 % · Disponible 20 % · Offre 30 % · LOI acceptée 50 % · Promesse 75 % · Vendu 100 %."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && importExcel(e.target.files[0])}
          />
          {mode === "targets" && (
            <Button type="button" variant="outline" className="min-h-11 sm:min-h-9" disabled={aiBusy} onClick={() => void runAi()}>
              <Sparkles className="size-4" /> {aiBusy ? "Analyse…" : "Fusion IA"}
            </Button>
          )}
          <Button
            type="button"
            variant="outline"
            className="min-h-11 sm:min-h-9"
            onClick={() => fileRef.current?.click()}
          >
            <FileSpreadsheet className="size-4" /> Import Excel
          </Button>
          <Button type="button" className="min-h-11 sm:min-h-9" onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" /> Nouveau dossier
          </Button>
        </div>
      </div>

      {(agents.data?.length ?? 0) > 1 && (
        <select
          aria-label="Agent"
          value={agent}
          onChange={(e) => setAgent(e.target.value)}
          className="min-h-11 w-full rounded-sm border border-border bg-card px-3 text-sm sm:w-64"
        >
          <option value="all">Tous les agents</option>
          {agents.data!.map((a) => (
            <option key={a.user_id} value={a.user_id}>
              {a.name}
            </option>
          ))}
        </select>
      )}

      <div className="flex flex-wrap gap-1.5" role="tablist" aria-label="Années">
        {years.map((y) => (
          <button
            key={y}
            type="button"
            role="tab"
            aria-selected={y === year}
            onClick={() => setYear(y)}
            className={
              "min-h-10 rounded-sm border px-3 text-sm font-mono transition-colors " +
              (y === year
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-card hover:border-primary")
            }
          >
            {y}
          </button>
        ))}
      </div>

      {mode === "pipeline" && (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {[
            ["Encaissé", eur(suivi.encaisse), ""],
            ["Facturé reste à encaisser", eur(suivi.facture), ""],
            ["En cours (non pondéré)", eur(suivi.encours), ""],
            ["Annulé", eur(suivi.annule), ""],
            ["Global au réel", eur(suivi.reel), goal > 0 ? pct(suivi.reel) : ""],
            ["Global pondéré", eur(suivi.pondere), goal > 0 ? pct(suivi.pondere) : ""],
            ["Réalisé / objectif", pct(suivi.encaisse + suivi.facture), ""],
          ].map(([k, v, p]) => (
            <div key={k} className="rounded-sm border border-border bg-card p-3">
              <div className="text-xs text-muted-foreground">{k}</div>
              <div className="font-mono text-base font-semibold">{v}</div>
              {p && <div className="font-mono text-sm font-semibold">{p}</div>}
            </div>
          ))}
          <label className="rounded-sm border border-border bg-card p-3">
            <span className="text-xs text-muted-foreground">Objectif {year} (€)</span>
            <Input
              key={`${year}-${goal}`}
              inputMode="decimal"
              defaultValue={goal || ""}
              disabled={!canEdit}
              onBlur={(e) => void saveGoal(e.target.value)}
              className="mt-1 h-9 font-mono"
            />
          </label>
        </div>
      )}

      {mode === "pipeline" && !isMobile && rows.length > 0 && (
        <div className="overflow-x-auto border-y border-border">
          <table className="w-full text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                {["Site", "Négo 1", "Négo 2", "Vendeur", "Acquéreur", "Nature", "Surface", "Prix/Loyer", "Statut", "Encaissé", "Fact. reste à enc.", "En cours", "Pondéré", "Annulé", ""].map((h) => (
                  <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((d, i) => {
                const col = suiviColumn(d);
                const fee = dealFee(d);
                const cell = (c: string) => (col === c ? eur(fee) : "");
                return (
                  <Fragment key={d.id}>
                  {i === firstLost && (
                    <tr className="border-t-4 border-border bg-muted">
                      <td colSpan={15} className="px-2 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
                        Dossiers perdus ({lostRows.length})
                      </td>
                    </tr>
                  )}
                  <tr onClick={() => setOpenId(d.id)} className="cursor-pointer border-t border-border hover:bg-accent">
                    <td className="px-2 py-2 font-medium">{d.name}</td>
                    <td className="px-2 py-2">{d.nego1}</td>
                    <td className="px-2 py-2">{d.nego2}</td>
                    <td className="px-2 py-2">{d.seller}</td>
                    <td className="px-2 py-2">{d.buyer}</td>
                    <td className="px-2 py-2">{d.operation_nature}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{d.surface ? m2(d.surface) : ""}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{eur(d.amount ?? d.rent) === "—" ? "" : eur(d.amount ?? d.rent)}</td>
                    <td className="whitespace-nowrap px-2 py-2">{d.stage}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{cell("encaisse")}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{cell("facture")}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{cell("encours")}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{col === "encours" ? eur(weightedFee(d)) : ""}</td>
                    <td className="whitespace-nowrap px-2 py-2 font-mono">{cell("annule")}</td>
                    <td className="px-1 py-1">{canEdit && (
                      <Button variant="ghost" size="icon" className="size-9" title="Fusionner" aria-label={`Fusionner ${d.name}`} onClick={(e) => { e.stopPropagation(); setMergeFor(d); }}>
                        <Merge className="size-4" />
                      </Button>
                    )}</td>
                  </tr>
                  </Fragment>
                );
              })}
              <tr className="border-t-2 border-border bg-muted font-semibold">
                <td className="px-2 py-2" colSpan={9}>TOTAL</td>
                <td className="whitespace-nowrap px-2 py-2 font-mono">{eur(suivi.encaisse)}</td>
                <td className="whitespace-nowrap px-2 py-2 font-mono">{eur(suivi.facture)}</td>
                <td className="whitespace-nowrap px-2 py-2 font-mono">{eur(suivi.encours)}</td>
                <td className="whitespace-nowrap px-2 py-2 font-mono">{eur(suivi.pondere - suivi.encaisse - suivi.facture)}</td>
                <td className="whitespace-nowrap px-2 py-2 font-mono">{eur(suivi.annule)}</td>
                <td />
              </tr>
              <tr className="border-t border-border bg-muted font-semibold">
                <td className="px-2 py-2" colSpan={13}>Total des honoraires perdus</td>
                <td className="whitespace-nowrap px-2 py-2 font-mono">{eur(lostFee)}</td>
                <td />
              </tr>
            </tbody>
          </table>
        </div>
      )}

      <div className={"overflow-hidden border-y border-border" + (mode === "pipeline" && !isMobile && rows.length ? " hidden" : "")}>
        {rows.map((d, i) => (
          <Fragment key={d.id}>
          {i === firstLost && (
            <div className="border-t-4 border-border bg-muted px-3 py-2 text-xs font-semibold uppercase tracking-wide text-primary">
              Dossiers perdus ({lostRows.length})
            </div>
          )}
          <CompactRow
            title={d.name}
            subtitle={mode === "pipeline" ? [d.stage, d.seller && `V : ${d.seller}`, d.buyer && `A : ${d.buyer}`, d.operation_nature].filter(Boolean).join(" · ") : [assetKindLabel(assetOf(d)?.asset_class, assetOf(d)?.asset_subclass) || "Classe à préciser", d.surface ? m2(d.surface) : "", d.amount ? `Prix ${eur(d.amount)}` : ""].filter(Boolean).join(" · ")}
            summary={mode === "targets" ? [shortClassLabel(classOf(d), assetOf(d)?.asset_subclass) || null, locationLabel(classOf(d), assetOf(d)?.city, assetOf(d)?.address || d.address), mailsOf(d.id)[0] && `✉ ${mailsOf(d.id)[0]}`].filter(Boolean).join(" · ") : `Honoraires ${eur(dealFee(d))} · Pondéré ${eur(weightedFee(d))}`}
            onOpen={() => setOpenId(d.id)}
            trailing={
              mode === "targets" && canEdit ? (
                <>
                  <Button variant="ghost" size="icon" className="size-11" title="Fusionner" aria-label={`Fusionner ${d.name}`} onClick={() => { setMergeFor(d); setMergePick([]); }}>
                    <Merge className="size-4" />
                  </Button>
                </>
              ) : canEdit ? (
                <Button variant="ghost" size="icon" className="size-11" title="Fusionner" aria-label={`Fusionner ${d.name}`} onClick={() => { setMergeFor(d); setMergePick([]); }}>
                  <Merge className="size-4" />
                </Button>
              ) : undefined
            }
            onEdit={canEdit ? () => setOpenId(d.id) : undefined}
            onDelete={
              canEdit
                ? () => {
                    void (async () => {
                      const { error } = await supabase.from("deals").delete().eq("id", d.id);
                      if (error) toast.error(error.message);
                      else refresh();
                    })();
                  }
                : undefined
            }
          />
          </Fragment>
        ))}
        {!rows.length && (
          <p className="p-6 text-center text-sm text-muted-foreground">
            {deals.isLoading ? "Chargement…" : `Aucune ligne pour ${year}.`}
          </p>
        )}
        {mode === "pipeline" && lostRows.length > 0 && (
          <div className="flex items-center justify-between border-t border-border bg-muted px-3 py-2 text-sm font-semibold">
            <span>Total des honoraires perdus</span>
            <span className="font-mono">{eur(lostFee)}</span>
          </div>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Les lignes non soldées (hors « Vendu » et « Perdu ») des années précédentes sont reportées
        automatiquement sur l'année suivante.
      </p>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau dossier</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Label htmlFor="deal-name">Nom</Label>
              <Input
                id="deal-name"
                value={draft.name}
                onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                placeholder="Ex. Portefeuille Enedis"
              />
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
                <Input
                  id={`deal-${k}`}
                  inputMode="decimal"
                  value={draft[k]}
                  onChange={(e) => setDraft({ ...draft, [k]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button
              type="button"
              className="min-h-11 w-full sm:w-auto"
              disabled={create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Création…" : "Créer"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <MergePicker
        open={!!mergeFor}
        title={mergeFor?.name ?? ""}
        initialSearch={mergeFor ? cityKey(mergeFor.address) || mergeFor.name.split(/[\s-]+/).filter((w) => w.length > 3).slice(-1)[0] || "" : ""}
        items={rows.filter((d) => d.id !== mergeFor?.id).map((c) => ({ id: c.id, title: c.name, subtitle: [c.stage, c.address].filter(Boolean).join(" · "), extra: mailsOf(c.id).length ? `✉ ${mailsOf(c.id).slice(0, 6).join(", ")}` : undefined }))}
        busy={merge.isPending}
        onClose={() => setMergeFor(null)}
        onMerge={(ids) => mergeFor && merge.mutate({ keep: mergeFor, others: rows.filter((c) => ids.includes(c.id)) })}
      />

      <Dialog open={!!aiGroups && !!aiGroup} onOpenChange={(o) => !o && setAiGroups(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Fusion IA · {aiIndex + 1} / {aiGroups?.length ?? 0}</DialogTitle>
          </DialogHeader>
          {aiGroup?.reason && <p className="text-sm text-muted-foreground">{aiGroup.reason}</p>}
          <div className="space-y-1">
            {aiRows.map((c, i) => (
              <label key={c.id} className="flex min-h-11 items-center gap-3 border-b border-border py-2 text-sm">
                <Checkbox
                  checked={aiPick.includes(c.id)}
                  onCheckedChange={(v) => setAiPick((p) => (v ? [...p, c.id] : p.filter((x) => x !== c.id)))}
                />
                <span className="min-w-0">
                  <span className="block font-medium">{c.name}{i === 0 ? " (gardée)" : ""}</span>
                  <span className="block text-xs text-muted-foreground">{[c.address, c.surface ? m2(c.surface) : "", c.amount ? eur(c.amount) : ""].filter(Boolean).join(" · ")}</span>
                  {mailsOf(c.id).length > 0 && <span className="block break-all text-xs text-muted-foreground">✉ {mailsOf(c.id).slice(0, 6).join(", ")}{mailsOf(c.id).length > 6 ? ` +${mailsOf(c.id).length - 6}` : ""}</span>}
                </span>
              </label>
            ))}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" className="min-h-11 w-full sm:w-auto" disabled={merge.isPending} onClick={() => openAiGroup(aiGroups!, aiIndex + 1)}>
              Passer
            </Button>
            <Button className="min-h-11 w-full sm:w-auto" disabled={merge.isPending || aiPick.length < 2} onClick={() => void aiMerge()}>
              {merge.isPending ? "Fusion…" : "Fusionner"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="w-full overflow-y-auto sm:max-w-xl max-md:max-h-[90vh]"
        >
          {openId && <DealDetail id={openId} onClose={() => setOpenId(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}
