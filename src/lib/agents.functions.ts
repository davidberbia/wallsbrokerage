import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const requireSuperAdmin = createMiddleware({type:"function"}).middleware([requireSupabaseAuth]).server(async({context,next})=>{
  const {data,error}=await context.supabase.rpc("has_role",{_user_id:context.userId,_role:"admin"});
  if(error || !data)throw new Error("Réservé au super administrateur");return next();
});
export const createCommercialAgent = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .inputValidator(d=>z.object({first_name:z.string().trim().min(1).max(100),last_name:z.string().trim().min(1).max(100),email:z.string().email().max(255),phone:z.string().max(50),address:z.string().max(500),siren:z.string().regex(/^\d{9}$|^$/),birth_date:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")),has_carte_t:z.boolean().optional()}).parse(d))
  .handler(async({data,context})=>{
    const {data:record,error}=await context.supabase.from("commercial_agents").insert({...data,has_carte_t:!!data.has_carte_t,birth_date:data.birth_date || null,siren:data.siren || null}).select("id").single();
    if(error)throw new Error(error.message);
    return {id:record.id};
  });
export const inviteCommercialAgent = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .inputValidator(d=>z.object({id:z.string().uuid()}).parse(d))
  .handler(async({data,context})=>{
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");const {inviteAgentAccount}=await import("@/lib/agent-access.server");
    return inviteAgentAccount(supabaseAdmin,data.id,false);
  });
const FieldsSchema=z.object({denomination:z.string().max(300).optional(),adresse:z.string().max(500).optional(),siren:z.string().max(20).optional(),rsac:z.string().max(100).optional(),assureur:z.string().max(200).optional(),rc_numero:z.string().max(100).optional(),rc_echeance:z.string().max(20).optional(),quote_agent:z.string().max(10).optional(),date_effet:z.string().max(20).optional(),lieu:z.string().max(100).optional(),qualite:z.string().max(100).optional()});
export const saveAgentContractFields = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .inputValidator(d=>z.object({id:z.string().uuid(),email:z.string().email().max(255).optional(),phone:z.string().max(50).optional(),fields:FieldsSchema}).parse(d))
  .handler(async({data,context})=>{
    const patch:{contract_fields:typeof data.fields;email?:string;phone?:string;address?:string;siren?:string}={contract_fields:data.fields};
    if(data.email)patch.email=data.email;if(data.phone!==undefined)patch.phone=data.phone;
    if(data.fields.adresse)patch.address=data.fields.adresse;if(data.fields.siren)patch.siren=data.fields.siren;
    const {error}=await context.supabase.from("commercial_agents").update(patch).eq("id",data.id);if(error)throw new Error(error.message);
    return {ok:true};
  });
// Prépare le contrat rempli en brouillon DocuSign (rien n'est envoyé) et stocke son PDF.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function prepareContract(id:string,db:any){
    const {data:agent}=await db.from("commercial_agents").select("*").eq("id",id).maybeSingle();if(!agent)throw new Error("Agent introuvable");
    if(agent.has_carte_t)throw new Error("Carte T : aucun contrat requis.");
    if(agent.envelope_id && agent.signature_status && !["created","prêt à envoyer","voided","declined"].includes(agent.signature_status))throw new Error("Contrat déjà envoyé : il ne peut plus être modifié.");
    const {missingContractFields,contractValues,fillDocumentXml}=await import("@/lib/agent-contract");
    const fields=(agent.contract_fields ?? {}) as Record<string,string>;const missing=missingContractFields(fields);
    if(missing.length)throw new Error(`À compléter : ${missing.join(", ")}`);
    if(!agent.email)throw new Error("À compléter : email");
    const {data:tpl,error:tplError}=await db.storage.from("agent-contracts").download("templates/contrat-cadre.docx");if(tplError || !tpl)throw new Error("Modèle de contrat introuvable");
    const {unzipSync,zipSync,strFromU8,strToU8}=await import("fflate");
    const files=unzipSync(new Uint8Array(await tpl.arrayBuffer()));const doc=files["word/document.xml"];if(!doc)throw new Error("Modèle invalide");
    files["word/document.xml"]=strToU8(fillDocumentXml(strFromU8(doc),contractValues(fields,`${agent.first_name} ${agent.last_name}`)));
    const docx=zipSync(files);let bin="";for(let i=0;i<docx.length;i+=0x8000)bin+=String.fromCharCode(...docx.subarray(i,i+0x8000));
    const {getDsAccess}=await import("@/lib/docusign.server");const ds=await getDsAccess();const H={Authorization:`Bearer ${ds.token}`,"Content-Type":"application/json"};
    if(agent.envelope_id && agent.signature_status==="prêt à envoyer")await fetch(`${ds.api}/folders/recyclebin`,{method:"PUT",headers:H,body:JSON.stringify({envelopeIds:[agent.envelope_id]})});
    const tab=(a:string)=>({signHereTabs:[{anchorString:a,anchorYOffset:"-10",anchorUnits:"pixels"}],dateSignedTabs:[{anchorString:a,anchorYOffset:"-40",anchorUnits:"pixels"}]});
    const r=await fetch(`${ds.api}/envelopes`,{method:"POST",headers:H,body:JSON.stringify({emailSubject:`Contrat-cadre Wallsbroker — ${agent.first_name} ${agent.last_name}`,documents:[{documentBase64:btoa(bin),name:`Contrat-cadre ${agent.first_name} ${agent.last_name}.docx`,fileExtension:"docx",documentId:"1"}],recipients:{signers:[{email:ds.email || "d.berbia@wallsbroker.com",name:"David Berbia",recipientId:"1",routingOrder:"1",tabs:tab("\\sigwb\\")},{email:agent.email,name:`${agent.first_name} ${agent.last_name}`,recipientId:"2",routingOrder:"2",tabs:tab("\\sigag\\")}]},status:"created"})});
    if(!r.ok)throw new Error(`DocuSign : préparation refusée (${r.status}) ${await r.text()}`);const env=await r.json() as {envelopeId:string};
    const pdf=await fetch(`${ds.api}/envelopes/${env.envelopeId}/documents/combined`,{headers:{Authorization:`Bearer ${ds.token}`}});if(!pdf.ok)throw new Error(`DocuSign : PDF indisponible (${pdf.status})`);
    const path=`agents/${agent.id}/contrat-prepare.pdf`;
    const {error:upError}=await db.storage.from("agent-contracts").upload(path,await pdf.arrayBuffer(),{contentType:"application/pdf",upsert:true});if(upError)throw upError;
    const {error}=await db.from("commercial_agents").update({contract_path:path,envelope_id:env.envelopeId,signature_status:"prêt à envoyer"}).eq("id",agent.id);if(error)throw error;
    return {ok:true};
  }
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function sendContract(id:string,db:any){
  const {data:agent}=await db.from("commercial_agents").select("*").eq("id",id).maybeSingle();if(!agent)throw new Error("Agent introuvable");
  if(!agent.envelope_id || agent.signature_status!=="prêt à envoyer")throw new Error("Préparez d'abord le contrat.");
  const {getDsAccess}=await import("@/lib/docusign.server");const ds=await getDsAccess();
  const r=await fetch(`${ds.api}/envelopes/${agent.envelope_id}`,{method:"PUT",headers:{Authorization:`Bearer ${ds.token}`,"Content-Type":"application/json"},body:JSON.stringify({status:"sent"})});
  if(!r.ok)throw new Error(`DocuSign : envoi refusé (${r.status})`);
  const {error}=await db.from("commercial_agents").update({signature_status:"sent"}).eq("id",agent.id);if(error)throw error;
  return {ok:true};
}
export const prepareAgentContract = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .inputValidator(d=>z.object({id:z.string().uuid()}).parse(d))
  .handler(async({data,context})=>prepareContract(data.id,context.supabase));
export const sendAgentContract = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .inputValidator(d=>z.object({id:z.string().uuid()}).parse(d))
  .handler(async({data,context})=>sendContract(data.id,context.supabase));
// L'agent connecté consulte son propre contrat (lecture seule, PDF).
export const getMyAgentContract = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data:agent}=await supabaseAdmin.from("commercial_agents").select("first_name,last_name,contract_path,signed_contract_path,signature_status").eq("user_id",context.userId).maybeSingle();
    if(!agent)return {url:null,status:null,signed:false};
    const path=agent.signed_contract_path || agent.contract_path;if(!path)return {url:null,status:agent.signature_status,signed:false};
    const {data,error}=await supabaseAdmin.storage.from("agent-contracts").createSignedUrl(path,300,{download:`Contrat-cadre ${agent.first_name} ${agent.last_name}.pdf`});if(error)throw new Error(error.message);
    return {url:data.signedUrl,status:agent.signature_status,signed:!!agent.signed_contract_path};
  });
export const refreshAgentContracts=createServerFn({method:"POST"}).middleware([requireSuperAdmin]).handler(async()=>{
  const {supabaseAdmin}=await import("@/integrations/supabase/client.server");const {syncAgentContracts}=await import("@/lib/agent-access.server");
  return syncAgentContracts(supabaseAdmin);
});
// Champs que l'agent peut compléter lui-même (la quote-part reste fixée par Wallsbroker).
const AGENT_EDITABLE=["denomination","adresse","siren","rsac","assureur","rc_numero","rc_echeance","date_effet"] as const;
export const getMyContractFields = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data:agent}=await supabaseAdmin.from("commercial_agents").select("id,contract_fields,signature_status,has_carte_t").eq("user_id",context.userId).maybeSingle();
    if(!agent)return null;
    if(agent.has_carte_t)return {fields:{} as Record<string,string>,missing:[] as string[],status:null as string|null,carteT:true};
    const {missingContractFields}=await import("@/lib/agent-contract");
    const fields=(agent.contract_fields ?? {}) as Record<string,string>;
    return {fields,missing:missingContractFields(fields),status:agent.signature_status,carteT:false};
  });
export const saveMyContractFields = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
  .inputValidator(d=>z.object({fields:FieldsSchema}).parse(d))
  .handler(async({data,context})=>{
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data:agent}=await supabaseAdmin.from("commercial_agents").select("id,contract_fields,signature_status").eq("user_id",context.userId).maybeSingle();
    if(!agent)throw new Error("Compte agent introuvable");
    if(agent.signature_status && !["prêt à envoyer","created","voided","declined"].includes(agent.signature_status))throw new Error("Contrat déjà envoyé : il ne peut plus être modifié.");
    const next={...((agent.contract_fields ?? {}) as Record<string,string>)};
    for(const k of AGENT_EDITABLE){const v=data.fields[k];if(v!==undefined)next[k]=v;}
    const patch:{contract_fields:Record<string,string>;address?:string;siren?:string}={contract_fields:next};
    if(next["adresse"])patch.address=next["adresse"];if(next["siren"])patch.siren=next["siren"];
    const {error}=await supabaseAdmin.from("commercial_agents").update(patch).eq("id",agent.id);if(error)throw new Error(error.message);
    return {ok:true};
  });
// L'agent génère son contrat : brouillon DocuSign puis envoi (David signe d'abord, puis l'agent).
export const generateMyContract = createServerFn({method:"POST"}).middleware([requireSupabaseAuth])
  .handler(async({context})=>{
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data:agent}=await supabaseAdmin.from("commercial_agents").select("id").eq("user_id",context.userId).maybeSingle();
    if(!agent)throw new Error("Compte agent introuvable");
    await prepareContract(agent.id,supabaseAdmin);
    return sendContract(agent.id,supabaseAdmin);
  });
// Super administrateur : contrat de chaque agent.
export const listAgentContracts = createServerFn({method:"POST"}).middleware([requireSuperAdmin])
  .handler(async()=>{
    const {supabaseAdmin}=await import("@/integrations/supabase/client.server");
    const {data,error}=await supabaseAdmin.from("commercial_agents").select("id,first_name,last_name,contract_path,signed_contract_path,signature_status").order("first_name");if(error)throw error;
    return Promise.all((data??[]).map(async(a)=>{const path=a.signed_contract_path||a.contract_path;let url:string|null=null;
      if(path){const {data:s}=await supabaseAdmin.storage.from("agent-contracts").createSignedUrl(path,300,{download:`Contrat-cadre ${a.first_name} ${a.last_name}.pdf`});url=s?.signedUrl??null;}
      return {id:a.id,name:`${a.first_name} ${a.last_name}`,url,status:a.signature_status,signed:!!a.signed_contract_path};}));
  });
