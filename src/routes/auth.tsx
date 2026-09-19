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
      <header className="mx-auto flex max-w-6xl items-center justify-center px-4 py-5 sm:justify-between sm:px-5 sm:py-6">
        <div className="hidden w-24 sm:block" />
        <a
          href="https://www.wallsbrokerage.com"
          target="_blank"
          rel="noopener noreferrer"
          className="min-w-0 break-words text-center text-2xl font-semibold tracking-tight text-accent sm:text-4xl"
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
      </header>

      <main className="mx-auto max-w-6xl px-3 pb-12 sm:px-5 sm:pb-20">
        <section className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative min-h-[31rem] overflow-hidden rounded-2xl sm:min-h-0">
            <img
              src={heroImage}
              alt="Avenue haussmannienne bordée d'immeubles de bureaux, illustration de l'immobilier tertiaire"
              className="absolute inset-0 h-full w-full object-cover sm:static sm:min-h-80"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-foreground/85 via-foreground/40 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-background sm:p-7">
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

          <div className="panel p-4 sm:p-6">
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

        <section className="mt-8 rounded-2xl bg-primary p-4 text-primary-foreground sm:p-7 md:mt-10 md:p-10">
          <h2 className="text-2xl text-primary-foreground md:text-3xl">
            Combien d'investisseurs pourraient être intéressés par votre actif ?
          </h2>
          <p className="mt-3 max-w-3xl text-sm text-primary-foreground/80">
            Pas besoin de l'adresse de l'actif : en indiquant simplement la région, la classe
            d'actif, la situation locative et le prix demandé, vous saurez combien d'investisseurs
            de la communauté Wallsbroker pourraient être intéressés par votre actif.
          </p>

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

            <div className="flex md:col-span-2 md:justify-end">
              <Button
                type="submit"
                size="lg"
                className="w-full bg-accent px-6 text-accent-foreground hover:bg-accent/90 md:w-auto md:px-10"
                disabled={busy}
              >
                {busy ? "Recherche…" : "Lancer la recherche"}
              </Button>
            </div>
          </form>
        </section>

      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Tous droits réservés Wallsbroker
      </footer>

      {count !== null && !showContact && (
        <Overlay onClose={() => setCount(null)}>
           <h2 className="pr-8 text-center text-2xl uppercase tracking-wide text-primary sm:text-3xl md:text-4xl">
            Votre résultat
          </h2>
           <p className="mt-6 text-center font-display text-5xl text-primary sm:mt-10 sm:text-6xl">{count}</p>
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
               className="w-full bg-accent px-8 text-accent-foreground hover:bg-accent/90 sm:w-auto sm:px-14"
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
             <div className="flex md:col-span-2 md:justify-end">
               <Button className="w-full md:w-auto" type="submit" variant="secondary" size="lg" disabled={busy}>
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
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto bg-foreground/50 sm:items-start sm:p-4 md:p-8">
      <div className={`relative max-h-[96dvh] w-full max-w-3xl overflow-y-auto rounded-t-2xl p-4 shadow-lift sm:rounded-2xl sm:p-8 md:p-12 ${className}`}>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="absolute right-3 top-3 flex size-11 items-center justify-center opacity-70 transition-opacity hover:opacity-100 sm:right-5 sm:top-5"
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
