import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Mail, Check, FileQuestion } from "lucide-react";
import { Button } from "./ui/button";
import { Checkbox } from "./ui/checkbox";
import { Input } from "./ui/input";
import { useAuth } from "@/hooks/useAuth";
import { DEFAULT_LEAD_QUESTIONS } from "@/lib/lead-documents";
import { leadDocumentOverview, prepareLeadDocumentRequest, confirmLeadDocumentRequest } from "@/lib/lead-documents.functions";

export function LeadDocumentRequest({ id, onWaiting }: { id: string; onWaiting?: (() => void) | undefined }) {
  const qc = useQueryClient();
  const { user } = useAuth();
  const overview = useServerFn(leadDocumentOverview);
  const prepare = useServerFn(prepareLeadDocumentRequest);
  const confirmSend = useServerFn(confirmLeadDocumentRequest);
  const data = useQuery({ queryKey: ["lead-documents", id], queryFn: () => overview({ data: { id } }) });
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<string[]>([]);
  const [extras, setExtras] = useState(DEFAULT_LEAD_QUESTIONS.map(text => ({ checked: true, text })));
  const selectedItems = [...new Set([...items, ...extras.filter(e => e.checked).map(e => e.text.trim())].filter(Boolean))];
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data.data) setItems(data.data.missing); }, [data.data]);
  const refresh = () => { for (const key of ["lead-documents", "lead-document-requests", "deals", "deal"]) void qc.invalidateQueries({ queryKey: [key] }); };
  const active = data.data?.requests.find(r => ["prepared", "waiting", "sending"].includes(r.status));
  const openMail = (r: { to_email: string; subject: string; body_text: string }) => { window.location.href = `mailto:${encodeURIComponent(r.to_email)}?subject=${encodeURIComponent(r.subject)}&body=${encodeURIComponent(r.body_text)}`; };
  const labels: Record<string, string> = { prepared: "Message préparé — envoi à confirmer", waiting: "En attente de documents", sending: "Relance en cours", reminded: "Relancé auto · A rappeler", received: "Retour reçu", cancelled: "Demande clôturée", error: "A rappeler · envoi à vérifier" };
  return <section className="space-y-3 border-y border-border py-3">
    <Button variant="warning" className="min-h-11 h-auto w-fit max-w-full whitespace-normal" disabled={data.isLoading} onClick={() => setExpanded(v => !v)}><FileQuestion className="size-4 shrink-0" />Demander les éléments manquants</Button>
    {data.error && <p className="text-sm text-destructive">{data.error.message}</p>}
    {expanded && data.data && <div className="space-y-3">
      <p className="break-all text-sm">{data.data.sender || "Expéditeur à renseigner"}</p>
      {[...new Set([...data.data.missing, ...items])].map(item => <label key={item} className="flex min-h-11 items-center gap-3 text-sm"><Checkbox checked={items.includes(item)} onCheckedChange={checked => setItems(old => checked ? [...old, item] : old.filter(i => i !== item))} />{item}</label>)}
      {extras.map((extra, index) => <div key={index} className="flex min-h-11 items-center gap-3"><Checkbox aria-label={`Demander le complément ${index + 1}`} checked={extra.checked} onCheckedChange={checked => setExtras(old => old.map((e, i) => i === index ? { ...e, checked: checked === true } : e))} /><Input aria-label={`Complément ${index + 1}`} placeholder="Autre élément" value={extra.text} onChange={event => setExtras(old => old.map((e, i) => i === index ? { ...e, text: event.target.value } : e))} /></div>)}
      <Button variant="outline" onClick={() => setExtras(old => [...old, { checked: false, text: "" }])}>Ajouter une ligne</Button>
      <Button className="min-h-11 w-full" disabled={busy || !data.data.sender || (!active && !selectedItems.length)} onClick={async () => {
        setBusy(true);
        try { const r = active ?? await prepare({ data: { id, items: selectedItems } }); refresh(); openMail(r); }
        catch (e) { toast.error(e instanceof Error ? e.message : "Préparation impossible"); }
        finally { setBusy(false); }
      }}><Mail className="size-4" />Ouvrir dans Outlook</Button>
    </div>}
    {active?.status === "prepared" && active.created_by === user?.id && <Button className="min-h-11 w-full" disabled={busy} onClick={async () => {
      setBusy(true);
      try { await confirmSend({ data: { id: active.id } }); refresh(); toast.success("Envoi confirmé — en attente de documents"); onWaiting?.(); }
      catch (e) { toast.error(e instanceof Error ? e.message : "Confirmation impossible"); }
      finally { setBusy(false); }
    }}><Check className="size-4" />Confirmer l’envoi</Button>}
    {(data.data?.requests ?? []).map(r => <div key={r.id} className="space-y-1 border-t border-border pt-2 text-xs">
      <p className={r.status === "waiting" || r.status === "sending" ? "font-semibold text-warning" : r.status === "reminded" || r.status === "error" ? "font-semibold text-destructive" : "font-semibold text-muted-foreground"}>{labels[r.status] ?? r.status}</p>
      <p className="break-words">{r.subject}</p>
      <p>{new Date(r.sent_at ?? r.created_at).toLocaleString("fr-FR")}{r.due_at && r.status === "waiting" ? ` · Relance prévue le ${new Date(r.due_at).toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" })}` : ""}</p>
      {r.error && <p className="break-words text-destructive">{r.error}</p>}
    </div>)}
  </section>;
}