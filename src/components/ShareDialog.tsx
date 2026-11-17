import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Download, Mail, Share2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

const linkOf = (token: string) => `${window.location.origin}/partage/${token}`;

/** Partage des documents d'un actif par lien valable 15 jours. */
export function ShareDialog({ assetId }: { assetId: string }) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [recipient, setRecipient] = useState("");
  const qc = useQueryClient();

  const docs = useQuery({
    enabled: open,
    queryKey: ["share-docs", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("asset_documents")
        .select("id, name, category, path")
        .eq("asset_id", assetId)
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
  const shares = useQuery({
    enabled: open,
    queryKey: ["shares", assetId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("document_shares")
        .select("id, token, recipient, expires_at, revoked_at, document_ids, document_share_events(kind, document_name, created_at)")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(linkOf(token)).catch(() => undefined);
    toast.success("Lien copié (valable 15 jours)");
  };

  const create = async (viaMail = false) => {
    if (picked.size === 0) { toast.error("Choisissez au moins un document"); return; }
    const to = recipient.trim();
    const { data, error } = await supabase
      .from("document_shares")
      .insert({ asset_id: assetId, document_ids: [...picked], recipient: recipient.trim() || null })
      .select("token")
      .single();
    if (error) { toast.error(error.message); return; }
    setPicked(new Set());
    setRecipient("");
    await qc.invalidateQueries({ queryKey: ["shares", assetId] });
    if (viaMail) {
      const subject = encodeURIComponent("Documents");
      const body = encodeURIComponent(`Bonjour,\n\nVous trouverez les documents via ce lien sécurisé (valable 15 jours) :\n${linkOf(data.token)}\n\nBien cordialement`);
      window.location.href = `mailto:${/@/.test(to) ? to : ""}?subject=${subject}&body=${body}`;
    } else await copy(data.token);
  };

  /** Télécharge les pièces choisies pour les joindre à la main dans Outlook. */
  const download = async () => {
    const list = (docs.data ?? []).filter((d) => picked.has(d.id));
    if (!list.length) { toast.error("Choisissez au moins un document"); return; }
    for (const d of list) {
      const { data } = await supabase.storage.from("brochures").createSignedUrl(d.path, 600, { download: d.name });
      if (data) { const a = document.createElement("a"); a.href = data.signedUrl; a.click(); }
    }
  };

  const revoke = async (id: string) => {
    const { error } = await supabase.from("document_shares").update({ revoked_at: new Date().toISOString() }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["shares", assetId] });
    toast.success("Lien désactivé");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Share2 className="size-4" /> Partager
        </Button>
      </DialogTrigger>
      <DialogContent className="flex max-h-[96dvh] max-w-xl flex-col overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Partager des documents (15 jours)</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          {(docs.data ?? []).map((d) => (
            <label key={d.id} className="flex min-h-11 items-center gap-3 rounded-md border p-2 text-sm">
              <Checkbox
                checked={picked.has(d.id)}
                onCheckedChange={(v) => {
                  const n = new Set(picked);
                  if (v) n.add(d.id);
                  else n.delete(d.id);
                  setPicked(n);
                }}
              />
              <span className="min-w-0 break-words">{d.name}</span>
            </label>
          ))}
          {docs.data?.length === 0 && <p className="text-sm text-muted-foreground">Aucun document sur cet actif.</p>}
          <Input placeholder="E-mail du destinataire" type="email" value={recipient} onChange={(e) => setRecipient(e.target.value)} />
          <Button className="min-h-11 w-full" onClick={() => void create(true)}>
            <Mail className="size-4" /> Envoyer depuis ma messagerie
          </Button>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-11" onClick={() => void create()}>
              <Copy className="size-4" /> Copier le lien
            </Button>
            <Button variant="outline" className="min-h-11" onClick={() => void download()}>
              <Download className="size-4" /> Télécharger
            </Button>
          </div>
        </div>
        {(shares.data ?? []).length > 0 && (
          <div className="space-y-2 pt-2">
            <p className="text-sm font-medium">Liens créés</p>
            {(shares.data ?? []).map((s) => {
              const expired = new Date(s.expires_at).getTime() < Date.now();
              const events = s.document_share_events ?? [];
              const opens = events.filter((e) => e.kind === "ouverture").length;
              const dl = events.filter((e) => e.kind !== "ouverture").length;
              return (
                <div key={s.id} className="rounded-md border p-3 text-sm">
                  <p>
                    {s.recipient || "Sans destinataire"} · {s.document_ids.length} doc.
                  </p>
                  <p className="text-muted-foreground">
                    {s.revoked_at ? "Désactivé" : expired ? "Expiré" : `Jusqu'au ${new Date(s.expires_at).toLocaleDateString("fr-FR")}`}
                    {` · ${opens} ouverture(s) · ${dl} téléchargement(s)`}
                  </p>
                  {!s.revoked_at && !expired && (
                    <div className="mt-2 flex gap-2">
                      <Button size="sm" variant="outline" className="min-h-11" onClick={() => void copy(s.token)}>
                        <Copy className="size-4" /> Copier
                      </Button>
                      <Button size="sm" variant="outline" className="min-h-11" onClick={() => void revoke(s.id)}>
                        Désactiver
                      </Button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
