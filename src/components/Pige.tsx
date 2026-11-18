import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Target, Mail, Pencil } from "lucide-react";
import { InvestorForm, investorPayload, type InvestorDraft } from "@/components/InvestorForm";
import { canSelectInvestor } from "@/lib/pige-brevo";
import { supabase } from "@/integrations/supabase/client";
import { pigeOverview, preparePige, sendPigeBrevo, updatePigeMessage } from "@/lib/pige.functions";
import { pigeActive } from "@/lib/pige";
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
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(false);
  useEffect(() => { const a = data.data?.asset; if (a) setCriteria({ price: a.price, yield_pct: a.yield_pct ?? null, asset_class: a.asset_class ?? null, strategy: a.strategy ?? null, region: a.region ?? null }); }, [data.data?.asset]);
  const results = useMemo(() => (investors.data ?? []).filter(i => i.email && matchInvestor(i, criteria).misses.length === 0), [investors.data, criteria]);
  if (data.error || investors.error) return <p className="text-destructive">{data.error?.message || investors.error?.message}</p>;
  if (!data.data || !investors.data) return <p>Chargement…</p>;
  const cycle = data.data.cycles.find(c => !c.completed_at && (!c.due_at || new Date(c.due_at) > new Date()));
  return <div className="space-y-4">
    <p className="font-semibold">{data.data.asset.title}</p>
    {!step && <>
      <div className="grid gap-3 sm:grid-cols-2">{([['asset_class', "Type de bien", ASSET_CLASSES], ['region', "Région", REGIONS], ['strategy', "Stratégie", STRATEGIES]] as const).map(([key, label, options]) => <div key={key}><p className="mb-1 text-sm">{label}</p><Select value={criteria[key] || "all"} onValueChange={v => setCriteria(c => ({ ...c, [key]: v === "all" ? null : v }))}><SelectTrigger aria-label={label}><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Tous</SelectItem>{[...new Set([...options, ...(criteria[key] ? [criteria[key]] : [])])].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>)}
      {([['price', "Prix (€)"], ['yield_pct', "Rendement (%)"]] as const).map(([key, label]) => <label key={key} className="text-sm">{label}<Input type="number" min="0" value={criteria[key] ?? ""} onChange={e => setCriteria(c => ({ ...c, [key]: e.target.value ? Number(e.target.value) : null }))} /></label>)}</div>
      <p className="text-sm">{results.length} investisseurs · {selected.length} sélectionnés</p>
      <div className="max-h-80 overflow-y-auto divide-y divide-border">{results.map(i => { const ok = canSelectInvestor(i as Investor & { email_bounced_at?: string | null }); return <div key={i.id} className="flex min-h-14 items-center gap-3 py-2"><Checkbox disabled={!ok} aria-label={`Interroger ${i.company || i.full_name}`} checked={ok && selected.includes(i.id)} onCheckedChange={checked => setSelected(old => checked ? [...old, i.id] : old.filter(v => v !== i.id))} /><span className={`min-w-0 flex-1 break-words text-sm ${ok ? "" : "text-destructive"}`}><strong>{i.company || i.full_name}</strong><span className="block">{contactName(i.first_name, i.full_name)} · {i.email}</span>{!ok && <span className="block text-xs font-semibold">E-mail en erreur — corrigez la fiche</span>}</span><Button variant="ghost" size="sm" className="min-h-11 shrink-0" aria-label={`Modifier ${i.company || i.full_name}`} onClick={() => setEditing({ ...i })}><Pencil className="size-4" />Modifier</Button></div>; })}</div>
      <Dialog open={editing !== null} onOpenChange={o => !o && setEditing(null)}><DialogContent className="flex max-h-[96dvh] max-w-xl flex-col overflow-hidden"><DialogHeader><DialogTitle>Modifier le profil</DialogTitle></DialogHeader>{editing && <InvestorForm draft={editing} onChange={setEditing} saving={saving} submitLabel="Valider les modifications" onSubmit={async () => { if (!editing.id) return; setSaving(true); const { error } = await supabase.from("investors").update(investorPayload(editing)).eq("id", editing.id); setSaving(false); if (error) { toast.error(error.message); return; } await qc.invalidateQueries({ queryKey: ["pige-investors"] }); await qc.invalidateQueries({ queryKey: ["investors"] }); setEditing(null); toast.success("Profil enregistré"); }} />}</DialogContent></Dialog>
      <div className="sticky bottom-0 border-t border-border bg-background py-2"><Button className="min-h-11" disabled={busy || !selected.length} onClick={async () => { setBusy(true); try { await prepare({ data: { id, investors: selected.filter(v => results.some(r => r.id === v && canSelectInvestor(r as Investor & { email_bounced_at?: string | null }))) } }); await qc.invalidateQueries({ queryKey: ["pige", id] }); setStep(true); } catch (e) { toast.error(e instanceof Error ? e.message : "Préparation impossible"); } finally { setBusy(false); } }}>Valider la sélection</Button></div>
      {cycle && <Button variant="outline" onClick={() => setStep(true)}>Reprendre les messages préparés</Button>}
    </>}
    {step && <><Button variant="outline" onClick={() => setStep(false)}>Retour aux investisseurs</Button>{cycle ? <PigeMessages id={id} cycle={cycle} /> : <p>Aucune Pige en cours.</p>}</>}
  </div>;
}
type Cycle = Awaited<ReturnType<typeof pigeOverview>>['cycles'][number];
function PigeMessages({ id, cycle }: { id: string; cycle: Cycle }) {
  const [index, setIndex] = useState(0);
  const contact = cycle.lead_pige_contacts[index];
  if (!contact) return null;
  return <div className="space-y-3"><p>{index + 1} / {cycle.lead_pige_contacts.length}</p><PreparedMessage key={contact.id} id={id} cycle={cycle} contact={contact} /><div className="flex gap-2"><Button variant="outline" disabled={!index} onClick={() => setIndex(v => v - 1)}>Retour</Button><Button variant="outline" disabled={index === cycle.lead_pige_contacts.length - 1} onClick={() => setIndex(v => v + 1)}>Suivant</Button></div></div>;
}
function PreparedMessage({ id, cycle, contact }: { id: string; cycle: Cycle; contact: Cycle['lead_pige_contacts'][number] }) {
  const { user } = useAuth(); const qc = useQueryClient(); const send = useServerFn(sendPigeBrevo);
  const update = useServerFn(updatePigeMessage);
  const [subject, setSubject] = useState(contact.subject);
  const [body, setBody] = useState(contact.body_text);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const editable = !contact.sent_at && contact.send_state === "prepared" && cycle.created_by === user?.id;
  return <div className="space-y-3"><p className="break-words">{contact.name} · {contact.email}</p><Input aria-label="Objet de la Pige" value={subject} readOnly={!editable} onChange={e => setSubject(e.target.value)} /><Textarea aria-label="Message de la Pige" value={body} readOnly={!editable} onChange={e => setBody(e.target.value)} className="min-h-72" />
    {editable && <><Button className="min-h-11" disabled={busy || !subject.trim() || !body.trim()} onClick={async () => { setBusy(true); try { await update({ data: { id: contact.id, subject, body } }); await qc.invalidateQueries({ queryKey: ["pige", id] }); setConfirming(true); } catch (e) { toast.error(e instanceof Error ? e.message : "Préparation impossible"); } finally { setBusy(false); } }}><Mail className="size-4" />Envoyer via Brevo</Button><Dialog open={confirming} onOpenChange={setConfirming}><DialogContent><DialogHeader><DialogTitle>Confirmer l’envoi</DialogTitle></DialogHeader><p className="break-words">{contact.name} · {contact.email}</p><p className="break-words text-sm">{subject}</p><Button disabled={busy} onClick={async () => { setBusy(true); try { await send({ data: { id: contact.id } }); toast.success("Envoi accepté par Brevo — dossier en Pige"); } catch (e) { toast.error(e instanceof Error ? e.message : "Envoi à vérifier"); } finally { for (const key of ["pige", "lead-piges", "deals"]) await qc.invalidateQueries({ queryKey: [key] }); setConfirming(false); setBusy(false); } }}>Confirmer et envoyer</Button></DialogContent></Dialog></>}
    {contact.send_state === "sending" && <p className="text-warning">Envoi en cours ou à vérifier — aucun nouvel essai</p>}
    {contact.send_state === "uncertain" && <p className="text-warning">Résultat à vérifier dans Brevo — aucun nouvel essai</p>}
    {contact.send_state === "rejected" && <p className="text-destructive">Envoi refusé par Brevo</p>}
    {contact.send_error && <p className="break-words text-sm text-destructive">{contact.send_error}</p>}
    {contact.sent_at && <p className="text-sm">Contacté le {new Date(contact.sent_at).toLocaleString("fr-FR")}</p>}
  </div>;
}
export function PigeHistory({ id }: { id: string }) {
  const overview = useServerFn(pigeOverview);
  const data = useQuery({ queryKey: ["pige", id], queryFn: () => overview({ data: { id } }) });
  if (data.error) return <p className="text-destructive">{data.error.message}</p>;
  return <>{data.data?.cycles.map(c => <section key={c.id} className="space-y-2 border-y border-border py-3"><h3 className="font-semibold">{pigeActive(c) ? "Pige en cours" : c.started_at ? "Marketing report" : "Pige préparée"}</h3>{c.due_at && <p className="text-sm">Retour dans les Leads : {new Date(c.due_at).toLocaleDateString("fr-FR")}</p>}<p className="text-sm">{c.lead_pige_contacts.filter(r => r.sent_at).length} contactés · {c.lead_pige_contacts.filter(r => r.delivered_at).length} réceptions confirmées · {c.lead_pige_contacts.filter(r => r.opened_at).length} lectures signalées · {c.lead_pige_contacts.filter(r => r.replied_at).length} réponses</p>{c.lead_pige_contacts.map(r => <div key={r.id} className="border-t border-border py-2 text-sm"><p className="break-words font-semibold">{r.name} · {r.email}</p><p>{r.sent_at ? `Contacté le ${new Date(r.sent_at).toLocaleDateString("fr-FR")}` : "Envoi non confirmé"} · Réception : {r.delivered_at ? "confirmée" : "non confirmée"} · Lecture : {r.opened_at ? "signalée" : "non confirmée"} · {r.replied_at ? "Répondu" : "Aucune réponse constatée"}</p>{r.reply_preview && <p className="break-words">{r.reply_preview}</p>}{r.sync_error && <p className="text-warning">Suivi Outlook indisponible</p>}</div>)}</section>)}</>;
}