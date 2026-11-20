import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Forward } from "lucide-react";
import { toast } from "sonner";
import { leadRecipients, transferAsset } from "@/lib/leads.functions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function AssetTransfer({ id, name, owner }: { id: string; name: string; owner?: string | null | undefined }) {
  const qc = useQueryClient();
  const getRecipients = useServerFn(leadRecipients);
  const transfer = useServerFn(transferAsset);
  const [open, setOpen] = useState(false);
  const [recipient, setRecipient] = useState("");
  const [busy, setBusy] = useState(false);
  const recipients = useQuery({ queryKey: ["lead-recipients"], queryFn: () => getRecipients(), enabled: open });
  const others = (recipients.data ?? []).filter((a) => a.user_id !== owner);
  return <>
    <Button variant="ghost" size="icon" className="size-9 sm:size-11" title="Transférer" aria-label={`Transférer ${name}`} onClick={() => setOpen(true)}><Forward className="size-4" /></Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader><DialogTitle>Transférer à un collègue</DialogTitle></DialogHeader>
        <p className="break-words text-sm">{name}</p>
        <Select value={recipient} onValueChange={setRecipient}><SelectTrigger aria-label="Collègue"><SelectValue placeholder={recipients.isLoading ? "Chargement…" : "Choisir un collègue"} /></SelectTrigger><SelectContent>{others.map((a) => <SelectItem key={a.user_id} value={a.user_id}>{a.name}</SelectItem>)}</SelectContent></Select>
        {!recipients.isLoading && !others.length && <p className="text-sm text-muted-foreground">Aucun collègue n’a encore de compte actif.</p>}
        <Button disabled={!recipient || busy} onClick={async () => {
          setBusy(true);
          try { await transfer({ data: { id, recipient } }); setOpen(false); for (const k of ["assets", "deals", "deal-assets", "nav-counts"]) void qc.invalidateQueries({ queryKey: [k] }); toast.success("Actif transféré"); }
          catch (e) { toast.error(e instanceof Error ? e.message : "Transfert impossible"); }
          finally { setBusy(false); }
        }}><Forward className="size-4" />{busy ? "Transfert…" : "Transférer"}</Button>
      </DialogContent>
    </Dialog>
  </>;
}
