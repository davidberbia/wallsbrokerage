import { createServerFn } from "@tanstack/react-start";
import { requireStaffAuth } from "@/lib/staff-middleware";
import { z } from "zod";
import { publicSiteUrl } from "./extraction-policy";

export const queueExtractions = createServerFn({method:"POST"}).middleware([requireStaffAuth])
  .inputValidator(d=>z.object({urls:z.array(z.string().max(2000)).min(1).max(30)}).parse(d))
  .handler(async ({data,context})=>{
    const urls = [...new Set(data.urls.map(publicSiteUrl))];
    const {error}=await context.supabase.from("extraction_jobs").upsert(urls.map(url=>({owner_id:context.userId,url,kind:"site",status:"pending",error:null})),{onConflict:"owner_id,url"});
    if(error)throw new Error(error.message);
    const {error:wake}=await context.supabase.rpc("wake_extractions");
    if(wake)throw new Error("Sites enregistrés ; démarrage automatique indisponible.");
    return {count:urls.length};
  });
export const queueTargetResearch = createServerFn({method:"POST"}).middleware([requireStaffAuth])
  .inputValidator(d=>z.object({id:z.string().uuid()}).parse(d))
  .handler(async ({data,context})=>{
    const {data:target}=await context.supabase.from("deals").select("id,stage,owner_id").eq("id",data.id).maybeSingle();
    if(!target || target.stage!=="Cible")throw new Error("Actif à relancer introuvable.");
    const {error}=await context.supabase.from("extraction_jobs").upsert({owner_id:context.userId,target_id:data.id,kind:"research",status:"pending",error:null},{onConflict:"owner_id,kind,target_id"});
    if(error)throw new Error(error.message);
    const {error:wake}=await context.supabase.rpc("wake_extractions");if(wake)throw new Error("Recherche enregistrée ; démarrage automatique indisponible.");
    return {ok:true};
  });