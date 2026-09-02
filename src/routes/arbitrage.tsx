import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X } from "lucide-react";
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


export const Route = createFileRoute("/arbitrage")({
  head: () => ({
    meta: [
      { title: "Combien d'investisseurs pour votre actif ? — Wallsbroker" },
      {
        name: "description",
        content:
          "Indiquez la région, la classe d'actif, la situation locative et le prix : découvrez combien d'investisseurs de la communauté Wallsbroker pourraient être intéressés par votre actif.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:title", content: "Combien d'investisseurs pour votre actif ? — Wallsbroker" },
      {
        property: "og:description",
        content:
          "Une recherche en 30 secondes dans la base des investisseurs Wallsbroker, sans communiquer l'adresse de votre actif.",
      },
    ],
  }),
  component: ArbitragePage,
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



function ArbitragePage() {
  const [form, setForm] = useState<Search>(EMPTY);
  const [busy, setBusy] = useState(false);
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
        <Link to="/auth" className="text-2xl font-semibold tracking-tight text-primary">
          WALLSBROKER
        </Link>
        <Link to="/auth" className="text-sm text-muted-foreground hover:text-foreground">
          Espace investisseur
        </Link>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20">
        <section className="relative overflow-hidden rounded-2xl">
          <img
            src={heroImage}
            alt="Immeubles de bureaux haussmanniens, illustration de l'immobilier tertiaire"
            className="h-72 w-full object-cover md:h-96"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-foreground/90 via-foreground/55 to-foreground/20" />
          <div className="absolute inset-x-0 bottom-0 p-7 text-background">
            <p className="eyebrow text-accent">Arbitrage</p>
            <h1 className="mt-2 max-w-2xl text-3xl leading-tight md:text-4xl">
              Combien d'investisseurs pourraient être intéressés par votre actif&nbsp;?
            </h1>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-background/85">
              Pas besoin de l'adresse de l'actif : en indiquant simplement la région, la classe
              d'actif, la situation locative et le prix demandé, vous saurez combien d'investisseurs
              de la communauté Wallsbroker pourraient être intéressés.
            </p>
          </div>
        </section>

        <section className="mt-10 rounded-2xl bg-primary p-7 text-primary-foreground md:p-10">
          <p className="eyebrow text-primary-foreground/70">Rechercher</p>
          <h2 className="mt-1 text-2xl text-primary-foreground md:text-3xl">
            Faites une recherche d'investisseurs
          </h2>

          <form onSubmit={search} className="mt-8 grid gap-4 md:grid-cols-2">
            <Field label="Classe d'actif">
              <Select
                value={form.asset_class}
                onValueChange={(v) => set("asset_class", v)}
              >
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

            <Field label="Stratégie investisseur">
              <Select value={form.strategy} onValueChange={(v) => set("strategy", v)}>
                <SelectTrigger className="border-0 bg-transparent px-0 text-base shadow-none">
                  <SelectValue placeholder="Stratégie investisseur" />
                </SelectTrigger>
                <SelectContent>
                  {STRATEGIES.map((strategy) => (
                    <SelectItem key={strategy} value={strategy}>
                      {strategy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <div className="space-y-2">
              <Label className="text-primary-foreground">Ville et périphérie</Label>
              <div className="grid gap-2">
                <div className="rounded-xl bg-card px-4 py-3 text-card-foreground">
                  <Select
                    value={form.periphery_scope}
                    onValueChange={(v) => set("periphery_scope", v)}
                  >
                    <SelectTrigger className="border-0 bg-transparent px-0 text-base shadow-none">
                      <SelectValue placeholder="Périphérie" />
                    </SelectTrigger>
                    <SelectContent>
                      {PERIPHERY_SCOPES.map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          {scope}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="rounded-xl bg-card px-4 py-3 text-card-foreground">
                  <Select value={form.city_scope} onValueChange={(v) => set("city_scope", v)}>
                    <SelectTrigger className="border-0 bg-transparent px-0 text-base shadow-none">
                      <SelectValue placeholder="Centre-ville" />
                    </SelectTrigger>
                    <SelectContent>
                      {CITY_SCOPES.map((scope) => (
                        <SelectItem key={scope} value={scope}>
                          {scope}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <Field label="Prix en M€ (entre 1 et 500 M€)">
              <BareInput
                type="number"
                step="0.1"
                min="1"
                max="500"
                placeholder="10.0"
                value={form.price}
                onChange={(e) => set("price", e.target.value)}
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
              <Button type="submit" variant="secondary" size="lg" disabled={busy}>
                {busy ? "Recherche…" : "Lancer la recherche"}
              </Button>
            </div>
          </form>
        </section>
      </main>

      <footer className="border-t border-border py-6 text-center text-sm text-muted-foreground">
        Tous droits réservés Wallsbrokerage ©
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
      <div
        className={`relative w-full max-w-3xl rounded-2xl p-8 shadow-lift md:p-12 ${className}`}
      >
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
