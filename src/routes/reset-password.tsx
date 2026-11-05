import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nouveau mot de passe — Wallsbrokerage" },
      { name: "description", content: "Choisissez un nouveau mot de passe pour votre espace Wallsbrokerage." },
      { property: "og:title", content: "Nouveau mot de passe — Wallsbrokerage" },
      { property: "og:description", content: "Réinitialisation du mot de passe de votre espace investisseur." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) {
      toast.error("Lien expiré ou invalide. Redemandez un email depuis la page de connexion.");
      return;
    }
    toast.success("Mot de passe enregistré.");
    navigate({ to: "/auth" });
  };
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <form onSubmit={submit} className="panel w-full max-w-md space-y-4 p-6">
        <h1 className="text-2xl">Nouveau mot de passe</h1>
        <div className="space-y-2">
          <Label htmlFor="pw">Mot de passe</Label>
          <Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
        </div>
        <Button type="submit" className="min-h-11 w-full" disabled={busy}>
          {busy ? "Enregistrement…" : "Enregistrer"}
        </Button>
      </form>
    </main>
  );
}
