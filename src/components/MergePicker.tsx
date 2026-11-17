import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export type MergeItem = { id: string; title: string; subtitle?: string | undefined; extra?: string | undefined };
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

/** Fenêtre de fusion : recherche pré-remplie (ville), cases à cocher. */
export function MergePicker({ title, items, initialSearch, open, onClose, onMerge, busy }: {
  title: string; items: MergeItem[]; initialSearch: string; open: boolean; busy?: boolean;
  onClose: () => void; onMerge: (ids: string[]) => void;
}) {
  const [q, setQ] = useState(initialSearch);
  const [pick, setPick] = useState<string[]>([]);
  useEffect(() => { if (open) { setQ(initialSearch); setPick([]); } }, [open, initialSearch]);
  const words = norm(q).split(/[^a-z0-9]+/).filter((w) => w.length > 1).map((w) => (w.length > 5 ? w.slice(0, w.length - 1) : w));
  const shown = items.filter((i) => pick.includes(i.id) || !words.length || words.some((w) => norm(`${i.title} ${i.subtitle ?? ""} ${i.extra ?? ""}`).includes(w)));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Fusionner dans « {title} »</DialogTitle></DialogHeader>
        <Input placeholder="Rechercher (ville, nom…)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="space-y-1">
          {shown.map((c) => (
            <label key={c.id} className="flex min-h-11 items-center gap-3 border-b border-border py-2 text-sm">
              <Checkbox checked={pick.includes(c.id)} onCheckedChange={(v) => setPick((p) => (v ? [...p, c.id] : p.filter((x) => x !== c.id)))} />
              <span className="min-w-0">
                <span className="block font-medium">{c.title}</span>
                {c.subtitle && <span className="block text-xs text-muted-foreground">{c.subtitle}</span>}
                {c.extra && <span className="block break-all text-xs text-muted-foreground">{c.extra}</span>}
              </span>
            </label>
          ))}
          {!shown.length && <p className="text-sm text-muted-foreground">Aucune ligne trouvée.</p>}
        </div>
        <DialogFooter>
          <Button className="min-h-11 w-full sm:w-auto" disabled={!pick.length || busy} onClick={() => onMerge(pick)}>
            {busy ? "Fusion…" : "Fusionner"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
