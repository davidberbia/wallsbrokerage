import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Play, Pause, Square } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { queueExtractions } from "@/lib/extraction.functions";
import { CompactRow, RecordDialog } from "./CompactRow";

export function ExtractionSites() {
  const [urls,setUrls]=useState(""); const [busy,setBusy]=useState(false); const [selected,setSelected]=useState<string|null>(null);
  const start=useServerFn(queueExtractions); const qc=useQueryClient();
  const jobs=useQuery({queryKey:["extraction-jobs"],refetchInterval:30000,queryFn:async()=>{const {data,error}=await supabase.from("extraction_jobs").select("*").eq("kind","site").order("created_at",{ascending:false});if(error)throw error;return data ?? [];}});
  const refresh=()=>qc.invalidateQueries({queryKey:["extraction-jobs"]});
  const detail=jobs.data?.find(j=>j.id===selected);
  return <section className="space-y-3 border-y border-border py-4">
    <h2 className="text-lg">Sites publics</h2>
    <Textarea aria-label="Adresses des sites" placeholder="https://… (une adresse par ligne)" value={urls} onChange={e=>setUrls(e.target.value)} />
    <Button disabled={busy || !urls.trim()} onClick={async()=>{setBusy(true);try{const r=await start({data:{urls:urls.split(/\n/).map(v=>v.trim()).filter(Boolean)}});toast.success(`${r.count} sites en attente`);setUrls("");await refresh();}catch(e){toast.error(e instanceof Error?e.message:"Échec");}finally{setBusy(false);}}}><Plus className="size-4"/>Lancer les extractions</Button>
    {jobs.data?.map(j=><CompactRow key={j.id} title={j.url || "Site"} subtitle={j.error || ({pending:"En attente",running:"En cours",done:"Terminé",paused:"En pause",stopped:"Arrêté",failed:"Erreur"} as Record<string,string>)[j.status] || j.status} onOpen={()=>setSelected(j.id)} trailing={<><Button size="icon" variant="ghost" title={j.status==="pending" ? "Pause" : "Reprendre"} onClick={async()=>{if(j.status==="pending"){await supabase.from("extraction_jobs").update({status:"paused"}).eq("id",j.id);}else if(j.url){await start({data:{urls:[j.url]}});}await refresh();}}>{j.status==="pending"?<Pause className="size-4"/>:<Play className="size-4"/>}</Button><Button size="icon" variant="ghost" title="Arrêter" onClick={async()=>{await supabase.from("extraction_jobs").update({status:"stopped"}).eq("id",j.id);await refresh();}}><Square className="size-4"/></Button></>}/>)}
    <RecordDialog title={detail?.url || "Extraction"} open={!!detail} onClose={()=>setSelected(null)}>{detail && <p className="whitespace-pre-wrap break-words text-sm">{detail.error || JSON.stringify(detail.result,null,2) || "En attente"}</p>}</RecordDialog>
  </section>;
}