import { useState } from "react";
import { Send, X } from "lucide-react";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
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
import {
  MAX_DOCUMENT_BYTES,
  fetchAssetDocuments,
  uploadDocument,
  type QueuedAttachment,
} from "@/lib/documents";
import type { Asset } from "@/lib/types";

export type Recipient = {
  id: string;
  email: string | null;
  full_name: string;
  first_name?: string | null;
};

/** Copie systématique de fin de campagne. */
const CLOSING_EMAIL = "d.berbia@wallsbroker.com";
const CLOSING_NAME = "David Berbia";

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

/** Valeur "datetime-local" par défaut : dans une heure, à la minute près. */
const defaultScheduleValue = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}`;
};

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
  const [ownFiles, setOwnFiles] = useState<File[]>([]);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [scheduled, setScheduled] = useState(false);
  const [scheduleAt, setScheduleAt] = useState(defaultScheduleValue);

  const documentsQuery = useQuery({
    queryKey: ["asset-documents", asset?.id],
    queryFn: () => fetchAssetDocuments(asset!.id),
    enabled: Boolean(asset?.id) && open,
  });

  const storedPath =
    asset?.brochure_url && !/^https?:\/\//.test(asset.brochure_url) ? asset.brochure_url : null;
  const assetDocuments: QueuedAttachment[] = (() => {
    const docs = (documentsQuery.data ?? []).map((d) => ({ path: d.path, name: d.name }));
    if (docs.length === 0 && storedPath) {
      return [{ path: storedPath, name: brochureFileName(storedPath) ?? "brochure.pdf" }];
    }
    return docs;
  })();

  const extraFiles = brochure ? [brochure, ...ownFiles] : ownFiles;
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
    let startAt = new Date();
    if (scheduled) {
      const parsed = new Date(scheduleAt);
      if (Number.isNaN(parsed.getTime())) {
        toast.error("Indiquez une date et une heure d'envoi valides.");
        return;
      }
      startAt = parsed;
    }

    setBusy(true);
    try {
      const attachments: QueuedAttachment[] = [...assetDocuments];
      for (const file of extraFiles) {
        attachments.push(await uploadDocument(asset.id, file));
      }

      const finalSubject = subject.trim() || defaultSubject;
      const finalMessage = message.trim() || defaultMessage;

      const { data: campaign, error: campaignError } = await supabase
        .from("campaigns")
        .insert({
          asset_id: asset.id,
          subject: finalSubject,
          body_html: paragraphs(finalMessage),
          brochure_path: attachments[0]?.path ?? null,
          brochure_name: attachments[0]?.name ?? null,
          documents: attachments,
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

      const scheduledAt = startAt.toISOString();
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
          scheduled_at: scheduledAt,
          attachment_path: attachments[0]?.path ?? null,
          attachment_name: attachments[0]?.name ?? null,
          attachments,
          body_html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#16212f;font-size:14px;line-height:1.6;">
  <p>Bonjour ${escapeHtml(prenom)},</p>
  ${paragraphs(finalMessage)}
  ${SIGNATURE_HTML}
  <img src="${PUBLIC_APP_URL}/api/public/t/${send.tracking_id}.gif" width="1" height="1" alt="" style="display:none">
</div>`,
        };
      });

      // Copie de clôture envoyée en dernier, hors statistiques.
      const closingAt = new Date(startAt.getTime() + 60 * 1000).toISOString();
      queue.push({
        campaign_id: campaign.id,
        send_id: null as unknown as (typeof queue)[number]["send_id"],
        kind: "clôture",
        to_email: CLOSING_EMAIL,
        to_name: CLOSING_NAME,
        subject: `[Campagne terminée — ${queue.length} destinataire${
          queue.length > 1 ? "s" : ""
        }] ${finalSubject}`,
        scheduled_at: closingAt,
        attachment_path: attachments[0]?.path ?? null,
        attachment_name: attachments[0]?.name ?? null,
        attachments,
        body_html: `<div style="font-family:Arial,Helvetica,sans-serif;color:#16212f;font-size:14px;line-height:1.6;">
  <p>Bonjour David,</p>
  <p>La campagne « ${escapeHtml(finalSubject)} » est terminée : ${queue.length} destinataire${
    queue.length > 1 ? "s ont" : " a"
  } reçu le mail ci-dessous.</p>
  <hr style="border:none;border-top:1px solid #d7dde5;margin:16px 0;">
  ${paragraphs(finalMessage)}
  ${SIGNATURE_HTML}
</div>`,
      });

      const { error: queueError } = await supabase.from("email_queue").insert(queue);
      if (queueError) throw queueError;

      const { error: pumpError } = await supabase.rpc("start_email_pump");
      if (pumpError) throw pumpError;

      toast.success(
        scheduled
          ? `Commercialisation programmée : ${queue.length - 1} mail(s) partiront le ${startAt.toLocaleString(
              "fr-FR",
              { dateStyle: "short", timeStyle: "short" },
            )}.`
          : `Commercialisation lancée : ${queue.length - 1} mail(s) en file, envoi immédiat.`,
      );
      setOpen(false);
      setOwnFiles([]);
      setSubject("");
      setMessage("");
      setScheduled(false);
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
      setScheduleAt(defaultScheduleValue());
    }
    setOpen(nextOpen);
  };

  const attachmentLabels = [...assetDocuments.map((d) => d.name), ...extraFiles.map((f) => f.name)];

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

          <div className="space-y-2 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
            <p className="font-medium">Envoi</p>
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="campaign-timing"
                  checked={!scheduled}
                  onChange={() => setScheduled(false)}
                />
                Immédiat
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="radio"
                  name="campaign-timing"
                  checked={scheduled}
                  onChange={() => setScheduled(true)}
                />
                Programmé
              </label>
            </div>
            {scheduled && (
              <Input
                type="datetime-local"
                className="h-10 sm:h-9"
                value={scheduleAt}
                onChange={(e) => setScheduleAt(e.target.value)}
              />
            )}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="campaign-file">Documents joints (facultatif)</Label>
            {attachmentLabels.length > 0 && (
              <ul className="space-y-1 rounded-md border border-border bg-muted/40 px-3 py-2 text-sm">
                {attachmentLabels.map((name, i) => (
                  <li key={`${name}-${i}`} className="flex items-center justify-between gap-2">
                    <span className="truncate">{name}</span>
                    {i >= assetDocuments.length && !(brochure && i === assetDocuments.length) && (
                      <button
                        type="button"
                        aria-label={`Retirer ${name}`}
                        className="text-muted-foreground hover:text-foreground"
                        onClick={() =>
                          setOwnFiles((files) =>
                            files.filter(
                              (_, idx) =>
                                idx !== i - assetDocuments.length - (brochure ? 1 : 0),
                            ),
                          )
                        }
                      >
                        <X className="size-4" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
            <Input
              id="campaign-file"
              type="file"
              multiple
              className="h-10 sm:h-9 py-1.5"
              onChange={(e) => {
                const picked = Array.from(e.target.files ?? []);
                const tooBig = picked.find((f) => f.size > MAX_DOCUMENT_BYTES);
                if (tooBig) {
                  toast.error(`${tooBig.name} dépasse 9 Mo.`);
                  e.target.value = "";
                  return;
                }
                setOwnFiles((files) => [...files, ...picked]);
                e.target.value = "";
              }}
            />
          </div>
        </div>

        <DialogFooter className="shrink-0 pt-2 sm:pt-4">
          <Button variant="outline" onClick={() => setOpen(false)} disabled={busy} className="h-11 sm:h-9">
            Annuler
          </Button>
          <Button onClick={launch} disabled={busy} className="h-11 sm:h-9">
            {busy ? "Lancement…" : `${scheduled ? "Programmer" : "Lancer"} (${withEmail.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
