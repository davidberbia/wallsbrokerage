// Envoi de mails depuis la boîte Outlook / Office 365 du courtier (connecteur Lovable).
const GATEWAY_URL = "https://connector-gateway.lovable.dev/microsoft_outlook";

// Limite pratique de Microsoft Graph pour sendMail avec pièce jointe inline (~4 Mo encodés).
export const MAX_ATTACHMENT_BYTES = 3_000_000;

export type OutlookAttachment = {
  name: string;
  contentType: string;
  bytes: Uint8Array;
};

function toBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

export async function sendOutlookMail(params: {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  attachment?: OutlookAttachment | null;
}): Promise<void> {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const connectionKey = process.env["MICROSOFT_OUTLOOK_API_KEY"];
  if (!lovableKey || !connectionKey) {
    throw new Error("Connecteur Outlook non configuré (clé manquante).");
  }

  const message: Record<string, unknown> = {
    subject: params.subject,
    body: { contentType: "HTML", content: params.html },
    toRecipients: [
      {
        emailAddress: params.toName
          ? { address: params.to, name: params.toName }
          : { address: params.to },
      },
    ],
  };

  if (params.attachment) {
    message["attachments"] = [
      {
        "@odata.type": "#microsoft.graph.fileAttachment",
        name: params.attachment.name,
        contentType: params.attachment.contentType,
        contentBytes: toBase64(params.attachment.bytes),
      },
    ];
  }

  const response = await fetch(`${GATEWAY_URL}/me/sendMail`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${lovableKey}`,
      "X-Connection-Api-Key": connectionKey,
    },
    body: JSON.stringify({ message, saveToSentItems: true }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error(`Outlook sendMail failed [${response.status}]: ${errorBody}`);
    throw new Error(`Outlook [${response.status}] ${errorBody.slice(0, 500)}`);
  }
}
