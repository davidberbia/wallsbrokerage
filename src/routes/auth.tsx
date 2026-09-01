import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import heroImage from "@/assets/hero-wallsbroker.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Wallsbroker — Créez votre profil investisseur" },
      {
        name: "description",
        content:
          "Le CRM collaboratif de Wallsbroker : institutionnels, sociétés de gestion, foncières, SCPI et family offices reçoivent les opportunités correspondant à leur stratégie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Wallsbroker — Créez votre profil investisseur" },
      {
        property: "og:description",
        content:
          "Recevez les opportunités en immobilier commercial et tertiaire correspondant à votre stratégie d'investissement.",
      },
    ],
  }),
  component: AuthPage,
});

const SERVICES = [
  {
    title: "Conseil en investissement",
    items: [
      "Conseil à la vente ou à l'acquisition (gré à gré)",
      "Pilotage de consultation restreinte (appel d'offres)",
      "Sale and leaseback",
    ],
  },
  {
    title: "Commercialisation exclusive",
    items: [
      "Optimisation du revenu locatif",
      "Recherche de locataire",
      "Négociation de bail commercial",
    ],
  },
  {
    title: "Valorisation immobilière",
    items: [
      "Avis de valeur",
      "Etude de déplafonnement de loyer ou éviction",
      "Conseil en restructuration",
    ],
  },
  {
    title: "Marketing",
    items: [
      "Analyse de passage piéton ou véhicules",
      "Réalisation de plans Autocad",
      "Vidéos par drone",
    ],
  },
];

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { session, loading, isBroker } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && session) navigate({ to: isBroker ? "/" : "/mon-profil" });
  }, [loading, session, isBroker, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Compte créé. Vous pouvez vous connecter.");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de la connexion");
    } finally {
      setBusy(false);
    }
  };

  const google = async () => {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error("Connexion Google impossible");
      return;
    }
    if (result.redirected) return;
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <span className="text-2xl font-semibold tracking-tight text-primary">WALLSBROKER</span>
        <span className="hidden text-sm text-muted-foreground sm:block">
          CRM collaboratif investisseurs
        </span>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative overflow-hidden rounded-2xl">
            <img
              src={heroImage}
              alt="Avenue haussmannienne bordée d'immeubles de bureaux, illustration de l'immobilier tertiaire"
              className="h-full min-h-80 w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-7 text-background">
              <h1 className="max-w-xl text-3xl leading-tight md:text-4xl">
                Créez votre profil investisseur en moins de 2 minutes !
              </h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-background/85">
                wallsbrokerage.com est le CRM collaboratif de Wallsbroker qui permet aux
                investisseurs institutionnels, aux sociétés de gestion, aux foncières cotées ou
                privées, aux SCPI ou aux Family office de recevoir des opportunités
                d'investissement en immobilier commercial et tertiaire correspondant à leur
                stratégie d'investissement.
              </p>
              <p className="mt-4 text-sm font-medium">
                Actuellement, <span className="text-accent">310 investisseurs</span> nous font
                confiance
              </p>
            </div>
          </div>

          <div className="panel p-6">
            <p className="eyebrow text-primary">
              {mode === "signin" ? "Me connecter" : "M'inscrire"}
            </p>
            <h2 className="mt-2 mb-5 text-2xl">
              {mode === "signin" ? "Accéder à mon espace" : "Créer mon profil investisseur"}
            </h2>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Mot de passe</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete={mode === "signin" ? "current-password" : "new-password"}
                />
              </div>
              <Button type="submit" className="w-full" disabled={busy}>
                {mode === "signin" ? "Me connecter" : "M'inscrire"}
              </Button>
            </form>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" />
              ou
              <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" onClick={google}>
              Continuer avec Google
            </Button>
            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Créer un compte" : "J'ai déjà un compte"}
            </button>
          </div>
        </section>

        <section className="mt-16 text-center">
          <h2 className="text-2xl text-primary">
            Combien d'investisseurs pourraient être intéressés par votre actif ?
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground">
            Pas besoin de l'adresse de l'actif, en indiquant simplement la région, la classe
            d'actif, la situation locative et le prix demandé, vous saurez combien d'investisseurs
            de la communauté Wallsbroker pourraient être intéressés par votre actif.
          </p>
        </section>

        <section className="mt-16">
          <h2 className="text-center text-3xl">Nos services</h2>
          <div className="mt-8 grid gap-8 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <div key={s.title} className="border-t border-border pt-5">
                <h3 className="text-lg">{s.title}</h3>
                <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                  {s.items.map((i) => (
                    <li key={i}>{i}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Tous droits réservés Wallsbrokerage ©
      </footer>
    </div>
  );
}
