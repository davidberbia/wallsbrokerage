import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { InvestorsPage } from "@/components/InvestorsPage";

export const Route = createFileRoute("/acheteurs")({
  head: () => ({
    meta: [
      { title: "Acheteurs habitation — Wallsbrokerage CRM" },
      { name: "description", content: "Acheteurs de logements et leurs critères de recherche." },
      { property: "og:title", content: "Acheteurs habitation — Wallsbrokerage CRM" },
      { property: "og:description", content: "Acheteurs de logements et leurs critères de recherche." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <InvestorsPage mode="buyer" />
    </AppLayout>
  ),
});

