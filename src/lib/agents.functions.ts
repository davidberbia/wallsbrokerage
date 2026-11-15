import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const requireSuperAdmin = createMiddleware({type:"function"}).middleware([requireSupabaseAuth]).server(async({context,next})=>{
  const {data,error}=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
  if(error || !data)throw new Error("Réservé au super administrateur");return next();
});
export const createCommercialAgent = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .inputValidator(d=>z.object({first_name:z.string().trim().min(1).max(100),last_name:z.string().trim().min(1).max(100),email:z.string().email().max(255),phone:z.string().max(50),address:z.string().max(500),siren:z.string().regex(/^\d{9}$|^$/),birth_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal(""))}).parse(d))
  .handler(async({data,context})=>{
    const {data:record,error}=await context.supabase.from("commercial_agents").insert({...data,birth_date:data.birth_date || null,siren:data.siren || null}).select("id").single();
    if(error)throw new Error(error.message);
    return {id:record.id};
  });
export const inviteCommercialAgent = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .inputValidator(d=>z.object({id:z.string().uuid()}).parse(d))
  .handler(async({data,context})=>{
    const {data:agent}=await context.supabase.from("commercial_agents").select("*").eq("id",data.id).maybeSingle();
    if(!agent || agent.user_id)throw new Error("Fiche introuvable ou compte déjà créé");
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data:users,error:listError}=await supabaseAdmin.auth.admin.listUsers({page:1,perPage:1000});if(listError)throw listError;
    if(users.users.some(u=>u.email?.toLowerCase()===agent.email.toLowerCase()))throw new Error("Un compte utilise déjà cet email ; aucun compte existant ne sera modifié.");
    const {data:invite,error}=await supabaseAdmin.auth.admin.inviteUserByEmail(agent.email,{redirectTo:"https://wallsbrokerage.com/reset-password"});
    if(error || !invite.user)throw new Error(error?.message || "Invitation impossible");
    const {error:roleError}=await supabaseAdmin.from("user_roles").insert({user_id:invite.user.id,role:"broker"});
    if(roleError)throw new Error("Invitation envoyée mais rôle non attribué ; compte sans accès commercial.");
    const {error:linkError}=await context.supabase.from("commercial_agents").update({user_id:invite.user.id}).eq("id",agent.id);if(linkError)throw linkError;
    return {ok:true};
  });
export const sendAgentContract = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .inputValidator(d=>z.object({id:z.string().uuid(),name:z.string().min(1).max(200),base64:z.string().min(10).max(14000000)}).parse(d))
  .handler(async({data,context})=>{
    const {data:agent}=await context.supabase.from("commercial_agents").select("*").eq("id",data.id).maybeSingle();if(!agent)throw new Error("Agent introuvable");
    if(agent.envelope_id)throw new Error("Un contrat a déjà été envoyé ; vérifiez son statut avant un nouvel envoi.");
    const {getDsAccess}=await import("@/lib/docusign.server");const ds=await getDsAccess();
    const bytes=Uint8Array.from(atob(data.base64),c=>c.charCodeAt(0));
    const path=`agents/${agent.id}/${crypto.randomUUID()}.pdf`;
    const {error:uploadError}=await context.supabase.storage.from("agent-contracts").upload(path,bytes,{contentType:"application/pdf"});if(uploadError)throw uploadError;
    const r=await fetch(`${ds.api}/envelopes`,{method:"POST",headers:{Authorization:`Bearer ${ds.token}`,"Content-Type":"application/json"},body:JSON.stringify({emailSubject:`Contrat agent commercial — ${agent.first_name} ${agent.last_name}`,documents:[{documentBase64:data.base64,name:data.name,fileExtension:"pdf",documentId:"1"}],recipients:{signers:[{email:agent.email,name:`${agent.first_name} ${agent.last_name}`,recipientId:"1",routingOrder:"1"},{email:ds.email || "d.berbia@wallsbroker.com",name:"David Berbia",recipientId:"2",routingOrder:"1"}]},status:"sent"})});
    if(!r.ok)throw new Error(`DocuSign : envoi refusé (${r.status})`);const envelope=await r.json() as {envelopeId:string};
    const {error}=await context.supabase.from("commercial_agents").update({contract_path:path,envelope_id:envelope.envelopeId,signature_status:"sent"}).eq("id",agent.id);if(error)throw error;
    return {ok:true};
  });
export const refreshAgentContracts=createServerFn({method:"POST"}).middleware([requireSuperAdmin]).handler(async({context})=>{
  const {data:agents}=await context.supabase.from("commercial_agents").select("id,envelope_id,signed_contract_path").not("envelope_id","is",null);
  if(!agents?.length)return {updated:0};const {getDsAccess}=await import("@/lib/docusign.server");const ds=await getDsAccess();let updated=0;
  for(const agent of agents.slice(0,20)){
    const r=await fetch(`${ds.api}/envelopes/${agent.envelope_id}`,{headers:{Authorization:`Bearer ${ds.token}`}});if(!r.ok)throw new Error(`DocuSign : suivi indisponible (${r.status})`);
    const envelope=await r.json() as {status:string};let path=agent.signed_contract_path;
    if(envelope.status==="completed" && !path){const doc=await fetch(`${ds.api}/envelopes/${agent.envelope_id}/documents/combined`,{headers:{Authorization:`Bearer ${ds.token}`}});if(!doc.ok)throw new Error("Contrat signé indisponible");path=`agents/${agent.id}/signed-${agent.envelope_id}.pdf`;const {error}=await context.supabase.storage.from("agent-contracts").upload(path,await doc.arrayBuffer(),{contentType:"application/pdf",upsert:true});if(error)throw error;}
    const {error}=await context.supabase.from("commercial_agents").update({signature_status:envelope.status,signed_contract_path:path}).eq("id",agent.id);if(error)throw error;updated++;
  }return {updated};
});