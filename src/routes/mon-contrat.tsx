import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { autoSiren, fillEmpty } from "@/lib/siren-autofill";
import { useAuth } from "@/hooks/useAuth";
import { Download } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { generateMyContract, getMyAgentContract, getMyContractFields, listAgentContracts, saveMyContractFields } from "@/lib/agents.functions";

export const Route = createFileRoute("/mon-contrat")({
  head: () => ({
    meta: [
      { title: "Mon contrat — Wallsbrokerage" },
      { name: "description", content: "Consultez et téléchargez votre contrat-cadre Wallsbroker." },
      { property: "og:title", content: "Mon contrat — Wallsbrokerage" },
      { property: "og:description", content: "Contrat-cadre de collaboration commerciale de l'agent." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <MyContract />
    </AppLayout>
  ),
});

const FIELDS: [string, string, string][] = [
  ["denomination", "Nom ou société", "text"],
  ["adresse", "Adresse / siège", "text"],
  ["siren", "SIREN", "text"],
  ["rsac", "N° RSAC (si inscrit)", "text"],
  ["date_effet", "Date d'effet souhaitée", "date"],
];

const BENEFITS = [
  "Créez et gérez vos biens en quelques clics",
  "Générez automatiquement un teaser professionnel",
  "Envoyez-le à vos clients et recevez l'accusé de réception et de lecture : votre antériorité est prouvée",
  "Créez et faites signer vos mandats par DocuSign automatiquement",
  "Accédez aux comparables de toute l'entreprise",
  "Suivez votre chiffre d'affaires en temps réel",
  "Ne ratez plus une relance : le CRM vous signale les prospects à rappeler",
];

function MyContract() {
  const { isSuperAdmin } = useAuth();
  return isSuperAdmin ? <AllContracts /> : <AgentContract />;
}

function ContractCard({ url, signed }: { url: string | null; signed: boolean }) {
  if (!url) return <p className="panel p-6 text-sm text-muted-foreground">Contrat pas encore disponible.</p>;
  return (
    <div className="panel space-y-3 p-6">
      <p className="text-sm">{signed ? "Contrat signé par les deux parties." : "Contrat en attente de signature."}</p>
      <Button className="min-h-11 w-full sm:w-auto" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
        <Download className="size-4" />Voir et télécharger (PDF)
      </Button>
    </div>
  );
}

function AllContracts() {
  const list = useServerFn(listAgentContracts);
  const q = useQuery({ queryKey: ["all-contracts"], queryFn: () => list() });
  const [id, setId] = useState("");
  const current = q.data?.find((a) => a.id === id) ?? q.data?.[0];
  return (
    <div className="space-y-4">
      <p className="eyebrow">Agents commerciaux</p>
      <h1 className="text-3xl">Contrats</h1>
      {q.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {q.data && (
        <select aria-label="Agent" value={current?.id ?? ""} onChange={(e) => setId(e.target.value)}
          className="min-h-11 w-full rounded-sm border border-border bg-card px-3 text-sm sm:w-64">
          {q.data.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      )}
      {current && <ContractCard url={current.url} signed={current.signed} />}
    </div>
  );
}

function AgentContract() {
  const qc = useQueryClient();
  const get = useServerFn(getMyAgentContract);
  const getFields = useServerFn(getMyContractFields);
  const save = useServerFn(saveMyContractFields);
  const generate = useServerFn(generateMyContract);
  const q = useQuery({ queryKey: ["my-contract"], queryFn: () => get() });
  const f = useQuery({ queryKey: ["my-contract-fields"], queryFn: () => getFields() });
  const [draft, setDraft] = useState<Record<string, string> | null>(null);
  const [busy, setBusy] = useState(false);
  const fields = draft ?? f.data?.fields ?? {};
  const editable = !f.data?.status || ["prêt à envoyer", "created", "voided", "declined"].includes(f.data.status);
  const run = async (fn: () => Promise<unknown>, ok: string) => {
    setBusy(true);
    try { await fn(); toast.success(ok); setDraft(null); await qc.invalidateQueries({ queryKey: ["my-contract"] }); await qc.invalidateQueries({ queryKey: ["my-contract-fields"] }); }
    catch (e) { toast.error(e instanceof Error ? e.message : "Erreur"); }
    finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <p className="eyebrow">Agent commercial</p>
      <h1 className="text-3xl">Mon contrat</h1>
      {(q.isLoading || f.isLoading) && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {f.data?.carteT && <p className="panel p-6 text-sm">Aucun contrat requis (carte T).</p>}
      {f.data && !f.data.carteT && editable && (
        <div className="panel space-y-3 p-6">
          <p className="text-sm">Complétez vos informations pour générer votre contrat d'agent commercial et le signer en ligne.</p>
          {FIELDS.map(([k, label, type]) => (
            <label key={k} className="block space-y-1 text-sm">
              <span>{label}</span>
              <Input type={type} className="min-h-11" value={fields[k] ?? ""} onChange={(e) => { const v = e.target.value; setDraft({ ...fields, [k]: v }); if (k === "siren") void autoSiren(v, (r) => setDraft((p) => fillEmpty(p ?? {}, { denomination: r.company_name, adresse: r.address }))); }} />
            </label>
          ))}
          <p className="text-xs text-muted-foreground">Pas encore inscrit au RSAC ? Le contrat mentionne votre engagement de vous immatriculer à vos frais.</p>
          <p className="text-sm text-muted-foreground">Votre quote-part : {fields["quote_agent"] ? `${fields["quote_agent"]} %` : "à définir par Wallsbroker"}</p>
          <div className="grid gap-2 sm:flex">
            <Button variant="outline" className="min-h-11" disabled={busy || !draft} onClick={() => run(() => save({ data: { fields } }), "Enregistré")}>Enregistrer</Button>
            <Button className="min-h-11" disabled={busy || !!draft || (f.data.missing.length > 0)} onClick={() => run(() => generate(), "Contrat envoyé en signature électronique")}>Générer et signer mon contrat</Button>
          </div>
          {f.data.missing.length > 0 && <p className="text-xs text-muted-foreground">À compléter : {f.data.missing.join(", ")}</p>}
        </div>
      )}
      {q.data && !f.data?.carteT && <ContractCard url={q.data.url} signed={q.data.signed} />}
      <div className="panel space-y-2 p-6">
        <p className="font-medium">Votre CRM travaille pour vous</p>
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {BENEFITS.map((b) => <li key={b}>{b}</li>)}
        </ul>
      </div>
    </div>
  );
}
