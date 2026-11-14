import { createServerFn } from "@tanstack/react-start";

type ShareView =
  | { ok: false; reason: string }
  | { ok: true; title: string; city: string | null; expiresAt: string; documents: { id: string; name: string }[] };

const isUuid = (v: string) => /^[0-9a-f-]{36}$/i.test(v);

async function loadShare(token: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: share } = await supabaseAdmin
    .from("document_shares")
    .select("id, asset_id, document_ids, expires_at, revoked_at")
    .eq("token", token)
    .maybeSingle();
  if (!share) return { admin: supabaseAdmin, share: null, reason: "Lien introuvable." };
  if (share.revoked_at) return { admin: supabaseAdmin, share: null, reason: "Ce lien a été désactivé." };
  if (new Date(share.expires_at).getTime() < Date.now())
    return { admin: supabaseAdmin, share: null, reason: "Ce lien a expiré (15 jours)." };
  return { admin: supabaseAdmin, share, reason: "" };
}

/** Lien public : vérifie le jeton, sa date d'expiration et sa désactivation. */
export const viewShare = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string }) => {
    if (!isUuid(d.token)) throw new Error("Lien invalide");
    return d;
  })
  .handler(async ({ data }): Promise<ShareView> => {
    const { admin, share, reason } = await loadShare(data.token);
    if (!share) return { ok: false, reason };
    const [{ data: asset }, { data: docs }] = await Promise.all([
      admin.from("assets").select("title, city").eq("id", share.asset_id).single(),
      admin.from("asset_documents").select("id, name").in("id", share.document_ids),
    ]);
    await admin.from("document_share_events").insert({ share_id: share.id, kind: "ouverture" });
    return {
      ok: true,
      title: asset?.title ?? "Documents",
      city: asset?.city ?? null,
      expiresAt: share.expires_at,
      documents: (docs ?? []).map((d) => ({ id: d.id, name: d.name })),
    };
  });

export const downloadShared = createServerFn({ method: "POST" })
  .inputValidator((d: { token: string; documentId: string }) => {
    if (!isUuid(d.token) || !isUuid(d.documentId)) throw new Error("Lien invalide");
    return d;
  })
  .handler(async ({ data }) => {
    const { admin, share, reason } = await loadShare(data.token);
    if (!share) throw new Error(reason);
    if (!share.document_ids.includes(data.documentId)) throw new Error("Document non partagé");
    const { data: doc } = await admin
      .from("asset_documents")
      .select("path, name")
      .eq("id", data.documentId)
      .single();
    if (!doc) throw new Error("Document introuvable");
    const { data: signed, error } = await admin.storage
      .from("brochures")
      .createSignedUrl(doc.path, 300, { download: doc.name });
    if (error || !signed) throw new Error("Téléchargement impossible");
    await admin.from("document_share_events").insert({ share_id: share.id, kind: "téléchargement", document_name: doc.name });
    return { url: signed.signedUrl };
  });
