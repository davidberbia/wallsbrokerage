import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DirectoryPage } from "@/components/DirectoryPage";

export const Route = createFileRoute("/brokers")({
  head: () => ({
    meta: [
      { title: "Brokers — Walls Brokerage CRM" },
      { name: "description", content: "Annuaire des confrères pour partager dossiers et honoraires." },
      { property: "og:title", content: "Brokers — Walls Brokerage CRM" },
      { property: "og:description", content: "Annuaire des confrères pour partager dossiers et honoraires." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker requireAdmin>
      <DirectoryPage kind="broker" />
    </AppLayout>
  ),
});
