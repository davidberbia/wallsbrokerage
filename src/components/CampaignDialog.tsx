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
import { brochureFileName } from "@/lib/format";
import type { Asset } from "@/lib/types";

export type Recipient = {
  id: string;
  email: string | null;
  full_name: string;
  first_name?: string | null;
};

export const escapeHtml = (value: string) =>
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

export const SIGNATURE_HTML = `<div style="font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:1.5;color:#16212f;margin-top:20px;">
  <div style="font-weight:700;font-size:20px;color:#0f7a72;letter-spacing:0.5px;">WALLSBROKER</div>
  <div>David Berbia - <strong>07 67 67 24 24</strong></div>
  <div><a href="mailto:d.berbia@wallsbroker.com" style="color:#1a0dab;">d.berbia@wallsbroker.com</a></div>
  <div><a href="https://www.wallsbroker.com" style="color:#1a0dab;">www.wallsbroker.com</a></div>
  <div>Linkedin : <a href="https://www.linkedin.com/in/davidberbia" style="color:#1a0dab;">davidberbia</a></div>
</div>`;

export function CampaignDialog({
  asset,
  recipients,
  onLaunched,
  brochure = null,
  recipientKind = "investor",
}: {
  asset: Asset | null;
  recipients: Recipient[];
  onLaunched?: () => void;
  brochure?: File | null;
  recipientKind?: "investor" | "prospect";
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [ownFile, setOwnFile] = useState<File | null>(null);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const file = brochure ?? ownFile;
  const storedPath =
    asset?.brochure_url && !/^https?:\/\//.test(asset.brochure_url) ? asset.brochure_url : null;
  const storedName = storedPath ? (brochureFileName(storedPath) ?? "brochure.pdf") : null;

  const withEmail = recipients.filter((r) => r.email);

  const defaultSubject = asset
    ? `Opportunité d'investissement — ${asset.title}${asset.city ? ` (${asset.city})` : ""}`
    : "Opportunité d'investissement";
  const defaultMessage = asset
    ? `Je me permets de te présenter une opportunité d'investissement${
        asset.city ? ` à ${asset.city}` : ""
      }.\n\nCe dossier correspond aux critères d'investissement enregistrés dans notre CRM. Si votre stratégie a évolué, je vous invite à la corriger en 2 min sur www.wallsbrokerage.com.\n\nN'hésite pas à revenir vers moi en cas d'intérêt.`
    : "";

  const launch = async () => {
    if (!asset) {
      toast.error("Sélectionnez un actif enregistré.");
      return;
    }
    if (withEmail.length === 0) {
      toast.error("Aucun investisseur sélectionné avec une adresse email.");
      return;
    }

    setBusy(true);
    try {
      let path: string | null = storedPath;
      let attachmentName: string | null = storedName;
      if (file) {
        path = `${asset.id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
        attachmentName = file.name;
        const upload = await supabase.storage
          .from("brochures")
          .upload(path, file, { contentType: "application/pdf" });
        if (upload.error) throw upload.error;
      }

      const finalSubject = subject.trim() || defaultSubject;
      const finalMessage = message.trim() || defaultMessage;

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          asset_id: asset.id,
          subject: finalSubject,
          body_html: paragraphs(finalMessage),
          brochure_path: path,
          brochure_name: attachmentName,
        })
        .select("id")
        .single();
      if (campaignError) throw campaignError;

      const sends = withEmail.map((recipient) => ({
        id: crypto.randomUUID(),
        tracking_id: crypto.randomUUID(),
        campaign_id: campaign.id,
        asset_id: asset.id,
        investor_id: recipientKind === "investor" ? recipient.id : null,
        prospect_contact_id: recipientKind === "prospect" ? recipient.id : null,
        email_to: recipient.email,
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
          attachment_name: attachmentName,
          body_html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#16212f;font-size:14px;line-height:1.6;">
  <p>Bonjour ${escapeHtml(prenom)},</p>
  ${paragraphs(finalMessage)}
  ${SIGNATURE_HTML}
  <img src="${PUBLIC_APP_URL}/api/public/t/${send.tracking_id}.gif" width="1" height="1" alt="" style="display:none">
</div>`,
        };
      });
      const { error: queueError } = await supabase.from("email_queue").insert(queue);
      if (queueError) throw queueError;

      const { error: pumpError } = await supabase.rpc("start_email_pump");
      if (pumpError) throw pumpError;

      toast.success(
        `Commercialisation lancée : ${queue.length} mail(s) en file, envoi immédiat.`,
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

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen && !open) {
      setSubject(defaultSubject);
      setMessage(defaultMessage);
    }
    setOpen(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" disabled={!asset || withEmail.length === 0}>
          <Send className="size-4" /> <span className="ml-2">Envoyer la brochure</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[92vh] w-[calc(100%-1rem)] max-w-xl flex flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader className="shrink-0">
          <DialogTitle>Lancer la commercialisation</DialogTitle>
          <DialogDescription>
            Les mails partent à votre nom, avec accusé de lecture.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 space-y-4 overflow-y-auto px-0.5 py-2">
          <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="font-medium truncate">{asset?.title ?? "Aucun actif sélectionné"}</p>
            <p className="text-muted-foreground">
              {withEmail.length} destinataire{withEmail.length > 1 ? "s" : ""}
            </p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-subject">Objet du mail</Label>
            <Input
              id="campaign-subject"
              value={subject}
              className="h-10 sm:h-9"
              placeholder="Objet du mail"
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="campaign-message">Message</Label>
            <Textarea
              id="campaign-message"
              rows={5}
              value={message}
              placeholder="Saisissez le message"
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-[11px] text-muted-foreground leading-tight">
              Chaque mail commence par « Bonjour {"{prénom}"} » et se termine par votre signature.
            </p>
          </div>
          {brochure || storedPath ? (
            <p className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
              Pièce jointe :{" "}
              <span className="font-medium truncate block">{brochure?.name ?? storedName}</span>
            </p>
          ) : (
            <div className="space-y-1.5">
              <Label htmlFor="campaign-file">Brochure PDF (pièce jointe facultative)</Label>
              <Input
                id="campaign-file"
                type="file"
                accept="application/pdf"
                className="h-10 sm:h-9 py-1.5"
                onChange={(e) => setOwnFile(e.target.files?.[0] ?? null)}
              />
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 pt-2 sm:pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy} className="h-11 sm:h-9">
            Annuler
          </Button>
          <Button onClick={launch} disabled={busy} className="h-11 sm:h-9">
            {busy ? "Lancement…" : `Lancer (${withEmail.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
