import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, Clock, ArrowUp, Merge, Forward, Mail, Phone, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { leadRecipients, transferLead } from "@/lib/leads.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PigeButton } from "./Pige";

export function LeadActions({ id, name, email, phone, owner, archived, onPromote, full = false, onArchived, onMerge }: {
  id: string; name: string; email?: string | null | undefined; phone?: string | null | undefined; owner?: string | null | undefined; archived?: boolean; onPromote: () => void; full?: boolean; onArchived?: () => void; onMerge?: (() => void) | undefined;
}) {
  const qc = useQueryClient();
  const getRecipients = useServerFn(leadRecipients);
  const transfer = useServerFn(transferLead);
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [reason, setReason] = useState("");
  const recipients = useQuery({ queryKey: ["lead-recipients"], queryFn: () => getRecipients(), enabled: open });
  const refresh = () => {
    for (const key of ["deals", "deal", "assets", "deal-assets", "nav-counts", "lead-jobs"]) void qc.invalidateQueries({ queryKey: [key] });
  };
  const archive = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("deals").update(archived ? { lead_status: "new", archive_reason: null, snooze_until: null } : { lead_status: "archived", archive_reason: reason.trim() || null }).eq("id", id).eq("stage", "Prospection");
      if (error) throw error;
      refresh(); toast.success(archived ? "Lead réouvert" : "Classé sans suite");
      if (!archived) { setConfirm(false); setReason(""); onArchived?.(); }
    } catch (e) { toast.error(e instanceof Error ? e.message : "Classement impossible"); }
    finally { setBusy(false); }
  };
  const later = async () => {
    setBusy(true);
    try {
      const until = new Date(); until.setHours(0, 0, 0, 0); until.setDate(until.getDate() + 7);
      const { error } = await supabase.from("deals").update({ snooze_until: until.toISOString() }).eq("id", id).eq("stage", "Prospection");
      if (error) throw error;
      refresh(); toast.success("Rappel dans 7 jours"); onArchived?.();
    } catch (e) { toast.error(e instanceof Error ? e.message : "Report impossible"); }
    finally { setBusy(false); }
  };
  return <>
    <div className={full ? "flex w-full flex-wrap items-center gap-2" : "flex shrink-0 items-center gap-1"}>
      {!archived && <Button variant={full ? "default" : "outline"} size={full ? "default" : "icon"} className={full ? "h-auto min-h-11 flex-col gap-0 py-1" : "size-11"} title="Upgrade : Actif dispo" aria-label={`Transformer ${name} en Actif dispo`} onClick={onPromote}>{full ? <><span className="flex items-center gap-2"><ArrowUp className="size-4 shrink-0" />Upgrade</span><span className="text-[10px] font-normal opacity-80">Actif dispo</span></> : <ArrowUp className="size-4" />}</Button>}
      {email ? <Button asChild variant="outline" size="icon" className="size-11" title="Contacter" aria-label={`Contacter ${name}`}><a href={`mailto:${email}?subject=${encodeURIComponent(`Votre dossier : ${name}`)}`}><Mail className="size-4" /></a></Button> : phone ? <Button asChild variant="outline" size="icon" className="size-11" title="Appeler" aria-label={`Appeler ${name}`}><a href={`tel:${phone}`}><Phone className="size-4" /></a></Button> : null}
      {onMerge && <Button variant="outline" size="icon" className="size-11" title="Fusionner" aria-label={`Fusionner ${name}`} onClick={onMerge}><Merge className="size-4" /></Button>}
      <Button variant="outline" size={full ? "default" : "icon"} className={full ? "min-h-11" : "size-11"} title="Transférer" aria-label={`Transférer ${name}`} onClick={() => setOpen(true)}><Forward className="size-4" />{full && "Transférer"}</Button>
      {full && !archived && <PigeButton id={id} />}
      {full && !archived && <Button variant="outline" className="h-auto min-h-11 flex-col gap-0 py-1" disabled={busy} onClick={() => void later()}><span className="flex items-center gap-2"><Clock className="size-4" />Plus tard</span><span className="text-[10px] font-normal text-muted-foreground">rappel dans 7 jours</span></Button>}
      <Button variant="outline" size={full ? "default" : "icon"} className={full ? "min-h-11 border-destructive text-destructive" : "size-11 border-destructive text-destructive"} disabled={busy} title={archived ? "Réouvrir" : "Sans suite"} aria-label={`${archived ? "Réouvrir" : "Classer sans suite"} ${name}`} onClick={() => archived ? void archive() : setConfirm(true)}>{archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}{full && (archived ? "Réouvrir" : "Sans suite")}</Button>
    </div>
    <Dialog open={confirm} onOpenChange={setConfirm}>
      <DialogContent>
        <DialogHeader><DialogTitle>Classer sans suite ?</DialogTitle></DialogHeader>
        <p className="break-words text-sm">{name}</p>
        <label className="text-sm" htmlFor={`reason-${id}`}>Raison : <span className="text-muted-foreground">(facultatif)</span></label>
        <div className="flex gap-2">
          <Input id={`reason-${id}`} value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") void archive(); }} className="min-h-11" />
          <Button className="min-h-11 shrink-0" variant="destructive" disabled={busy} onClick={() => void archive()}>Confirmer</Button>
        </div>
      </DialogContent>
    </Dialog>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transférer à un collègue</DialogTitle></DialogHeader>
        <p className="break-words text-sm">{name}</p>
        <Select value={recipient} onValueChange={setRecipient}><SelectTrigger aria-label="Collègue"><SelectValue placeholder={recipients.isLoading ? "Chargement…" : "Choisir un collègue"} /></SelectTrigger><SelectContent>{(recipients.data ?? []).filter((a) => a.user_id !== owner).map((a) => <SelectItem key={a.user_id} value={a.user_id}>{a.name}</SelectItem>)}</SelectContent></Select>
        {recipients.error && <p className="text-sm text-destructive">{recipients.error.message}</p>}
        {!recipients.isLoading && !recipients.error && !(recipients.data ?? []).some((a) => a.user_id !== owner) && <p className="text-sm text-muted-foreground">Aucun collègue n’a encore de compte actif.</p>}
        <Button disabled={!recipient || busy} onClick={async () => {
          setBusy(true);
          try { await transfer({ data: { id, recipient } }); setOpen(false); refresh(); toast.success("Lead transféré"); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Transfert impossible"); }
          finally { setBusy(false); }
        }}><Forward className="size-4" />{busy ? "Transfert…" : "Transférer"}</Button>
      </DialogContent>
    </Dialog>
  </>;
}