import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, ChevronLeft, ChevronRight, Info } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { investorPayload, type InvestorDraft } from "@/components/InvestorForm";
import { useAuth } from "@/hooks/useAuth";
import { sendProfileConfirmation } from "@/lib/profile.functions";
import {
  AMOUNT_BANDS,
  ASSET_CLASSES,
  COUNTRIES,
  INVESTOR_PROFILES,
  JOB_TITLES,
  REGIONS,
  STRATEGIES,
  STRATEGY_DEFINITIONS,
} from "@/lib/taxonomy";
import type { Investor, InvestorCriteria } from "@/lib/types";

export const Route = createFileRoute("/mon-profil")({
  head: () => ({
    meta: [
      { title: "Mon profil investisseur — Walls Brokerage" },
      { name: "description", content: "Créez et mettez à jour votre profil d’investissement Walls Brokerage." },
      { property: "og:title", content: "Mon profil investisseur — Walls Brokerage" },
      { property: "og:description", content: "Définissez vos actifs, stratégies, montants et zones géographiques." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => <AppLayout><MyProfilePage /></AppLayout>,
});

type CriteriaChoice = { strategies: string[]; amountBands: string[] };
type CriteriaMap = Record<string, CriteriaChoice>;

const EMPTY: InvestorDraft = {
  full_name: "", first_name: "", company: "", email: "", phone: "", address: "",
  postal_code: "", city: "", job_title: "", investor_profile: "", asset_classes: [], strategies: [], regions: [],
};

const STEP_LABELS = ["Coordonnées", "Actifs et stratégies", "Montants", "Zones", "Récapitulatif"];

function MyProfilePage() {
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [draft, setDraft] = useState<InvestorDraft>(EMPTY);
  const [criteria, setCriteria] = useState<CriteriaMap>({});
  const [saving, setSaving] = useState(false);
  const [customJob, setCustomJob] = useState("");
  const sendConfirmation = useServerFn(sendProfileConfirmation);

  const profile = useQuery({
    queryKey: ["my-investor", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase.from("investors").select("*").eq("user_id", user.id).maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const { data: rows, error: criteriaError } = await supabase.from("investor_criteria").select("*").eq("investor_id", data.id);
      if (criteriaError) throw criteriaError;
      return { investor: data as unknown as Investor, criteria: (rows ?? []) as unknown as InvestorCriteria[] };
    },
  });

  useEffect(() => {
    if (profile.data) {
      setDraft(profile.data.investor as unknown as InvestorDraft);
      const loaded: CriteriaMap = {};
      for (const row of profile.data.criteria) loaded[row.asset_class] = { strategies: row.strategies ?? [], amountBands: row.amount_bands ?? [] };
      setCriteria(loaded);
    } else if (user?.email) {
      setDraft((current) => ({ ...current, email: current.email || user.email || "" }));
    }
  }, [profile.data, user]);

  const selectedAssets = Object.keys(criteria);
  const updateCriteria = (asset: string, patch: Partial<CriteriaChoice>) =>
    setCriteria((current) => ({ ...current, [asset]: { strategies: [], amountBands: [], ...current[asset], ...patch } }));
  const toggleAsset = (asset: string) => setCriteria((current) => {
    if (!current[asset]) return { ...current, [asset]: { strategies: [], amountBands: [] } };
    const next = { ...current };
    delete next[asset];
    return next;
  });

  const identityComplete = [draft.first_name, draft.full_name, draft.company, draft.email, draft.phone, draft.address, draft.postal_code, draft.city, draft.job_title, draft.investor_profile]
    .every((value) => typeof value === "string" && value.trim().length > 0) && (draft.job_title !== "Autre" || customJob.trim().length > 0);
  const strategiesComplete = selectedAssets.length > 0 && selectedAssets.every((asset) => (criteria[asset]?.strategies.length ?? 0) > 0);
  const amountsComplete = selectedAssets.length > 0 && selectedAssets.every((asset) => (criteria[asset]?.amountBands.length ?? 0) > 0);
  const zonesComplete = (draft.regions?.length ?? 0) > 0;
  const canContinue = step === 1 ? identityComplete : step === 2 ? strategiesComplete : step === 3 ? amountsComplete : step === 4 ? zonesComplete : true;

  const next = () => {
    if (!canContinue) {
      toast.error(step === 1 ? "Tous les champs sont obligatoires." : "Sélectionnez au moins une option pour chaque élément.");
      return;
    }
    setStep((current) => Math.min(5, current + 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const save = async () => {
    if (!user || !identityComplete || !strategiesComplete || !amountsComplete || !zonesComplete) return;
    setSaving(true);
    try {
      const finalJob = draft.job_title === "Autre" ? customJob.trim() : draft.job_title;
      const allStrategies = [...new Set(selectedAssets.flatMap((asset) => criteria[asset]?.strategies ?? []))];
      const finalizedDraft: InvestorDraft = {
        ...draft,
        job_title: finalJob ?? null,
        asset_classes: selectedAssets,
        strategies: allStrategies,
      };
      const payload = { ...investorPayload(finalizedDraft), user_id: user.id };
      let investorId = profile.data?.investor.id;
      if (investorId) {
        const { error } = await supabase.from("investors").update(payload).eq("id", investorId);
        if (error) throw error;
      } else {
        const { data, error } = await supabase.from("investors").insert(payload).select("id").single();
        if (error) throw error;
        investorId = data.id;
      }
      if (!investorId) throw new Error("Le profil n’a pas pu être créé.");
      const { error: deleteError } = await supabase.from("investor_criteria").delete().eq("investor_id", investorId);
      if (deleteError) throw deleteError;
      const rows = selectedAssets.map((asset) => ({
        investor_id: investorId,
        asset_class: asset,
        investor_profile: draft.investor_profile ?? null,
        strategies: criteria[asset]?.strategies ?? [],
        amount_bands: criteria[asset]?.amountBands ?? [],
        regions: draft.regions ?? [],
      }));
      const { error: insertError } = await supabase.from("investor_criteria").insert(rows);
      if (insertError) throw insertError;
      try {
        await sendConfirmation({ data: { profileId: investorId } });
        toast.success("Profil enregistré. Un email de confirmation vous a été envoyé.");
      } catch {
        toast.warning("Profil enregistré, mais l’email de confirmation n’a pas pu être envoyé.");
      }
      await profile.refetch();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Impossible d’enregistrer le profil.");
    } finally {
      setSaving(false);
    }
  };

  if (profile.isLoading) return <p className="text-sm text-muted-foreground">Chargement…</p>;

  return (
    <div className="mx-auto max-w-6xl space-y-7 pb-10">
      <header>
        <p className="eyebrow">Espace investisseur</p>
        <h1 className="mt-1 text-3xl">Mon profil d’investissement</h1>
        <p className="mt-2 text-sm text-muted-foreground">Étape {step} sur 5 · {STEP_LABELS[step - 1]}</p>
      </header>
      <StepIndicator step={step} />
      <section className="panel p-4 sm:p-7">
        {step === 1 && <IdentityStep draft={draft} setDraft={setDraft} customJob={customJob} setCustomJob={setCustomJob} />}
        {step === 2 && <StrategyStep criteria={criteria} toggleAsset={toggleAsset} updateCriteria={updateCriteria} />}
        {step === 3 && <AmountStep criteria={criteria} updateCriteria={updateCriteria} />}
        {step === 4 && <GeographyStep value={draft.regions ?? []} onChange={(regions) => setDraft({ ...draft, regions })} />}
        {step === 5 && <SummaryStep draft={draft} criteria={criteria} customJob={customJob} />}
        <div className="mt-8 flex justify-end gap-3 border-t pt-5">
          {step > 1 && <Button type="button" variant="outline" onClick={() => setStep((current) => current - 1)}><ChevronLeft /> Précédent</Button>}
          {step < 5 ? <Button type="button" onClick={next}>Suivant <ChevronRight /></Button> : <Button type="button" onClick={save} disabled={saving}><Check /> {saving ? "Validation…" : "Valider"}</Button>}
        </div>
      </section>
    </div>
  );
}

function StepIndicator({ step }: { step: number }) {
  return <ol className="grid grid-cols-5 gap-2" aria-label="Progression du profil">{STEP_LABELS.map((label, index) => <li key={label} className="min-w-0"><div className={`h-1.5 rounded-full ${index < step ? "bg-accent" : "bg-muted"}`} /><span className="mt-2 hidden truncate text-xs text-muted-foreground md:block">{index + 1}. {label}</span></li>)}</ol>;
}

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return <div className="space-y-2"><Label>{label} *</Label>{children}</div>;
}

function IdentityStep({ draft, setDraft, customJob, setCustomJob }: { draft: InvestorDraft; setDraft: (value: InvestorDraft) => void; customJob: string; setCustomJob: (value: string) => void }) {
  const set = (patch: Partial<InvestorDraft>) => setDraft({ ...draft, ...patch });
  return <div><h2 className="text-xl">Vos coordonnées</h2><p className="mt-1 text-sm text-muted-foreground">Tous les champs sont obligatoires.</p><div className="mt-6 grid gap-5 sm:grid-cols-2">
    <FormField label="Prénom"><Input required value={draft.first_name ?? ""} onChange={(event) => set({ first_name: event.target.value })} /></FormField>
    <FormField label="Nom"><Input required value={draft.full_name} onChange={(event) => set({ full_name: event.target.value })} /></FormField>
    <FormField label="Société"><Input required value={draft.company ?? ""} onChange={(event) => set({ company: event.target.value })} /></FormField>
    <FormField label="Email professionnel"><Input required type="email" value={draft.email ?? ""} onChange={(event) => set({ email: event.target.value })} /></FormField>
    <FormField label="Téléphone"><Input required type="tel" value={draft.phone ?? ""} onChange={(event) => set({ phone: event.target.value })} /></FormField>
    <FormField label="Adresse de la société"><Input required value={draft.address ?? ""} onChange={(event) => set({ address: event.target.value })} /></FormField>
    <FormField label="Code postal"><Input required value={draft.postal_code ?? ""} onChange={(event) => set({ postal_code: event.target.value })} /></FormField>
    <FormField label="Ville"><Input required value={draft.city ?? ""} onChange={(event) => set({ city: event.target.value })} /></FormField>
    <FormField label="Fonction"><Select value={draft.job_title ?? ""} onValueChange={(value) => set({ job_title: value })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{JOB_TITLES.map((title) => <SelectItem key={title} value={title}>{title}</SelectItem>)}</SelectContent></Select>{draft.job_title === "Autre" && <Input className="mt-2" required placeholder="Précisez votre fonction" value={customJob} onChange={(event) => setCustomJob(event.target.value)} />}</FormField>
    <FormField label="Type d’investisseur"><Select value={draft.investor_profile ?? ""} onValueChange={(value) => set({ investor_profile: value })}><SelectTrigger><SelectValue placeholder="Sélectionner" /></SelectTrigger><SelectContent>{INVESTOR_PROFILES.map((profile) => <SelectItem key={profile} value={profile}>{profile}</SelectItem>)}</SelectContent></Select></FormField>
  </div></div>;
}

function ChoiceBox({ checked, onChange, label }: { checked: boolean; onChange: () => void; label: string }) {
  return <label className="flex cursor-pointer items-center gap-2"><Checkbox checked={checked} onCheckedChange={onChange} aria-label={label} /><span className="text-sm">{label}</span></label>;
}

function StrategyStep({ criteria, toggleAsset, updateCriteria }: { criteria: CriteriaMap; toggleAsset: (asset: string) => void; updateCriteria: (asset: string, patch: Partial<CriteriaChoice>) => void }) {
  const selected = Object.keys(criteria);
  const toggleStrategy = (asset: string, strategy: string) => { const values = criteria[asset]?.strategies ?? []; updateCriteria(asset, { strategies: values.includes(strategy) ? values.filter((value) => value !== strategy) : [...values, strategy] }); };
  return <TooltipProvider><div><h2 className="text-xl">Vos classes d’actifs</h2><p className="mt-1 text-sm text-muted-foreground">Cochez vos actifs, puis au moins une stratégie pour chacun.</p><div className="mt-5 grid gap-x-8 gap-y-3 rounded-md border p-4 sm:grid-cols-2">{ASSET_CLASSES.map((asset) => <ChoiceBox key={asset} label={asset} checked={Boolean(criteria[asset])} onChange={() => toggleAsset(asset)} />)}</div>{selected.length > 0 && <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[720px] border-collapse text-sm"><thead><tr><th className="border-b p-3 text-left">Classe d’actif</th>{STRATEGIES.map((strategy) => <th key={strategy} className="border-b p-3 text-center"><Tooltip><TooltipTrigger className="inline-flex items-center gap-1 font-semibold">{strategy}<Info className="size-3.5" /></TooltipTrigger><TooltipContent className="max-w-72"><p>{STRATEGY_DEFINITIONS[strategy]}</p></TooltipContent></Tooltip></th>)}</tr></thead><tbody>{selected.map((asset) => <tr key={asset} className="border-b last:border-0"><th className="p-3 text-left font-medium">{asset}</th>{STRATEGIES.map((strategy) => <td key={strategy} className="p-3 text-center"><Checkbox checked={Boolean(criteria[asset]?.strategies.includes(strategy))} onCheckedChange={() => toggleStrategy(asset, strategy)} aria-label={`${asset}, ${strategy}`} /></td>)}</tr>)}</tbody></table></div>}</div></TooltipProvider>;
}

function AmountStep({ criteria, updateCriteria }: { criteria: CriteriaMap; updateCriteria: (asset: string, patch: Partial<CriteriaChoice>) => void }) {
  const toggle = (asset: string, band: string) => { const values = criteria[asset]?.amountBands ?? []; updateCriteria(asset, { amountBands: values.includes(band) ? values.filter((value) => value !== band) : [...values, band] }); };
  return <div><h2 className="text-xl">Montant par opportunité d’investissement</h2><p className="mt-1 text-sm text-muted-foreground">Sélectionnez au moins une tranche pour chaque classe d’actif.</p><div className="mt-6 overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-sm"><thead><tr><th className="border-b p-3 text-left">Classe d’actif</th>{AMOUNT_BANDS.map((band) => <th key={band} className="border-b p-3 text-center">{band}</th>)}</tr></thead><tbody>{Object.keys(criteria).map((asset) => <tr key={asset} className="border-b last:border-0"><th className="p-3 text-left font-medium">{asset}</th>{AMOUNT_BANDS.map((band) => <td key={band} className="p-3 text-center"><Checkbox checked={Boolean(criteria[asset]?.amountBands.includes(band))} onCheckedChange={() => toggle(asset, band)} aria-label={`${asset}, ${band}`} /></td>)}</tr>)}</tbody></table></div></div>;
}

function GeographyStep({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const toggle = (zone: string) => onChange(value.includes(zone) ? value.filter((item) => item !== zone) : [...value, zone]);
  const group = (title: string, zones: readonly string[]) => <div><h3 className="mb-3 text-base">{title}</h3><div className="grid gap-3 sm:grid-cols-2">{zones.map((zone) => <label key={zone} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border p-3 ${value.includes(zone) ? "border-accent bg-accent/10" : "bg-background"}`}><Checkbox checked={value.includes(zone)} onCheckedChange={() => toggle(zone)} /><span className="text-sm font-medium">{zone}</span></label>)}</div></div>;
  return <div><h2 className="text-xl">Vos zones géographiques</h2><p className="mt-1 text-sm text-muted-foreground">Sélectionnez au moins une région ou un pays.</p><div className="mt-6 space-y-8">{group("Régions de France", REGIONS)}{group("Pays", COUNTRIES)}</div></div>;
}

function SummaryStep({ draft, criteria, customJob }: { draft: InvestorDraft; criteria: CriteriaMap; customJob: string }) {
  const job = draft.job_title === "Autre" ? customJob : draft.job_title;
  return <div><h2 className="text-xl">Récapitulatif du profil investisseur</h2><div className="mt-6 grid gap-6 md:grid-cols-2"><SummarySection title="Coordonnées"><p>{draft.first_name} {draft.full_name}</p><p>{job} · {draft.company}</p><p>{draft.email} · {draft.phone}</p><p>{draft.address}, {draft.postal_code} {draft.city}</p><p>{draft.investor_profile}</p></SummarySection><SummarySection title="Zones géographiques"><p>{draft.regions?.join(", ")}</p></SummarySection></div><div className="mt-6 space-y-3"><h3 className="text-base">Critères par classe d’actif</h3>{Object.entries(criteria).map(([asset, choice]) => <div key={asset} className="rounded-md border p-4"><p className="font-semibold">{asset}</p><p className="mt-1 text-sm text-muted-foreground">Stratégies : {choice.strategies.join(", ")}</p><p className="text-sm text-muted-foreground">Montants : {choice.amountBands.join(", ")}</p></div>)}</div></div>;
}

function SummarySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="rounded-md border p-4"><h3 className="mb-2 text-base">{title}</h3><div className="space-y-1 text-sm text-muted-foreground">{children}</div></div>;
}