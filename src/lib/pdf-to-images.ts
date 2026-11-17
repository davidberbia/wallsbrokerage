// Convertit chaque page d'un PDF en image JPEG (navigateur uniquement).
export async function pdfToImages(data: ArrayBuffer, scale = 2, only?: number[]): Promise<string[]> {
  const pdfjs = await import("pdfjs-dist");
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
  (pdfjs as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
  const doc = await pdfjs.getDocument({ data } as Parameters<typeof pdfjs.getDocument>[0]).promise;
  const out: string[] = [];
  for (let p = 1; p <= doc.numPages; p++) {
    if (only && !only.includes(p)) continue;
    const page = await doc.getPage(p);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
    out.push(canvas.toDataURL("image/jpeg", 0.9));
  }
  return out;
}
