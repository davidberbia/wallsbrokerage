// Analyse de la boîte mail Outlook : lecture via la passerelle Lovable,
// tri des adresses professionnelles et vérification du domaine.
import { PERSONAL_EMAIL_DOMAINS } from "@/lib/email-domains";

const GATEWAY = "https://connector-gateway.lovable.dev/microsoft_outlook";

export type GraphAddress = { name?: string | null; address?: string | null };
export type GraphMessage = {
  id: string;
  receivedDateTime?: string;
  from?: { emailAddress?: GraphAddress } | null;
  sender?: { emailAddress?: GraphAddress } | null;
  toRecipients?: { emailAddress?: GraphAddress }[] | null;
  ccRecipients?: { emailAddress?: GraphAddress }[] | null;
};

export async function graphGet<T>(pathOrUrl: string, extraHeaders?: Record<string, string>): Promise<T> {
  // Les liens de pagination renvoyés par Graph pointent vers graph.microsoft.com :
  // on les repasse par la passerelle, seule à détenir les identifiants.
  const url = pathOrUrl.startsWith("http")
    ? pathOrUrl.replace(/^https:\/\/graph\.microsoft\.com/, GATEWAY)
    : `${GATEWAY}${pathOrUrl}`;
  const apiKey = process.env["LOVABLE_API_KEY"];
  const connKey = process.env["MICROSOFT_OUTLOOK_API_KEY"];
  if (!apiKey || !connKey) throw new Error("Connexion Outlook indisponible côté serveur.");
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "X-Connection-Api-Key": connKey,
      Accept: "application/json",
      ...(extraHeaders ?? {}),
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Microsoft Graph [${res.status}] ${body.slice(0, 400)}`);
  }
  return (await res.json()) as T;
}

/** Adresses propres au compte : jamais retenues comme prospect. */
export const OWN_DOMAINS = ["wallsbroker.com", "wallsbrokerage.com"];

/** Préfixes d'expéditeurs automatiques. */
const ROLE_PREFIXES = [
  "noreply",
  "no-reply",
  "no_reply",
  "donotreply",
  "do-not-reply",
  "ne-pas-repondre",
  "nepasrepondre",
  "notification",
  "notifications",
  "newsletter",
  "news",
  "mailer",
  "mailer-daemon",
  "postmaster",
  "bounce",
  "bounces",
  "abuse",
  "unsubscribe",
  "desabonnement",
  "alerte",
  "alertes",
  "support",
  "facturation",
  "billing",
  "invoice",
  "comptabilite",
  "webmaster",
  "hello",
  "team",
  "message",
  "mail",
];

/** Domaines de plateformes et services : jamais des prospects. */
const PLATFORM_DOMAINS = [
  "linkedin.com",
  "google.com",
  "microsoft.com",
  "office.com",
  "apple.com",
  "amazon.com",
  "amazonses.com",
  "brevo.com",
  "sendinblue.com",
  "sender.net",
  "sendersrv.com",
  "lovable.app",
  "lovable.dev",
  "ovh.com",
  "ovh.net",
  "docusign.net",
  "dropbox.com",
  "wetransfer.com",
  "swisstransfer.com",
  "calendly.com",
  "zoom.us",
  "doctolib.fr",
  "facebook.com",
  "instagram.com",
  "twitter.com",
  "x.com",
  "paypal.com",
  "stripe.com",
  "eventbrite.com",
  "mailchimp.com",
  "hubspot.com",
  "salesforce.com",
  "indeed.com",
  "welcometothejungle.com",
];

const isPlatformDomain = (domain: string) =>
  PLATFORM_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`));

export function classifyAddress(raw: string | null | undefined): {
  email: string;
  domain: string;
} | null {
  const email = (raw ?? "").trim().toLowerCase();
  if (!email || !email.includes("@") || email.includes(" ")) return null;
  const [local, domain] = email.split("@");
  if (!local || !domain) return null;
  if (OWN_DOMAINS.includes(domain)) return null;
  if ((PERSONAL_EMAIL_DOMAINS as readonly string[]).includes(domain)) return null;
  if (isPlatformDomain(domain)) return null;
  if (domain.endsWith(".local") || domain.endsWith(".internal")) return null;
  const prefix = local.replace(/[.+_-]\d+$/, "");
  if (ROLE_PREFIXES.some((p) => prefix === p || prefix.startsWith(`${p}-`) || prefix.startsWith(`${p}.`)))
    return null;
  if (/^[0-9a-f]{16,}$/.test(local)) return null;
  return { email, domain };
}

const GENERIC_SUBDOMAINS = [
  "chat",
  "mail",
  "email",
  "mails",
  "news",
  "newsletter",
  "info",
  "contact",
  "smtp",
  "reply",
  "link",
  "links",
  "go",
  "em",
  "e",
  "m",
  "t",
  "www",
  "app",
  "my",
  "cloud",
];

/** Nom de société lisible à partir du domaine. */
export function companyFromDomain(domain: string): string {
  const parts = domain.split(".").filter(Boolean);
  while (parts.length > 2 && GENERIC_SUBDOMAINS.includes(parts[0]!.toLowerCase())) parts.shift();
  const base = parts[0] ?? domain;
  return base
    .split(/[-_]/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const REAL_ESTATE_KEYWORDS = [
  "immobilier",
  "immobilière",
  "immobiliere",
  "real estate",
  "foncière",
  "fonciere",
  "asset management",
  "investissement",
  "investisseur",
  "scpi",
  "opci",
  "sci",
  "promotion immobilière",
  "promoteur",
  "commerces",
  "locaux commerciaux",
  "bureaux",
  "logistique",
  "entrepôt",
  "murs commerciaux",
  "actifs immobiliers",
  "property",
  "patrimoine",
  "gestion locative",
  "transaction",
  "bail",
  "rendement locatif",
  "hôtellerie",
];

/** Consulte le site du domaine et cherche les mots-clés du métier. */
export async function checkDomainSite(domain: string): Promise<{
  verdict: "immobilier" | "hors cible" | "inconnu";
  reason: string;
  siteUrl: string | null;
}> {
  for (const url of [`https://${domain}`, `https://www.${domain}`]) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      const res = await fetch(url, {
        signal: controller.signal,
        redirect: "follow",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; WallsbrokerageBot/1.0)" },
      });
      clearTimeout(timer);
      if (!res.ok) continue;
      const html = (await res.text()).slice(0, 400_000);
      const text = html
        .replace(/<script[\s\S]*?<\/script>/gi, " ")
        .replace(/<style[\s\S]*?<\/style>/gi, " ")
        .replace(/<[^>]+>/g, " ")
        .toLowerCase();
      const hits = REAL_ESTATE_KEYWORDS.filter((k) => text.includes(k));
      if (hits.length >= 2) {
        return { verdict: "immobilier", reason: hits.slice(0, 4).join(", "), siteUrl: url };
      }
      return {
        verdict: "hors cible",
        reason: hits.length === 1 ? `un seul indice : ${hits[0]}` : "aucun mot-clé immobilier",
        siteUrl: url,
      };
    } catch {
      // essai suivant
    }
  }
  return { verdict: "inconnu", reason: "site injoignable", siteUrl: null };
}

const JOB_HINTS = [
  "directeur",
  "directrice",
  "président",
  "presidente",
  "présidente",
  "gérant",
  "gerante",
  "gérante",
  "associé",
  "associée",
  "responsable",
  "chargé",
  "chargée",
  "consultant",
  "manager",
  "head of",
  "asset manager",
  "fund manager",
  "analyste",
  "acquisition",
  "investment",
  "partner",
  "founder",
  "ceo",
  "coo",
  "cfo",
  "négociateur",
  "negociateur",
  "courtier",
  "conseiller",
  "conseillère",
];

const PHONE_RE = /(?:\+33|0033|0)\s?[1-9](?:[\s.-]?\d{2}){4}/;

/** Lit la fonction, le téléphone et l'adresse dans la signature d'un email. */
export function parseSignature(body: string): {
  jobTitle: string | null;
  phone: string | null;
  address: string | null;
} {
  const text = body
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&rsquo;/g, "'")
    .replace(/[ \t]+/g, " ");
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 1 && l.length < 120);
  const head = lines.slice(0, 60);

  const jobTitle =
    head.find((l) => {
      const low = l.toLowerCase();
      return JOB_HINTS.some((h) => low.includes(h)) && l.length < 80 && !low.includes("@");
    }) ?? null;

  const phoneMatch = text.match(PHONE_RE);
  const phone = phoneMatch ? phoneMatch[0].replace(/[\s.-]+/g, " ").trim() : null;

  const address =
    head.find((l) => /\b\d{5}\b/.test(l) && /[a-zA-Zéèêà]/.test(l) && !l.includes("@")) ?? null;

  return { jobTitle, phone, address };
}

export const splitName = (fullName: string) => {
  const clean = fullName.replace(/["<>]/g, "").replace(/\s+/g, " ").trim();
  const first = clean.split(" ")[0] ?? "";
  return { fullName: clean, firstName: first || null };
};
