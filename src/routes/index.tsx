import { createFileRoute, Navigate } from "@tanstack/react-router";
import { useAuth } from "@/hooks/useAuth";
import { homeDestination } from "@/lib/list-search";

export const Route = createFileRoute("/")({
  validateSearch: (s: Record<string, unknown>): { asset?: string } =>
    typeof s["asset"] === "string" ? { asset: s["asset"] } : {},
  head: () => ({
    meta: [
      { title: "Accueil — Suivi des affaires — Wallsbrokerage CRM" },
      { name: "description", content: "Accédez à vos affaires en cours dans Wallsbrokerage." },
      { property: "og:title", content: "Accueil — Wallsbrokerage CRM" },
      { property: "og:description", content: "Votre suivi des affaires immobilières en cours." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Home,
});
function Home() {
  const { session, loading, isStaff } = useAuth();
  const { asset } = Route.useSearch();
  if (loading) return <p className="p-4 text-sm text-muted-foreground">Chargement…</p>;
  if (!session) return <Navigate to="/auth" />;
  if (asset && isStaff) return <Navigate to="/matching" search={{ asset }} />;
  return <Navigate to={homeDestination(isStaff)} />;
}
