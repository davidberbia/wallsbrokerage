import { useEffect, useState } from "react";
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
          : <iframe key={doc.url} src={src} title={doc.name} className="min-h-0 w-full flex-1 border border-border bg-background" />)}
      </DialogContent>
    </Dialog>
  );
}
