export function extractionDelay(random = Math.random) { return Math.floor(300 + Math.min(1, Math.max(0, random())) * 600); }
export function publicSiteUrl(raw: string) {
  const u = new URL(raw);
  const h = u.hostname.toLowerCase();
  if (u.protocol !== "https:" || u.username || u.password || u.port || !h.includes(".") || /^[\d.]+$/.test(h) || h.includes(":") || /(^|\.)(localhost|local|internal|test)$/.test(h)) throw new Error("Indiquez une adresse HTTPS de site public.");
  if (/(^|\.)(cfnewsimmo\.net|cfnews\.net|lettrem2\.com|businessimmo\.com|lsa-conso\.fr)$/.test(h)) throw new Error("Pour ce site, utilisez les newsletters reçues, sans connexion ni extraction directe.");
  u.hash = ""; return u.toString();
}