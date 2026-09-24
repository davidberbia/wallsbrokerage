// Envoi depuis la boîte Outlook de David (réponse dans le fil, pièces jointes recopiées).
const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

async function graph<T>(method: string, path: string, body?: unknown): Promise<T> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["MICROSOFT_OUTLOOK_API_KEY"];
  if (!apiKey || !connKey) throw new Error("Connexion Outlook indisponible côté serveur.");
  const res = await fetch(`${GATEWAY}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: body === undefined ? null : JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Outlook [${res.status}] ${(await res.text()).slice(0, 300)}`);
  const txt = await res.text();
  return (txt ? JSON.parse(txt) : {}) as T;
}

export type AttachmentRef = { messageId: string; attachmentId: string; name: string };
type GraphAttachment = { id: string; name: string; size: number; contentType?: string; contentBytes?: string };

export async function listAttachments(messageId: string): Promise<GraphAttachment[]> {
  const r = await graph<{ value: GraphAttachment[] }>(
    "GET",
    `/v1.0/me/messages/${messageId}/attachments?$select=id,name,size,contentType`,
  );
  return r.value ?? [];
}

export async function getMessageBody(messageId: string): Promise<string> {
  const r = await graph<{ body?: { content?: string } }>(
    "GET",
    `/v1.0/me/messages/${messageId}?$select=body`,
  );
  return (r.body?.content ?? "").replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 6000);
}

/** Recherche des mails reçus d'un expéditeur contenant des pièces jointes. */
export async function searchFromWithAttachments(email: string): Promise<{ id: string; subject: string; receivedDateTime: string }[]> {
  const filter = encodeURIComponent(`from/emailAddress/address eq '${email.replace(/'/g, "''")}' and hasAttachments eq true`);
  const r = await graph<{ value: { id: string; subject: string; receivedDateTime: string }[] }>(
    "GET",
    `/v1.0/me/messages?$filter=${filter}&$select=id,subject,receivedDateTime&$top=25`,
  );
  return r.value ?? [];
}

async function copyAttachments(draftId: string, refs: AttachmentRef[]) {
  for (const ref of refs) {
    const a = await graph<GraphAttachment>("GET", `/v1.0/me/messages/${ref.messageId}/attachments/${ref.attachmentId}`);
    if (!a.contentBytes) continue;
    if (a.size > 3_000_000) throw new Error(`Pièce jointe trop lourde pour l'envoi automatique : ${a.name}`);
    await graph("POST", `/v1.0/me/messages/${draftId}/attachments`, {
      "@odata.type": "#microsoft.graph.fileAttachment",
      name: a.name,
      contentType: a.contentType ?? "application/octet-stream",
      contentBytes: a.contentBytes,
    });
  }
}

/** Répond dans le fil existant (historique conservé), jamais un transfert. */
export async function replyInThread(messageId: string, html: string, refs: AttachmentRef[]) {
  const draft = await graph<{ id: string }>("POST", `/v1.0/me/messages/${messageId}/createReply`, {
    comment: html,
  });
  await copyAttachments(draft.id, refs);
  await graph("POST", `/v1.0/me/messages/${draft.id}/send`);
}

/** Nouveau mail (ex. demande au vendeur). */
export async function sendNew(to: string, subject: string, html: string, refs: AttachmentRef[] = []) {
  const draft = await graph<{ id: string }>("POST", `/v1.0/me/messages`, {
    subject,
    body: { contentType: "HTML", content: html },
    toRecipients: [{ emailAddress: { address: to } }],
  });
  await copyAttachments(draft.id, refs);
  await graph("POST", `/v1.0/me/messages/${draft.id}/send`);
}
