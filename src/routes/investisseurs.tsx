import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { InvestorsPage } from "@/components/InvestorsPage";

export const Route = createFileRoute("/investisseurs")({
  head: () => ({
    meta: [
      { title: "Investisseurs — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Gérez les profils investisseurs : tranche d'investissement, classes d'actifs, stratégies et régions.",
      },
      { property: "og:title", content: "Investisseurs — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Tous les profils investisseurs et leurs critères d'investissement.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <InvestorsPage />
    </AppLayout>
  ),
});

