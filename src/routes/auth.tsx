import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { isPersonalEmail, PERSONAL_EMAIL_MESSAGE } from "@/lib/email-domains";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ASSET_CLASSES, REGIONS } from "@/lib/taxonomy";
import { formatThousands, parseThousands } from "@/lib/format";
import { countInterestedInvestors, submitArbitrageRequest } from "@/lib/arbitrage.functions";
import heroImage from "@/assets/hero-wallsbroker.png";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Wallsbrokerage — Créez votre profil investisseur" },
      {
        name: "description",
        content:
          "Le CRM collaboratif de Wallsbroker : institutionnels, sociétés de gestion, foncières, SCPI et family offices reçoivent les opportunités correspondant à leur stratégie.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Wallsbrokerage — Créez votre profil investisseur" },
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

const OCCUPANCIES = ["Vide", "Occupé", "Partiellement occupé"] as const;

type Search = {
  asset_class: string;
  occupancy: string;
  price: string;
  region: string;
};

const EMPTY: Search = {
  asset_class: "",
  occupancy: "",
  price: "",
  region: "",
};

function AuthPage() {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const { session, loading, isBroker } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState<Search>(EMPTY);
  const [count, setCount] = useState<number | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [contact, setContact] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    comment: "",
  });

  const runSearch = useServerFn(countInterestedInvestors);
  const sendRequest = useServerFn(submitArbitrageRequest);
  const set = (k: keyof Search, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const priceEuros = parseThousands(form.price);

  useEffect(() => {
    if (!loading && session) navigate({ to: isBroker ? "/" : "/mon-profil" });
  }, [loading, session, isBroker, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "signup" && isPersonalEmail(email)) {
      toast.error(PERSONAL_EMAIL_MESSAGE);
      return;
    }
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

  const search = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.asset_class || !form.region || !form.occupancy || !priceEuros) {
      toast.error("Tous les champs sont obligatoires.");
      return;
    }
    setBusy(true);
    try {
      const res = await runSearch({
        data: {
          asset_class: form.asset_class,
          region: form.region,
          occupancy: form.occupancy || null,
          strategy: null,
          city_scope: null,
          periphery_scope: null,
          price_meur: priceEuros / 1_000_000,
        },
      });
      setCount(res.count);
    } catch {
      toast.error("La recherche a échoué, réessayez.");
    } finally {
      setBusy(false);
    }
  };

  const submitContact = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await sendRequest({
        data: {
          asset_class: form.asset_class,
          region: form.region,
          occupancy: form.occupancy || null,
          strategy: null,
          city_scope: null,
          periphery_scope: null,
          price_meur: (priceEuros ?? 0) / 1_000_000,
          surface: null,
          address: null,
          rent_annual: null,
          first_name: contact.first_name,
          last_name: contact.last_name,
          email: contact.email,
          phone: contact.phone || null,
          comment: contact.comment || null,
          match_count: count,
        },
      });
      toast.success("Demande envoyée — nous revenons vers vous rapidement.");
      setShowContact(false);
      setCount(null);
      setForm(EMPTY);
      setContact({ first_name: "", last_name: "", email: "", phone: "", comment: "" });
    } catch {
      toast.error("Envoi impossible, réessayez.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-6">
        <div className="w-24" />
        <a
          href="https://www.wallsbrokerage.com"
          target="_blank"
          rel="noopener noreferrer"
          className="text-center text-3xl font-semibold tracking-tight text-accent sm:text-4xl"
        >
          WALLSBROKERAGE
        </a>
        <a
          href="https://www.wallsbroker.com"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden w-24 text-right text-sm text-muted-foreground hover:text-foreground sm:block"
        >
          by Wallsbroker
        </a>
        <div className="w-24 sm:hidden" />
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
                {mode === "signup" && (
                  <p className="text-xs text-muted-foreground">
                    Adresse professionnelle uniquement (les adresses personnelles type Gmail,
                    Outlook, Hotmail, Yahoo, Orange, Laposte… ne sont pas acceptées).
                  </p>
                )}
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
            <button
              type="button"
              className="mt-4 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:underline"
              onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            >
              {mode === "signin" ? "Créer un compte" : "J'ai déjà un compte"}
            </button>
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-primary p-7 text-primary-foreground md:p-10">
          <p className="eyebrow text-primary-foreground/70">Rechercher</p>
          <h2 className="mt-1 text-2xl text-primary-foreground md:text-3xl">
            Faites une recherche d'investisseurs
          </h2>

          <form onSubmit={search} className="mt-8 grid gap-4 md:grid-cols-2">
            <Field label="Classe d'actif">
              <Select value={form.asset_class} onValueChange={(v) => set("asset_class", v)}>
                <SelectTrigger className="border-0 bg-transparent px-0 text-base shadow-none">
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CLASSES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Situation locative">
              <Select value={form.occupancy} onValueChange={(v) => set("occupancy", v)}>
                <SelectTrigger className="border-0 bg-transparent px-0 text-base shadow-none">
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPANCIES.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field label="Prix en € (entre 1 000 000 et 500 000 000 €)">
              <BareInput
                inputMode="numeric"
                placeholder="10 000 000"
                value={form.price}
                onChange={(e) => set("price", formatThousands(e.target.value))}
              />
            </Field>

            <Field label="Région de votre bien">
              <Select value={form.region} onValueChange={(v) => set("region", v)}>
                <SelectTrigger className="border-0 bg-transparent px-0 text-base shadow-none">
                  <SelectValue placeholder="Sélectionnez" />
                </SelectTrigger>
                <SelectContent>
                  {REGIONS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="md:col-span-2 flex justify-end">
              <Button
                type="submit"
                size="lg"
                className="bg-accent px-10 text-accent-foreground hover:bg-accent/90"
                disabled={busy}
              >
                {busy ? "Recherche…" : "Lancer la recherche"}
              </Button>
            </div>
          </form>
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
        Tous droits réservés Wallsbroker
      </footer>

      {count !== null && !showContact && (
        <Overlay onClose={() => setCount(null)}>
          <h2 className="text-center text-3xl uppercase tracking-wide text-primary md:text-4xl">
            Votre résultat
          </h2>
          <p className="mt-10 text-center font-display text-6xl text-primary">{count}</p>
          <p className="mx-auto mt-4 max-w-md text-center text-lg text-primary">
            investisseur{count > 1 ? "s" : ""} pourrai{count > 1 ? "ent" : "t"} être intéressé
            {count > 1 ? "s" : ""} par votre actif
          </p>
          <p className="mt-10 text-center text-lg font-semibold text-accent">
            Si vous souhaitez que nous leur présentions votre actif, c'est par ici :
          </p>
          <div className="mt-6 flex justify-center">
            <Button
              size="lg"
              className="bg-accent px-14 text-accent-foreground hover:bg-accent/90"
              onClick={() => setShowContact(true)}
            >
              Contact
            </Button>
          </div>
        </Overlay>
      )}

      {showContact && (
        <Overlay
          onClose={() => setShowContact(false)}
          className="bg-primary text-primary-foreground"
        >
          <p className="eyebrow text-primary-foreground/70">Votre actif</p>
          <h2 className="mt-1 text-2xl text-primary-foreground md:text-3xl">
            Présentons votre actif à ces investisseurs
          </h2>
          <form onSubmit={submitContact} className="mt-8 grid gap-4 md:grid-cols-2">
            <Field label="Prénom">
              <BareInput
                required
                placeholder="Prénom"
                value={contact.first_name}
                onChange={(e) => setContact({ ...contact, first_name: e.target.value })}
              />
            </Field>
            <Field label="Nom">
              <BareInput
                required
                placeholder="Nom"
                value={contact.last_name}
                onChange={(e) => setContact({ ...contact, last_name: e.target.value })}
              />
            </Field>
            <Field label="Mail">
              <BareInput
                required
                type="email"
                placeholder="Mail"
                value={contact.email}
                onChange={(e) => setContact({ ...contact, email: e.target.value })}
              />
            </Field>
            <Field label="Téléphone">
              <BareInput
                placeholder="Téléphone"
                value={contact.phone}
                onChange={(e) => setContact({ ...contact, phone: e.target.value })}
              />
            </Field>
            <Field label="Commentaire" className="md:col-span-2">
              <Textarea
                placeholder="Commentaire"
                rows={4}
                className="resize-none border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
                value={contact.comment}
                onChange={(e) => setContact({ ...contact, comment: e.target.value })}
              />
            </Field>
            <div className="md:col-span-2 flex justify-end">
              <Button type="submit" variant="secondary" size="lg" disabled={busy}>
                {busy ? "Envoi…" : "Envoyer"}
              </Button>
            </div>
          </form>
        </Overlay>
      )}
    </div>
  );
}

function Overlay({
  children,
  onClose,
  className = "bg-card",
}: {
  children: React.ReactNode;
  onClose: () => void;
  className?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-foreground/50 p-4 sm:p-8">
      <div className={`relative w-full max-w-3xl rounded-2xl p-8 shadow-lift md:p-12 ${className}`}>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-5 top-5 opacity-70 transition-opacity hover:opacity-100"
        >
          <X className="size-6" />
        </button>
        {children}
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`rounded-xl bg-card px-4 py-3 text-card-foreground ${className}`}>
      <Label className="text-xs font-normal text-muted-foreground">{label}</Label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function BareInput(props: React.ComponentProps<typeof Input>) {
  return (
    <Input
      {...props}
      className="h-8 border-0 bg-transparent px-0 text-base shadow-none focus-visible:ring-0"
    />
  );
}
