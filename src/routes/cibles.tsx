import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DealsTable } from "@/components/DealsTable";

export const Route = createFileRoute("/cibles")({
  head: () => ({
    meta: [
      { title: "Leads — Wallsbrokerage CRM" },
      { name: "description", content: "Qualification des leads immobiliers, enquête documentée et transfert aux collègues Wallsbroker." },
      { property: "og:title", content: "Leads — Wallsbrokerage CRM" },
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
