import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DirectoryPage } from "@/components/DirectoryPage";

export const Route = createFileRoute("/contacts")({
  head: () => ({
    meta: [
      { title: "Contacts — Walls Brokerage CRM" },
      { name: "description", content: "Annuaire des contacts professionnels qualifiés." },
      { property: "og:title", content: "Contacts — Walls Brokerage CRM" },
      { property: "og:description", content: "Annuaire des contacts professionnels qualifiés." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker requireAdmin>
      <DirectoryPage kind="contact" />
    </AppLayout>
  ),
});
