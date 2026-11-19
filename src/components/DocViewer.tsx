import { useEffect, useRef, useState } from "react";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Doc = { url: string; download: string; name: string };

/** Visionneuse globale : PDF et images affichés directement, fichiers Office via la visionneuse Microsoft. */
export function DocViewer() {
  const [doc, setDoc] = useState<Doc | null>(null);
  useEffect(() => {
    const on = (e: Event) => setDoc((e as CustomEvent<Doc>).detail);
    window.addEventListener("doc-viewer", on);
    return () => window.removeEventListener("doc-viewer", on);
  }, []);
  const ext = (doc?.name.split(".").pop() || doc?.url.split("?")[0]?.split(".").pop() || "").toLowerCase();
  const isImg = /^(png|jpe?g|webp|gif|bmp|svg|avif)$/.test(ext);
  const isOffice = /^(docx?|xlsx?|pptx?)$/.test(ext);
  const isPdf = ext === "pdf";
  const src = isOffice ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(doc?.url ?? "")}` : doc?.url;
  return (
    <Dialog open={!!doc} onOpenChange={(o) => !o && setDoc(null)}>
      <DialogContent className="flex h-[92dvh] w-[96vw] max-w-5xl flex-col gap-2 p-3">
        <DialogHeader className="flex-row items-center gap-2 space-y-0 pr-8">
          <DialogTitle className="min-w-0 flex-1 truncate text-sm">{doc?.name}</DialogTitle>
          {doc && <Button asChild size="sm" className="min-h-11 shrink-0"><a href={doc.download} download={doc.name}><Download className="size-4" />Télécharger</a></Button>}
        </DialogHeader>
        {doc && (isImg
          ? <div className="flex min-h-0 flex-1 items-center justify-center overflow-auto bg-muted"><img src={doc.url} alt={doc.name} className="max-h-full max-w-full object-contain" /></div>
          : isPdf ? <PdfPages key={doc.url} url={doc.url} />
          : <iframe key={doc.url} src={src} title={doc.name} className="min-h-0 w-full flex-1 border border-border bg-background" />)}
      </DialogContent>
    </Dialog>
  );
}

/** PDF affiché page par page dans le CRM (pdf.js) : jamais de téléchargement automatique. */
function PdfPages({ url }: { url: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  useEffect(() => {
    let off = false;
    (async () => {
      try {
        const pdfjs = await import("pdfjs-dist");
        const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default;
        (pdfjs as { GlobalWorkerOptions: { workerSrc: string } }).GlobalWorkerOptions.workerSrc = workerUrl;
        const data = new Uint8Array(await (await fetch(url)).arrayBuffer());
        const pdf = await pdfjs.getDocument({ data } as Parameters<typeof pdfjs.getDocument>[0]).promise;
        const el = box.current; if (!el || off) return;
        el.innerHTML = "";
        const width = Math.min(el.clientWidth - 16, 1100);
        for (let i = 1; i <= pdf.numPages && !off; i++) {
          const page = await pdf.getPage(i);
          const base = page.getViewport({ scale: 1 });
          const scale = (width / base.width) * Math.min(window.devicePixelRatio || 1, 2);
          const vp = page.getViewport({ scale });
          const c = document.createElement("canvas");
          c.width = vp.width; c.height = vp.height;
          c.style.width = `${width}px`; c.className = "mx-auto mb-2 block bg-background shadow";
          el.appendChild(c);
          await page.render({ canvas: c, canvasContext: c.getContext("2d")!, viewport: vp } as never).promise;
          if (i === 1) setState("ok");
        }
      } catch { if (!off) setState("error"); }
    })();
    return () => { off = true; };
  }, [url]);
  return (
    <div className="relative min-h-0 flex-1 overflow-auto bg-muted p-2">
      {state !== "ok" && <p className="absolute inset-0 flex items-center justify-center text-sm text-muted-foreground">{state === "loading" ? "Chargement…" : "Aperçu impossible : utilisez Télécharger."}</p>}
      <div ref={box} />
    </div>
  );
}
