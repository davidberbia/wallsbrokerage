import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Target, Mail, Pencil, Trash2 } from "lucide-react";
import { InvestorForm, investorPayload, type InvestorDraft } from "@/components/InvestorForm";
import { canSelectInvestor } from "@/lib/pige-brevo";
import { supabase } from "@/integrations/supabase/client";
import { pigeOverview, preparePige, sendPigeAll, applyPigeTemplate } from "@/lib/pige.functions";
import { pigeActive, pigeTemplate, FIRST_NAME_TAG } from "@/lib/pige";
import { matchInvestor, type Criteria, type Investor } from "@/lib/types";
import { ASSET_CLASSES, REGIONS, STRATEGIES } from "@/lib/taxonomy";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { Textarea } from "./ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "./ui/select";
const contactName = (first: string | null, full: string) => first && !full.toLocaleLowerCase("fr").startsWith(first.toLocaleLowerCase("fr")) ? `${first} ${full}` : full;

export function PigeButton({ id }: { id: string }) {
  const [open, setOpen] = useState(false);
  return <><Button variant="outline" className="min-h-11" onClick={() => setOpen(true)}><Target className="size-4" />Pige</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-sm:inset-0 h-dvh max-h-dvh overflow-y-auto sm:h-auto sm:max-h-[90dvh] sm:max-w-3xl"><DialogHeader><DialogTitle>Pige — investisseurs</DialogTitle></DialogHeader>{open && <PigeEditor id={id} />}</DialogContent></Dialog></>;
}
function PigeEditor({ id }: { id: string }) {
  const overview = useServerFn(pigeOverview);
  const prepare = useServerFn(preparePige);
  const qc = useQueryClient();
  const [editing, setEditing] = useState<InvestorDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<Investor | null>(null);
  const data = useQuery({ queryKey: ["pige", id], queryFn: () => overview({ data: { id } }) });
  const investors = useQuery({ queryKey: ["pige-investors"], queryFn: async () => {
    const rows: Investor[] = [];
    for (let from = 0; ; from += 1000) {
      const result = await supabase.from("investors").select("*").order("company").order("id").range(from, from + 999);
      if (result.error) throw new Error(result.error.message);
      rows.push(...result.data as unknown as Investor[]);
      if (result.data.length < 1000) return rows;
    }
  } });
  const [criteria, setCriteria] = useState<Criteria>({ price: null, yield_pct: null, asset_class: null, strategy: null, region: null });
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState("");
  const [manual, setManual] = useState({ first: "", last: "", email: "" });
  const addManual = async () => {
    const first = manual.first.trim(), last = manual.last.trim(), email = manual.email.trim().toLowerCase();
    if (!first || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 255 || first.length > 100 || last.length > 100) { toast.error("Prénom et e-mail valides requis"); return; }
    const existing = (investors.data ?? []).find(i => i.email?.toLowerCase() === email);
    if (existing) { setSelected(old => old.includes(existing.id) ? old : [...old, existing.id]); setManual({ first: "", last: "", email: "" }); toast.success("Déjà présent : sélectionné"); return; }
    const { data: row, error } = await supabase.from("investors").insert({ first_name: first, full_name: [first, last].filter(Boolean).join(" "), email }).select("id").single();
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["pige-investors"] });
    setSelected(old => [...old, row.id]); setManual({ first: "", last: "", email: "" }); toast.success("Destinataire ajouté");
  };
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(false);
  useEffect(() => { const a = data.data?.asset; if (a) setCriteria({ price: a.price, yield_pct: a.yield_pct ?? null, asset_class: a.asset_class ?? null, strategy: a.strategy ?? null, region: a.region ?? null }); }, [data.data?.asset]);
  const results = useMemo(() => {
    const q = search.trim().toLowerCase();
    const all = (investors.data ?? []).filter(i => i.email);
    const picked = all.filter(i => selected.includes(i.id));
    const found = q ? all.filter(i => [i.company, i.full_name, i.first_name, i.email].some(v => v?.toLowerCase().includes(q))) : all.filter(i => matchInvestor(i, criteria).misses.length === 0);
    return [...picked.filter(i => !found.includes(i)), ...found];
  }, [investors.data, criteria, search, selected]);
  if (data.error || investors.error) return <p className="text-destructive">{data.error?.message || investors.error?.message}</p>;
  if (!data.data || !investors.data) return <p>Chargement…</p>;
  const cycle = data.data.cycles.find(c => !c.completed_at && (!c.due_at || new Date(c.due_at) > new Date()));
  return <div className="space-y-4">
    <p className="font-semibold">{data.data.asset.title}</p>
    {!step && <>
      <div className="grid gap-3 sm:grid-cols-2">{([['asset_class', "Type de bien", ASSET_CLASSES], ['region', "Région", REGIONS], ['strategy', "Stratégie", STRATEGIES]] as const).map(([key, label, options]) => <div key={key}><p className="mb-1 text-sm">{label}</p><Select value={criteria[key] || "all"} onValueChange={v => setCriteria(c => ({ ...c, [key]: v === "all" ? null : v }))}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{[...new Set([...options, ...(criteria[key] ? [criteria[key]] : [])])].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>)}
      {([['price', "Prix (€)"], ['yield_pct', "Rendement (%)"]] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<Input type="number" min="0" value={criteria[key] ?? ""} onChange={e => setCriteria(c => ({ ...c, [key]: e.target.value ? Number(e.target.value) : null }))} /></label>)}</div>
      <Input type="search" className="min-h-11" placeholder="Rechercher un investisseur (nom, société, e-mail)" aria-label="Rechercher un investisseur" value={search} onChange={e => setSearch(e.target.value)} />
      <div className="rounded-md border border-border p-3"><p className="mb-2 text-sm font-semibold">Ajouter un destinataire</p><div className="grid gap-2 sm:grid-cols-[1fr_1fr_1.5fr_auto]"><Input className="min-h-11" placeholder="Prénom" aria-label="Prénom" maxLength={100} value={manual.first} onChange={e => setManual(m => ({ ...m, first: e.target.value }))} /><Input className="min-h-11" placeholder="Nom" aria-label="Nom" maxLength={100} value={manual.last} onChange={e => setManual(m => ({ ...m, last: e.target.value }))} /><Input className="min-h-11" type="email" placeholder="E-mail" aria-label="E-mail" maxLength={255} value={manual.email} onChange={e => setManual(m => ({ ...m, email: e.target.value }))} /><Button variant="outline" className="min-h-11" onClick={addManual}>Ajouter</Button></div></div>
      <p className="text-sm">{results.length} investisseurs · {selected.length} sélectionnés</p>
      <div className="max-h-80 overflow-y-auto divide-y divide-border">{results.map(i => { const ok = canSelectInvestor(i as Investor & { email_bounced_at?: string | null }); return <div key={i.id} className="flex min-h-14 items-center gap-3 py-2"><Checkbox disabled={!ok} aria-label={`Interroger ${i.company || i.full_name}`} checked={ok && selected.includes(i.id)} onCheckedChange={checked => setSelected(old => checked ? [...old, i.id] : old.filter(v => v !== i.id))} /><span className={`min-w-0 flex-1 break-words text-sm ${ok ? "" : "text-destructive"}`}><strong>{i.company || i.full_name}</strong><span className="block">{contactName(i.first_name, i.full_name)} · {i.email}</span>{!ok && <span className="block text-xs font-semibold">E-mail en erreur — corrigez la fiche</span>}</span><Button variant="ghost" size="sm" className="min-h-11 shrink-0" aria-label={`Modifier ${i.company || i.full_name}`} onClick={() => setEditing({ ...i })}><Pencil className="size-4" />Modifier</Button><Button variant="ghost" size="sm" className="min-h-11 shrink-0 text-destructive" aria-label={`Supprimer ${i.company || i.full_name}`} onClick={() => setRemoving(i)}><Trash2 className="size-4" />Supprimer</Button></div>; })}</div>
      <Dialog open={removing !== null} onOpenChange={o => !o && setRemoving(null)}><DialogContent><DialogHeader><DialogTitle>Supprimer définitivement ?</DialogTitle></DialogHeader><p className="break-words">{removing?.company || removing?.full_name} · {removing?.email}</p><Button variant="destructive" className="min-h-11" onClick={async () => { if (!removing) return; const { error } = await supabase.from("investors").delete().eq("id", removing.id); if (error) { toast.error(error.message); return; } setSelected(old => old.filter(v => v !== removing.id)); setRemoving(null); await qc.invalidateQueries({ queryKey: ["pige-investors"] }); await qc.invalidateQueries({ queryKey: ["investors"] }); toast.success("Investisseur supprimé"); }}>Supprimer</Button></DialogContent></Dialog>
      <Dialog open={editing !== null} onOpenChange={o => !o && setEditing(null)}><DialogContent className="flex max-h-[96dvh] max-w-xl flex-col overflow-hidden"><DialogHeader><DialogTitle>Modifier le profil</DialogTitle></DialogHeader>{editing && <InvestorForm draft={editing} onChange={setEditing} saving={saving} submitLabel="Valider les modifications" onSubmit={async () => { if (!editing.id) return; setSaving(true); const { error } = await supabase.from("investors").update(investorPayload(editing)).eq("id", editing.id); setSaving(false); if (error) { toast.error(error.message); return; } await qc.invalidateQueries({ queryKey: ["pige-investors"] }); await qc.invalidateQueries({ queryKey: ["investors"] }); setEditing(null); toast.success("Profil enregistré"); }} />}</DialogContent></Dialog>
      <div className="sticky bottom-0 border-t border-border bg-background py-2"><Button className="min-h-11" disabled={busy || !selected.length} onClick={async () => { setBusy(true); try { await prepare({ data: { id, investors: selected.filter(v => results.some(r => r.id === v && canSelectInvestor(r as Investor & { email_bounced_at?: string | null }))) } }); await qc.invalidateQueries({ queryKey: ["pige", id] }); setStep(true); } catch (e) { toast.error(e instanceof Error ? e.message : "Préparation impossible"); } finally { setBusy(false); } }}>Valider la sélection</Button></div>
      {cycle && <Button variant="outline" onClick={() => setStep(true)}>Reprendre les messages préparés</Button>}
    </>}
    {step && <><Button variant="outline" onClick={() => setStep(false)}>Retour aux investisseurs</Button>{cycle ? <PigeMessages id={id} cycle={cycle} /> : <p>Aucune Pige en cours.</p>}</>}
  </div>;
}
type Cycle = Awaited<ReturnType<typeof pigeOverview>>['cycles'][number];
function PigeMessages({ id, cycle }: { id: string; cycle: Cycle }) {
  const { user } = useAuth(); const qc = useQueryClient();
  const apply = useServerFn(applyPigeTemplate); const sendAll = useServerFn(sendPigeAll);
  const contacts = cycle.lead_pige_contacts;
  const pending = contacts.filter(c => !c.sent_at && c.send_state === "prepared");
  const first = pending[0] ?? contacts[0];
  const [subject, setSubject] = useState(first?.subject ?? "");
  const [body, setBody] = useState(first ? pigeTemplate(first.body_text) : "");
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const editable = pending.length > 0 && cycle.created_by === user?.id;
  const state = (c: Cycle['lead_pige_contacts'][number]) => c.sent_at ? "Envoyé" : c.send_state === "rejected" ? "Refusé" : c.send_state === "uncertain" || c.send_state === "sending" ? "À vérifier" : "À envoyer";
  return <div className="space-y-3">
    <details className="rounded-md border border-border p-2"><summary className="min-h-11 cursor-pointer py-2 font-semibold">{contacts.length} destinataires · {pending.length} à envoyer</summary><ul className="divide-y divide-border text-sm">{contacts.map(c => <li key={c.id} className="flex justify-between gap-2 py-2"><span className="min-w-0 break-words">{c.name} · {c.email}</span><span className={c.send_state === "rejected" ? "text-destructive" : c.sent_at ? "text-success" : "text-muted-foreground"}>{state(c)}</span></li>)}</ul></details>
    {editable ? <>
      <p className="text-xs text-muted-foreground">Un seul message pour tous : {FIRST_NAME_TAG} sera remplacé par le prénom de chacun.</p>
      <Input aria-label="Objet de la Pige" value={subject} onChange={e => setSubject(e.target.value)} />
      <Textarea aria-label="Message de la Pige" value={body} onChange={e => setBody(e.target.value)} className="min-h-72" />
      <Button className="min-h-11" disabled={busy || !subject.trim() || !body.trim()} onClick={async () => { setBusy(true); try { await apply({ data: { pige: cycle.id, subject, body } }); await qc.invalidateQueries({ queryKey: ["pige", id] }); setConfirming(true); } catch (e) { toast.error(e instanceof Error ? e.message : "Préparation impossible"); } finally { setBusy(false); } }}><Mail className="size-4" />Envoyer à {pending.length} investisseur{pending.length > 1 ? "s" : ""} via Brevo</Button>
    </> : <p className="text-sm">Tous les messages ont été traités.</p>}
    <Dialog open={confirming} onOpenChange={setConfirming}><DialogContent><DialogHeader><DialogTitle>Confirmer l’envoi</DialogTitle></DialogHeader><p>{pending.length} mails individuels</p><p className="break-words text-sm">{subject}</p><Button className="min-h-11" disabled={busy} onClick={async () => { setBusy(true); try { const r = await sendAll({ data: { pige: cycle.id } }); toast.success(`${r.sent} envoyé(s)${r.rejected ? ` · ${r.rejected} refusé(s)` : ""}${r.uncertain ? ` · ${r.uncertain} à vérifier` : ""}`); await qc.invalidateQueries({ queryKey: ["pige", id] }); setConfirming(false); } catch (e) { toast.error(e instanceof Error ? e.message : "Envoi impossible"); } finally { setBusy(false); } }}>Confirmer et envoyer</Button></DialogContent></Dialog>
  </div>;
}
export function PigeHistory({ id }: { id: string }) {
  const overview = useServerFn(pigeOverview);
  const data = useQuery({ queryKey: ["pige", id], queryFn: () => overview({ data: { id } }) });
  if (data.error) return <p className="text-destructive">{data.error.message}</p>;
  return <>{data.data?.cycles.map(c => <section key={c.id} className="space-y-2 border-y border-border py-3"><h3 className="font-semibold">{pigeActive(c) ? "Pige en cours" : c.started_at ? "Marketing report" : "Pige préparée"}</h3>{c.due_at && <p className="text-sm">Retour dans les Leads : {new Date(c.due_at).toLocaleDateString("fr-FR")}</p>}<p className="text-sm">{c.lead_pige_contacts.filter(r => r.sent_at).length} contactés · {c.lead_pige_contacts.filter(r => r.delivered_at).length} réceptions confirmées · {c.lead_pige_contacts.filter(r => r.opened_at).length} lectures signalées · {c.lead_pige_contacts.filter(r => r.replied_at).length} réponses</p>{c.lead_pige_contacts.map(r => <div key={r.id} className="border-t border-border py-2 text-sm"><p className="break-words font-semibold">{r.name} · {r.email}</p><p>{r.sent_at ? `Contacté le ${new Date(r.sent_at).toLocaleDateString("fr-FR")}` : "Envoi non confirmé"} · Réception : {r.delivered_at ? "confirmée" : "non confirmée"} · Lecture : {r.opened_at ? "signalée" : "non confirmée"} · {r.replied_at ? "Répondu" : "Aucune réponse constatée"}</p>{r.reply_preview && <p className="break-words">{r.reply_preview}</p>}{r.sync_error && <p className="text-warning">Suivi Outlook indisponible</p>}</div>)}</section>)}</>;
}