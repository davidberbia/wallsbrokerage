// Envoi de tous les emails de l'application via Sender (https://api.sender.net).
// Sender est l'unique moteur d'envoi : plus aucun mail ne part de la boîte Outlook.
const SENDER_API = "https://api.sender.net/v2/message/send";

/** Adresse affichée comme expéditeur et adresse de réponse. */
export const FROM_EMAIL = "d.berbia@wallsbroker.com";
export const FROM_NAME = "David Berbia — Wallsbroker";
export const REPLY_TO = "d.berbia@wallsbroker.com";

export type SenderAttachment = {
  name: string;
  /** URL publiquement accessible du fichier (Sender télécharge la pièce jointe). */
  url: string;
};

export type SenderResult = { messageId: string | null };

export async function sendSenderMail(params: {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  attachment?: SenderAttachment | null;
}): Promise<SenderResult> {
  const apiKey = process.env["SENDER_API_KEY"];
  if (!apiKey) throw new Error("Clé API Sender manquante (SENDER_API_KEY).");

  const body: Record<string, unknown> = {
    from: { email: FROM_EMAIL, name: FROM_NAME },
    to: params.toName ? { email: params.to, name: params.toName } : { email: params.to },
    subject: params.subject,
    html: params.html,
    headers: { "Reply-To": REPLY_TO, charset: "utf-8" },
  };

  if (params.attachment) {
    body["attachments"] = { [params.attachment.name]: params.attachment.url };
  }

  const response = await fetch(SENDER_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error(`Sender send failed [${response.status}]: ${raw}`);
    throw new Error(`Sender [${response.status}] ${raw.slice(0, 500)}`);
  }

  let messageId: string | null = null;
  try {
    const payload = JSON.parse(raw) as {
      data?: { id?: string; message_id?: string } | null;
      id?: string;
    };
    messageId = payload.data?.id ?? payload.data?.message_id ?? payload.id ?? null;
  } catch {
    messageId = null;
  }
  return { messageId };
}
