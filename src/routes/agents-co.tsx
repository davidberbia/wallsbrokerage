import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Plus, Mail, RefreshCw, Download, FileSignature, Send } from "lucide-react";
import { toast } from "sonner";
import { AppLayout } from "@/components/AppLayout";
import { CompactRow, RecordDialog } from "@/components/CompactRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { autoSiren, fillEmpty } from "@/lib/siren-autofill";
import { supabase } from "@/integrations/supabase/client";
import { missingContractFields, type AgentContractFields } from "@/lib/agent-contract";
import {
  createCommercialAgent,
  inviteCommercialAgent,
  prepareAgentContract,
  refreshAgentContracts,
  saveAgentContractFields,
  sendAgentContract,
} from "@/lib/agents.functions";

export const Route = createFileRoute("/agents-co")({
  head: () => ({
    meta: [
      { title: "Agents Co — Wallsbrokerage" },
      { name: "description", content: "Registre privé des agents commerciaux et contrats signés." },
      { property: "og:title", content: "Agents Co — Wallsbrokerage" },
      { property: "og:description", content: "Gestion sécurisée des comptes et contrats des agents commerciaux." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <AgentsPage />
    </AppLayout>
  ),
});

const STATUS: Record<string, string> = {
  "prêt à envoyer": "Prêt — à signer par David puis l'agent",
  sent: "Envoyé pour signature",
  delivered: "Ouvert par un signataire",
  completed: "Signé par tous",
  declined: "Refusé",
  voided: "Annulé",
};
type Agent = {
  id: string; first_name: string; last_name: string; email: string; phone: string | null;
  user_id: string | null; contract_fields: unknown; contract_path: string | null;
  signed_contract_path: string | null; signature_status: string | null; envelope_id: string | null; hidden_from_team?: boolean;
};
const STEPS: { title: string; fields: [keyof AgentContractFields, string, string?][] }[] = [
  { title: "Statut et société", fields: [["denomination", "Nom ou société"], ["adresse", "Adresse / siège social"], ["siren", "SIREN"], ["rsac", "RSAC (facultatif)"], ["qualite", "Qualité (ex. Agent commercial indépendant)"]] },
  { title: "Rémunération", fields: [["quote_agent", "Quote-part de l'agent (%)", "number"]] },
  { title: "Prise d'effet", fields: [["date_effet", "Date d'effet", "date"], ["lieu", "Lieu de signature (Paris par défaut)"]] },
];

function AgentsPage() {
  const { isSuperAdmin } = useAuth();
  const qc = useQueryClient();
  const [selected, setSelected] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const refreshSign = useServerFn(refreshAgentContracts);
  const agents = useQuery({
    queryKey: ["commercial-agents"],
    enabled: isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase.from("commercial_agents").select("*").order("last_name");
      if (error) throw error;
      return (data ?? []) as Agent[];
    },
  });
  const detail = agents.data?.find((a) => a.id === selected);
  const refresh = () => qc.invalidateQueries({ queryKey: ["commercial-agents"] });
  if (!isSuperAdmin) return <p>Accès réservé au super administrateur.</p>;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl">Agents Co</h1>
        <div className="flex gap-2">
          <Button size="icon" variant="outline" className="min-h-11 min-w-11" title="Actualiser les signatures" disabled={busy}
            onClick={async () => { setBusy(true); try { await refreshSign(); await refresh(); } catch (e) { toast.error((e as Error).message); } setBusy(false); }}>
            <RefreshCw className="size-4" />
          </Button>
          <Button className="min-h-11" onClick={() => setNewOpen(true)}><Plus className="size-4" />Créer</Button>
        </div>
      </div>
      <div className="border-y border-border">
        {agents.data?.map((a) => {
          const missing = missingContractFields((a.contract_fields ?? {}) as AgentContractFields);
          return (
            <CompactRow key={a.id} title={`${a.first_name} ${a.last_name}`} subtitle={a.email || "Email manquant"}
              summary={a.signature_status ? (STATUS[a.signature_status] ?? a.signature_status) : missing.length ? `${missing.length} champ(s) à compléter` : "Contrat à préparer"}
              onOpen={() => setSelected(a.id)} onEdit={() => setSelected(a.id)} />
          );
        })}
      </div>
      <RecordDialog title="Nouvel agent commercial" open={newOpen} onClose={() => setNewOpen(false)}>
        {newOpen && <NewAgent onCreated={async (id) => { await refresh(); setNewOpen(false); setSelected(id); }} />}
      </RecordDialog>
      <RecordDialog title={detail ? `${detail.first_name} ${detail.last_name}` : "Agent"} open={!!detail} onClose={() => setSelected(null)}>
        {detail && <AgentContract key={detail.id} agent={detail} onChange={refresh} />}
      </RecordDialog>
    </div>
  );
}

function NewAgent({ onCreated }: { onCreated: (id: string) => Promise<void> }) {
  const create = useServerFn(createCommercialAgent);
  const [f, setF] = useState({ first_name: "", last_name: "", email: "", phone: "" });
  const [busy, setBusy] = useState(false);
  return (
    <form className="space-y-3" onSubmit={async (e) => {
      e.preventDefault(); setBusy(true);
      try { const r = await create({ data: { ...f, address: "", siren: "", birth_date: "" } }); await onCreated(r.id); }
      catch (err) { toast.error((err as Error).message); }
      setBusy(false);
    }}>
      <p className="eyebrow">Étape 1 sur 5 · Identité</p>
      {([["first_name", "Prénom"], ["last_name", "Nom"], ["email", "Email"], ["phone", "Téléphone"]] as const).map(([k, l]) => (
        <div key={k} className="space-y-1">
          <Label htmlFor={`n-${k}`}>{l}</Label>
          <Input id={`n-${k}`} className="min-h-11" required={k !== "phone"} type={k === "email" ? "email" : "text"} value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
        </div>
      ))}
      <Button className="min-h-11 w-full" disabled={busy} type="submit">Suivant</Button>
    </form>
  );
}

function AgentContract({ agent, onChange }: { agent: Agent; onChange: () => Promise<unknown> }) {
  const save = useServerFn(saveAgentContractFields);
  const prepare = useServerFn(prepareAgentContract);
  const send = useServerFn(sendAgentContract);
  const invite = useServerFn(inviteCommercialAgent);
  const [fields, setFields] = useState<AgentContractFields>((agent.contract_fields ?? {}) as AgentContractFields);
  const [email, setEmail] = useState(agent.email ?? "");
  const [phone, setPhone] = useState(agent.phone ?? "");
  const locked = !!agent.signature_status && agent.signature_status !== "prêt à envoyer" && !["declined", "voided"].includes(agent.signature_status);
  const [step, setStep] = useState(locked || agent.signature_status === "prêt à envoyer" ? STEPS.length : 0);
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => Promise<unknown>, ok?: string) => {
    setBusy(true);
    try { await fn(); await onChange(); if (ok) toast.success(ok); } catch (e) { toast.error((e as Error).message); }
    setBusy(false);
  };
  const persist = () => save({ data: { id: agent.id, email: email || undefined, phone, fields } });
  const missing = missingContractFields(fields);
  const openPdf = async (path: string) => {
    const { data, error } = await supabase.storage.from("agent-contracts").createSignedUrl(path, 300);
    if (error) return void toast.error(error.message);
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  };
  return (
    <div className="space-y-4">
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" defaultChecked={!!agent.hidden_from_team} disabled={busy}
          onChange={(e) => { const v = e.target.checked; void run(async () => { const { error } = await supabase.from("commercial_agents").update({ hidden_from_team: v }).eq("id", agent.id); if (error) throw error; }, "Enregistré"); }} />
        Masqué au responsable d'équipe
      </label>
      <p className="text-sm"><FileSignature className="inline size-4" /> {agent.signature_status ? (STATUS[agent.signature_status] ?? agent.signature_status) : "Contrat non préparé"}</p>
      {step < STEPS.length && !locked && (
        <div className="space-y-3">
          <p className="eyebrow">Étape {step + 2} sur 5 · {STEPS[step]!.title}</p>
          {step === 0 && (
            <>
              <Label>Email</Label><Input className="min-h-11" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              <Label>Téléphone</Label><Input className="min-h-11" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </>
          )}
          {STEPS[step]!.fields.map(([k, l, t]) => (
            <div key={k} className="space-y-1">
              <Label>{l}</Label>
              <Input className="min-h-11" type={t ?? "text"} value={fields[k] ?? ""} onChange={(e) => { const v = e.target.value; setFields({ ...fields, [k]: v }); if (k === "siren") void autoSiren(v, (r) => setFields((p) => fillEmpty(p, { denomination: r.company_name, adresse: r.address } as Partial<Record<keyof AgentContractFields, string>>))); }} />
            </div>
          ))}
          {step === 1 && fields.quote_agent && <p className="text-sm text-muted-foreground">Wallsbroker conserve {100 - Number(fields.quote_agent)} %.</p>}
          <div className="grid grid-cols-2 gap-2">
            <Button variant="outline" className="min-h-11" disabled={busy || step === 0} onClick={() => setStep(step - 1)}>Retour</Button>
            <Button className="min-h-11" disabled={busy} onClick={() => run(async () => { await persist(); setStep(step + 1); })}>Suivant</Button>
          </div>
        </div>
      )}
      {(step >= STEPS.length || locked) && (
        <div className="space-y-3">
          <p className="eyebrow">Étape 5 sur 5 · Contrat</p>
          {missing.length > 0 && !locked && <p className="text-sm text-destructive">À compléter : {missing.join(", ")}</p>}
          {!locked && (
            <Button variant="outline" className="min-h-11 w-full" disabled={busy || missing.length > 0}
              onClick={() => run(() => prepare({ data: { id: agent.id } }), "Contrat préparé — rien n'a été envoyé")}>
              Préparer le contrat
            </Button>
          )}
          {(agent.signed_contract_path || agent.contract_path) && (
            <Button variant="outline" className="min-h-11 w-full" onClick={() => void openPdf(agent.signed_contract_path || agent.contract_path || "")}>
              <Download className="size-4" />{agent.signed_contract_path ? "Contrat signé" : "Voir le contrat préparé"}
            </Button>
          )}
          {agent.signature_status === "prêt à envoyer" && (
            <Button className="min-h-11 w-full" disabled={busy}
              onClick={() => { if (window.confirm("Envoyer le contrat en signature DocuSign à vous puis à l'agent ?")) void run(() => send({ data: { id: agent.id } }), "Contrat envoyé"); }}>
              <Send className="size-4" />Envoyer pour signature DocuSign
            </Button>
          )}
          {!locked && <Button variant="ghost" className="min-h-11 w-full" onClick={() => setStep(0)}>Modifier les informations</Button>}
        </div>
      )}
      <Button variant="outline" className="min-h-11 w-full" disabled={busy || !!agent.user_id || !agent.email}
        onClick={() => run(() => invite({ data: { id: agent.id } }), "Invitation envoyée")}>
        <Mail className="size-4" />{agent.user_id ? "Compte créé" : "Inviter au compte vierge"}
      </Button>
    </div>
  );
}
