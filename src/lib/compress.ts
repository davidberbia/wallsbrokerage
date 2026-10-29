// Compression automatique des fichiers avant envoi, entièrement dans le
// navigateur (gratuite, aucun crédit). En cas d'échec, le fichier d'origine
// est renvoyé tel quel : la compression ne doit jamais bloquer un envoi.

const MAX_IMAGE_SIDE = 2048;
const JPEG_QUALITY = 0.85;

async function compressImage(file: File): Promise<File> {
  const bitmap = await createImageBitmap(file);
  try {
    const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    const type = file.type === "image/png" ? "image/png" : "image/jpeg";
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, type, JPEG_QUALITY),
    );
    if (!blob || blob.size >= file.size) return file;
    const name = type === "image/jpeg" ? file.name.replace(/\.\w+$/, ".jpg") : file.name;
    return new File([blob], name, { type });
  } finally {
    bitmap.close();
  }
}

async function compressPdf(file: File): Promise<File> {
  const { PDFDocument } = await import("pdf-lib");
  const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true });
  const bytes = await doc.save({ useObjectStreams: true });
  if (bytes.byteLength >= file.size) return file;
  return new File([bytes as unknown as BlobPart], file.name, { type: "application/pdf" });
}

/** Compresse une image ou un PDF ; renvoie le fichier d'origine si rien à gagner. */
export async function compressFile(file: File): Promise<File> {
  try {
    if (file.type.startsWith("image/") && file.type !== "image/svg+xml") {
      return await compressImage(file);
    }
    if (file.type === "application/pdf" || /\.pdf$/i.test(file.name)) {
      return await compressPdf(file);
    }
  } catch {
    // Compression impossible : on garde le fichier d'origine.
  }
  return file;
}
