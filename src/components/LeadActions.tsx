import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Archive, ArrowUpRight, Forward, Mail, Phone, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { leadRecipients, transferLead } from "@/lib/leads.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PigeButton } from "./Pige";

export function LeadActions({ id, name, email, phone, owner, archived, onPromote, full = false, ready = true }: {
  id: string; name: string; email?: string | null | undefined; phone?: string | null | undefined; owner?: string | null | undefined; archived?: boolean; onPromote: () => void; full?: boolean; ready?: boolean;
}) {
  const qc = useQueryClient();
  const getRecipients = useServerFn(leadRecipients);
  const transfer = useServerFn(transferLead);
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const recipients = useQuery({ queryKey: ["lead-recipients"], queryFn: () => getRecipients(), enabled: open });
  const refresh = () => {
    for (const key of ["deals", "deal", "assets", "deal-assets", "nav-counts", "lead-jobs"]) void qc.invalidateQueries({ queryKey: [key] });
  };
  const archive = async () => {
    setBusy(true);
    try {
      const { error } = await supabase.from("deals").update({ lead_status: archived ? "new" : "archived" }).eq("id", id).eq("stage", "Prospection");
      if (error) throw error;
      refresh(); toast.success(archived ? "Lead réouvert" : "Classé sans suite");
    } catch (e) { toast.error(e instanceof Error ? e.message : "Classement impossible"); }
    finally { setBusy(false); }
  };
  return <>
    <div className={full ? "flex w-full flex-wrap items-center gap-2" : "flex shrink-0 items-center gap-0.5"}>
      {ready && !archived && <Button variant={full ? "default" : "ghost"} size={full ? "default" : "icon"} className={full ? "min-h-11 h-auto whitespace-normal" : "size-11"} title="Transformer en Actif dispo" aria-label={`Transformer ${name} en Actif dispo`} onClick={onPromote}><ArrowUpRight className="size-4 shrink-0" />{full && "Transformer en Actif dispo"}</Button>}
      {email ? <Button asChild variant="ghost" size="icon" className="size-11" title="Contacter" aria-label={`Contacter ${name}`}><a href={`mailto:${email}?subject=${encodeURIComponent(`Votre dossier : ${name}`)}`}><Mail className="size-4" /></a></Button> : phone ? <Button asChild variant="ghost" size="icon" className="size-11" title="Appeler" aria-label={`Appeler ${name}`}><a href={`tel:${phone}`}><Phone className="size-4" /></a></Button> : null}
      <Button variant={full ? "outline" : "ghost"} size={full ? "default" : "icon"} className={full ? "min-h-11" : "size-11"} title="Transférer" aria-label={`Transférer ${name}`} onClick={() => setOpen(true)}><Forward className="size-4" />{full && "Transférer"}</Button>
      {full && !archived && <PigeButton id={id} />}
      <Button variant="outline" size={full ? "default" : "icon"} className={full ? "min-h-11 border-destructive text-destructive" : "size-11 border-destructive text-destructive"} disabled={busy} title={archived ? "Réouvrir" : "Sans suite"} aria-label={`${archived ? "Réouvrir" : "Classer sans suite"} ${name}`} onClick={() => void archive()}>{archived ? <RotateCcw className="size-4" /> : <Archive className="size-4" />}{full && (archived ? "Réouvrir" : "Sans suite")}</Button>
    </div>
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