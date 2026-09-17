// Envoi de tous les emails de l'application via Brevo.
// Les identifiants restent exclusivement côté serveur via le connecteur Lovable.
const BREVO_API = "https://connector-gateway.lovable.dev/brevo/smtp/email";

/** Adresse affichée comme expéditeur et adresse de réponse. */
export const FROM_EMAIL = "d.berbia@wallsbroker.com";
export const FROM_NAME = "Wallsbroker";
export const REPLY_TO = "d.berbia@wallsbroker.com";

export type BrevoAttachment = {
  name: string;
  /** URL temporaire de la brochure, convertie côté serveur pour Brevo. */
  url: string;
};

export type BrevoResult = { messageId: string | null };

const bytesToBase64 = (bytes: Uint8Array) => {
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
};

async function loadAttachment(attachment: BrevoAttachment) {
  const response = await fetch(attachment.url);
  if (!response.ok) {
    throw new Error(`Brochure indisponible [${response.status}]`);
  }
  return {
    name: attachment.name,
    content: bytesToBase64(new Uint8Array(await response.arrayBuffer())),
  };
}

export async function sendBrevoMail(params: {
  to: string;
  toName?: string | null;
  subject: string;
  html: string;
  attachment?: BrevoAttachment | null;
}): Promise<BrevoResult> {
  const lovableApiKey = process.env["LOVABLE_API_KEY"];
  const brevoApiKey = process.env["BREVO_API_KEY"];
  if (!lovableApiKey || !brevoApiKey) {
    throw new Error("Connexion Brevo indisponible.");
  }

  const body: Record<string, unknown> = {
    sender: { email: FROM_EMAIL, name: FROM_NAME },
    to: [{ email: params.to, ...(params.toName ? { name: params.toName } : {}) }],
    replyTo: { email: REPLY_TO, name: FROM_NAME },
    subject: params.subject,
    htmlContent: params.html,
  };

  if (params.attachment) {
    body["attachment"] = [await loadAttachment(params.attachment)];
  }

  const response = await fetch(BREVO_API, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${lovableApiKey}`,
      "X-Connection-Api-Key": brevoApiKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await response.text();
  if (!response.ok) {
    console.error(`Brevo send failed [${response.status}]: ${raw}`);
    throw new Error(`Brevo [${response.status}] ${raw.slice(0, 500)}`);
  }

  try {
    const payload = JSON.parse(raw) as { messageId?: string };
    return { messageId: payload.messageId ?? null };
  } catch {
    return { messageId: null };
  }
}