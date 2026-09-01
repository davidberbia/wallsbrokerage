/** Domaines de messagerie personnelle interdits à l'inscription libre. */
export const PERSONAL_EMAIL_DOMAINS = [
  "gmail.com",
  "googlemail.com",
  "outlook.com",
  "outlook.fr",
  "hotmail.com",
  "hotmail.fr",
  "live.com",
  "live.fr",
  "msn.com",
  "yahoo.com",
  "yahoo.fr",
  "ymail.com",
  "orange.fr",
  "wanadoo.fr",
  "free.fr",
  "sfr.fr",
  "neuf.fr",
  "bbox.fr",
  "laposte.net",
  "me.com",
  "icloud.com",
  "mac.com",
  "aol.com",
  "gmx.com",
  "gmx.fr",
  "protonmail.com",
  "proton.me",
  "yandex.com",
  "mail.com",
  "zoho.com",
  "numericable.fr",
  "aliceadsl.fr",
  "club-internet.fr",
] as const;

export function isPersonalEmail(email: string): boolean {
  const domain = email.trim().toLowerCase().split("@")[1];
  if (!domain) return false;
  return (PERSONAL_EMAIL_DOMAINS as readonly string[]).includes(domain);
}

export const PERSONAL_EMAIL_MESSAGE =
  "Seules les adresses email professionnelles sont acceptées. Contactez Wallsbroker pour un accès avec une adresse personnelle.";
