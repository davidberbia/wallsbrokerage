import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DealsTable } from "@/components/DealsTable";

export const Route = createFileRoute("/cibles")({
  head: () => ({
    meta: [
      { title: "À relancer — Walls Brokerage CRM" },
      { name: "description", content: "Actifs à relancer et informations publiques utiles à la prise de contact." },
      { property: "og:title", content: "À relancer — Walls Brokerage CRM" },
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
