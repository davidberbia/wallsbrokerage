import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DealsTable } from "@/components/DealsTable";

export const Route = createFileRoute("/dossiers")({
  head: () => ({
    meta: [
      { title: "Suivi des affaires — Wallsbrokerage CRM" },
      { name: "description", content: "Suivi des affaires par année, avec honoraires et CA pondéré selon le statut." },
      { property: "og:title", content: "Suivi des affaires — Wallsbrokerage CRM" },
      { property: "og:description", content: "De l'avis de valeur à l'acte : honoraires et CA pondéré." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <DealsTable mode="pipeline" />
    </AppLayout>
  ),
});
