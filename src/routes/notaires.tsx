import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DirectoryPage } from "@/components/DirectoryPage";

export const Route = createFileRoute("/notaires")({
  head: () => ({
    meta: [
      { title: "Notaires — Wallsbrokerage CRM" },
      { name: "description", content: "Annuaire des notaires partenaires." },
      { property: "og:title", content: "Notaires — Wallsbrokerage CRM" },
      { property: "og:description", content: "Annuaire des notaires partenaires." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker requireAdmin>
      <DirectoryPage kind="notary" />
    </AppLayout>
  ),
});
