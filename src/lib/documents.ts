import { supabase } from "@/integrations/supabase/client";

/** Document (brochure, annexe, plan…) rattaché à un actif. */
export type AssetDocument = {
  id: string;
  asset_id: string;
  path: string;
  name: string;
  sort_order: number;
};

/** Pièce jointe transportée dans une campagne ou la file d'emails. */
export type QueuedAttachment = { path: string; name: string };

export const MAX_DOCUMENT_BYTES = 9 * 1024 * 1024;

export const safeFileName = (name: string) => name.replace(/[^\w.-]+/g, "_");

export async function fetchAssetDocuments(assetId: string): Promise<AssetDocument[]> {
  const { data, error } = await supabase
    .from("asset_documents")
    .select("id, asset_id, path, name, sort_order")
    .eq("asset_id", assetId)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AssetDocument[];
}

/** Envoie un fichier dans le stockage et renvoie son chemin. */
export async function uploadDocument(prefix: string, file: File): Promise<QueuedAttachment> {
  if (file.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`${file.name} dépasse 9 Mo.`);
  }
  const path = `${prefix}/${crypto.randomUUID()}-${safeFileName(file.name)}`;
  const { error } = await supabase.storage
    .from("brochures")
    .upload(path, file, { contentType: file.type || "application/octet-stream" });
  if (error) throw error;
  return { path, name: file.name };
}

/** Ouvre un document stocké (lien signé) ou une URL externe. */
export async function openDocument(value: string) {
  if (/^https?:\/\//.test(value)) {
    window.open(value, "_blank", "noreferrer");
    return;
  }
  const { data, error } = await supabase.storage.from("brochures").createSignedUrl(value, 600);
  if (error || !data) throw new Error("Document introuvable");
  window.open(data.signedUrl, "_blank", "noreferrer");
}
