import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DealsTable } from "@/components/DealsTable";

export const Route = createFileRoute("/cibles")({
  head: () => ({
    meta: [
      { title: "Cibles — Walls Brokerage CRM" },
      { name: "description", content: "Opportunités détectées : surface, loyer, prix, honoraires et CA pondéré, par millésime." },
      { property: "og:title", content: "Cibles — Walls Brokerage CRM" },
      { property: "og:description", content: "Opportunités détectées automatiquement dans les emails, pièces jointes et liens." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <DealsTable mode="targets" />
    </AppLayout>
  ),
});
