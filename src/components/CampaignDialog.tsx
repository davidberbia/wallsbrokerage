import { useState } from "react";
import { Send } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { PUBLIC_APP_URL } from "@/lib/app-url";
import type { Asset, Investor } from "@/lib/types";

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");

const paragraphs = (text: string) =>
  text
    .split(/\n{2,}/)
    .map((p) => `<p>${escapeHtml(p).replace(/\n/g, "<br>")}</p>`)
    .join("");

export function CampaignDialog({
  asset,
  recipients,
  onLaunched,
  brochure = null,
}: {
  asset: Asset | null;
  recipients: Investor[];
  onLaunched?: () => void;
  /** Brochure fournie depuis la page (champ « Upload brochure »). */
  brochure?: File | null;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownFile, setOwnFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const file = brochure ?? ownFile;
  const storedPath =
    asset?.brochure_url && !/^https?:\/\//.test(asset.brochure_url) ? asset.brochure_url : null;
  const storedName = storedPath ? (storedPath.split("/").pop() ?? "brochure.pdf") : null;
  const hasAttachment = Boolean(file || storedPath);

  const withEmail = recipients.filter((r) => r.email);

  const defaultSubject = asset
    ? `Opportunité d'investissement — ${asset.title}${asset.city ? ` (${asset.city})` : ""}`
    : "Opportunité d'investissement";
  const defaultMessage = asset
    ? `Je me permets de vous adresser en pièce jointe la brochure de commercialisation de ${asset.title}${
        asset.city ? ` à ${asset.city}` : ""
      }.\n\nCette opportunité correspond aux critères d'investissement enregistrés dans votre profil. Je reste à votre disposition pour échanger sur le dossier et organiser une visite.`
    : "";

  const launch = async () => {
    if (!asset) {
      toast.error("Sélectionnez un actif enregistré.");
      return;
    }
    if (!hasAttachment) {
      toast.error("Ajoutez la brochure PDF à joindre.");
      return;
    }
    if (withEmail.length === 0) {
      toast.error("Aucun investisseur sélectionné avec une adresse email.");
      return;
    }

    setBusy(true);
    try {
      const path = `${asset.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const upload = await supabase.storage
        .from("brochures")
        .upload(path, file, { contentType: "application/pdf" });
      if (upload.error) throw upload.error;

      const finalSubject = subject.trim() || defaultSubject;
      const finalMessage = message.trim() || defaultMessage;

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          asset_id: asset.id,
          subject: finalSubject,
          body_html: paragraphs(finalMessage),
          brochure_path: path,
          brochure_name: file.name,
        })
        .select("id")
        .single();
      if (campaignError) throw campaignError;

      const sends = withEmail.map((investor) => ({
        id: crypto.randomUUID(),
        tracking_id: crypto.randomUUID(),
        campaign_id: campaign.id,
        asset_id: asset.id,
        investor_id: investor.id,
        email_to: investor.email,
        subject: finalSubject,
        channel: "email",
        status: "en file",
      }));
      const { error: sendsError } = await supabase.from("brochure_sends").insert(sends);
      if (sendsError) throw sendsError;

      const queue = sends.map((send, index) => {
        const investor = withEmail[index]!;
        const prenom = investor.first_name || investor.full_name.split(" ")[0] || "";
        return {
          campaign_id: campaign.id,
          send_id: send.id,
          kind: "brochure",
          to_email: investor.email!,
          to_name: investor.full_name,
          subject: finalSubject,
          attachment_path: path,
          attachment_name: file.name,
          body_html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#16212f;font-size:14px;line-height:1.6;">
  <p>Bonjour ${escapeHtml(prenom)},</p>
  ${paragraphs(finalMessage)}
  <p>Bien à vous,<br>David Berbia — Walls Brokerage</p>
  <img src="${PUBLIC_APP_URL}/api/public/t/${send.tracking_id}.gif" width="1" height="1" alt="" style="display:none">
</div>`,
        };
      });
      const { error: queueError } = await supabase.from("email_queue").insert(queue);
      if (queueError) throw queueError;

      const { error: pumpError } = await supabase.rpc("start_email_pump");
      if (pumpError) throw pumpError;

      toast.success(
        `Commercialisation lancée : ${queue.length} mail(s) en file, envoi à raison d'1 par minute.`,
      );
      setOpen(false);
      setOwnFile(null);
      setSubject("");
      setMessage("");
      onLaunched?.();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec du lancement");
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!asset || withEmail.length === 0 || !file}>
          <Send className="size-4" /> Envoyer la brochure
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Lancer la commercialisation</DialogTitle>
          <DialogDescription>
            Les mails partent de votre boîte d.berbia@wallsbroker.com, à raison d'un par minute,
            personnalisés au prénom et avec accusé de lecture. La commercialisation se clôture
            automatiquement au bout de 2 mois.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
            <p className="font-medium">{asset?.title ?? "Aucun actif sélectionné"}</p>
            <p className="text-muted-foreground">
              {withEmail.length} destinataire{withEmail.length > 1 ? "s" : ""} — durée d'envoi
              estimée : {withEmail.length} minute{withEmail.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-subject">Objet du mail</Label>
            <Input
              id="campaign-subject"
              value={subject}
              placeholder={defaultSubject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="campaign-message">Message</Label>
            <Textarea
              id="campaign-message"
              rows={7}
              value={message}
              placeholder={defaultMessage}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              Chaque mail commence par « Bonjour {"{prénom}"} » et se termine par votre signature.
            </p>
          </div>
          {brochure ? (
            <p className="rounded-md border border-border bg-muted/40 px-4 py-3 text-sm">
              Pièce jointe : <span className="font-medium">{brochure.name}</span>
            </p>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="campaign-file">Brochure PDF (pièce jointe)</Label>
              <Input
                id="campaign-file"
                type="file"
                accept="application/pdf"
                onChange={(e) => setOwnFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={launch} disabled={busy}>
            {busy ? "Lancement…" : `Lancer l'envoi (${withEmail.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
