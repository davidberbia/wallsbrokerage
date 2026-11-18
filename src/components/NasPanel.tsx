import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Copy, Download, KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { createNasKey, assignNasFolder } from "@/lib/nas.functions";

export function NasPanel() {
  const qc = useQueryClient();
  const genKey = useServerFn(createNasKey);
  const assign = useServerFn(assignNasFolder);
  const [key, setKey] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["nas-status"],
    queryFn: async () => {
      const [k, files, pending] = await Promise.all([
        supabase.from("nas_ingest_keys").select("key_hint, last_used_at, created_at").eq("revoked", false).maybeSingle(),
        supabase.from("nas_files").select("id", { count: "exact", head: true }),
        supabase.from("nas_folders").select("id, folder_path, candidates").eq("status", "pending").order("folder_path").limit(100),
      ]);
      const ids = [...new Set((pending.data ?? []).flatMap((f) => (f.candidates as string[]) ?? []))];
      const { data: assets } = ids.length ? await supabase.from("assets").select("id, title, address").in("id", ids) : { data: [] };
      return { key: k.data, files: files.count ?? 0, pending: pending.data ?? [], assets: assets ?? [] };
    },
  });

  const create = useMutation({
    mutationFn: () => genKey(),
    onSuccess: (r) => { setKey(r.key); qc.invalidateQueries({ queryKey: ["nas-status"] }); },
    onError: (e) => toast.error(e.message),
  });
  const link = useMutation({
    mutationFn: (v: { folder_id: string; asset_id: string }) => assign({ data: v }),
    onSuccess: (r) => { toast.success(`${r.count} fichier(s) rattaché(s)`); qc.invalidateQueries({ queryKey: ["nas-status"] }); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="panel p-5">
        <h2 className="text-lg">Serveur NAS</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {data?.key ? `Clé active …${data.key.key_hint} · dernier envoi ${data.key.last_used_at ? new Date(data.key.last_used_at).toLocaleString("fr-FR") : "jamais"}` : "Aucune clé active."}
          {" · "}{data?.files ?? 0} fichier(s) reçu(s)
        </p>
        {key && (
          <div className="mt-3 rounded-md border border-border p-3">
            <p className="text-xs text-muted-foreground">Copiez cette clé maintenant, elle ne sera plus affichée.</p>
            <p className="mt-1 break-all font-mono text-sm">{key}</p>
            <Button variant="outline" className="mt-2 min-h-11" onClick={() => { navigator.clipboard.writeText(key); toast.success("Clé copiée"); }}>
              <Copy className="size-4" /> Copier
            </Button>
          </div>
        )}
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          <Button className="min-h-11" onClick={() => create.mutate()} disabled={create.isPending}>
            <KeyRound className="size-4" /> {data?.key ? "Nouvelle clé" : "Générer la clé"}
          </Button>
          <Button asChild variant="outline" className="min-h-11">
            <a href="/nas/walls_nas.zip" download><Download className="size-4" /> Programme Windows</a>
          </Button>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Décompressez, double-cliquez « Lancer_Walls_NAS.bat », collez la clé puis le dossier (ex. Z:\Investissement).
        </p>
      </div>

      {!!data?.pending.length && (
        <div className="panel p-5">
          <h2 className="text-lg">À rattacher ({data.pending.length})</h2>
          <div className="mt-3 space-y-3">
            {data.pending.map((f) => (
              <div key={f.id} className="rounded-md border border-border p-3">
                <p className="break-all text-sm font-medium">{f.folder_path}</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {((f.candidates as string[]) ?? []).map((id) => {
                    const a = data.assets.find((x) => x.id === id);
                    return (
                      <Button key={id} variant="outline" className="min-h-11" disabled={link.isPending} onClick={() => link.mutate({ folder_id: f.id, asset_id: id })}>
                        {a ? `${a.title}${a.address ? ` · ${a.address}` : ""}` : id.slice(0, 8)}
                      </Button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
