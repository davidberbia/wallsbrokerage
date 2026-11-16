import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { getMyAgentContract } from "@/lib/agents.functions";

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

function MyContract() {
  const get = useServerFn(getMyAgentContract);
  const q = useQuery({ queryKey: ["my-contract"], queryFn: () => get() });
  return (
    <div className="space-y-4">
      <p className="eyebrow">Agent commercial</p>
      <h1 className="text-3xl">Mon contrat</h1>
      {q.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {q.data && !q.data.url && <p className="panel p-6 text-sm text-muted-foreground">Votre contrat n'est pas encore disponible.</p>}
      {q.data?.url && (
        <div className="panel space-y-3 p-6">
          <p className="text-sm">{q.data.signed ? "Contrat signé par les deux parties." : "Contrat en attente de signature."}</p>
          <Button className="min-h-11 w-full sm:w-auto" onClick={() => window.open(q.data!.url!, "_blank", "noopener,noreferrer")}>
            <Download className="size-4" />Voir et télécharger (PDF)
          </Button>
        </div>
      )}
    </div>
  );
}
