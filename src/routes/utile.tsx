import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { DirectoryPage } from "@/components/DirectoryPage";

export const Route = createFileRoute("/utile")({
  head: () => ({
    meta: [
      { title: "Contacts utiles — Walls Brokerage CRM" },
      { name: "description", content: "Diagnostiqueurs et autres contacts utiles." },
      { property: "og:title", content: "Contacts utiles — Walls Brokerage CRM" },
      { property: "og:description", content: "Diagnostiqueurs et autres contacts utiles." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker requireAdmin>
      <DirectoryPage kind="utile" />
    </AppLayout>
  ),
});
