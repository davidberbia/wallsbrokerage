import { supabase } from "@/integrations/supabase/client";
import { compressFile } from "@/lib/compress";

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
    .eq("category", "document")
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as AssetDocument[];
}

/** Compresse puis envoie un fichier dans le stockage et renvoie son chemin. */
export async function uploadDocument(prefix: string, file: File): Promise<QueuedAttachment> {
  const compressed = await compressFile(file);
  if (compressed.size > MAX_DOCUMENT_BYTES) {
    throw new Error(`${file.name} dépasse 9 Mo même après compression.`);
  }
  const path = `${prefix}/${crypto.randomUUID()}-${safeFileName(compressed.name)}`;
  const { error } = await supabase.storage
    .from("brochures")
    .upload(path, compressed, { contentType: compressed.type || "application/octet-stream" });
  if (error) throw error;
  return { path, name: compressed.name };
}

/** Ouvre un document stocké (lien signé) ou une URL externe. */
/** Ouvre la visionneuse intégrée (DocViewer) ; le téléchargement se fait depuis celle-ci. */
export async function openDocument(value: string, name?: string) {
  let url = value;
  let download: string | null = null;
  const label = name || decodeURIComponent((value.split("?")[0] ?? "").split("/").pop() || "Document");
  if (!/^https?:\/\//.test(value)) {
    const [view, dl] = await Promise.all([
      supabase.storage.from("brochures").createSignedUrl(value, 1800),
      supabase.storage.from("brochures").createSignedUrl(value, 1800, { download: label }),
    ]);
    if (view.error || !view.data) throw new Error("Document introuvable");
    url = view.data.signedUrl;
    download = dl.data?.signedUrl ?? null;
  }
  window.dispatchEvent(new CustomEvent("doc-viewer", { detail: { url, download: download ?? url, name: label } }));
}
