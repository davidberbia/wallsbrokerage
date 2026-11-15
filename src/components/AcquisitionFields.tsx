import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { acquisitionCost, type AcquisitionDetails } from "@/lib/comparable-metrics";
import { DMTO_SOURCE } from "@/lib/department-rates";
export function AcquisitionFields({value,price,disabled,onChange}:{value:AcquisitionDetails;price:number;disabled:boolean;onChange:(v:AcquisitionDetails)=>void}) {
  const set=(key:keyof AcquisitionDetails,v:string|number|boolean|null)=>onChange({...value,[key]:v});
  const total=acquisitionCost(price,value);
  return <div className="col-span-full space-y-3 border-b border-border pb-4"><h3>Frais d’acquisition</h3><div className="grid gap-3 sm:grid-cols-2">
    {([["department","Département"],["transaction_date","Date de mutation"]] as const).map(([key,label])=><div key={key}><Label htmlFor={`acq-${key}`}>{label}</Label><Input id={`acq-${key}`} disabled={disabled} type={key==="transaction_date"?"date":"text"} defaultValue={value[key] || ""} onBlur={e=>set(key,e.target.value)}/></div>)}
    {([["keys","Nombre de chambres / clés"],["departmental_rate","Taux départemental confirmé (%)"],["notary_total","Total droits et frais de notaire (€)"],["agency_pct","Honoraires agence (% HT)"],["disbursements","Débours estimés (€)"]] as const).map(([key,label])=><div key={key}><Label htmlFor={`acq-${key}`}>{label}</Label><Input id={`acq-${key}`} type="number" min="0" disabled={disabled} placeholder={key==="agency_pct"?"3":key==="disbursements"?"1200":""} defaultValue={value[key] ?? ""} onBlur={e=>set(key,e.target.value===""?null:Number(e.target.value))}/></div>)}
    {([["reduced_eligible","Régime réduit éligible confirmé (VEFA / neuf soumis à TVA)"],["agency_included","Honoraires déjà compris dans le prix"],["agency_vat_recoverable","TVA des honoraires récupérable"]] as const).map(([key,label])=><Label key={key} className="flex min-h-11 items-center gap-2"><Checkbox disabled={disabled} checked={Boolean(value[key])} onCheckedChange={v=>set(key,v===true)}/>{label}</Label>)}
  </div><p className="text-sm text-muted-foreground">{total ? `Coût acte en main estimé : ${new Intl.NumberFormat("fr-FR",{style:"currency",currency:"EUR",maximumFractionDigits:0}).format(total)}`:"Renseigner les frais notariés ou un taux départemental confirmé pour la date de mutation."}</p><a className="text-sm underline" href={DMTO_SOURCE} target="_blank" rel="noopener noreferrer">Taux officiels juin 2026</a></div>;
}