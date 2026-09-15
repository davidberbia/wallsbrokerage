// Extraction lente et discrète de l'annuaire CFNews Immo via le relais ZenRows.
const ZENROWS = "https://api.zenrows.com/v1/";
const BASE = "https://www.cfnewsimmo.net";
export const LISTING_URL =
  "/Annuaires-base-de-deals/Acteurs?locationId=443825&rechercher=Rechercher&acteur_domaine=448197&page=";
export const LISTING_LAST_PAGE = 140;

/** Le site remplace certaines lettres par des homoglyphes cyrilliques/grecs. */
const HOMOGLYPHS: Record<string, string> = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", Х: "X", У: "Y",
  І: "I", Ј: "J", Ѕ: "S", Ԛ: "Q", Ԝ: "W", Ν: "N", Α: "A", Β: "B", Ε: "E", Ζ: "Z", Η: "H", Ι: "I",
  Κ: "K", Μ: "M", Ο: "O", Ρ: "P", Τ: "T", Υ: "Y", Χ: "X",
  а: "a", е: "e", о: "o", р: "p", с: "c", у: "y", х: "x", і: "i", ј: "j", ѕ: "s", ԁ: "d", һ: "h",
  ν: "v", ο: "o", ρ: "p", ι: "i", α: "a", ε: "e", κ: "k", μ: "m", τ: "t", υ: "u", χ: "x",
};

export const deobfuscate = (value: string) =>
  value.replace(/[\u0370-\u04FF]/g, (ch) => HOMOGLYPHS[ch] ?? ch);

export const cleanText = (value: string) =>
  deobfuscate(
    value
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;|\u00a0/g, " ")
      .replace(/&amp;/g, "&")
      .replace(/&#039;|&apos;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&eacute;/g, "é")
      .replace(/\s+/g, " ")
      .trim(),
  );

function zenUrl(target: string) {
  const key = process.env["ZENROWS_API_KEY"];
  if (!key) throw new Error("ZENROWS_API_KEY manquante");
  const params = new URLSearchParams({
    apikey: key,
    url: target.startsWith("http") ? target : BASE + target,
    premium_proxy: "true",
    proxy_country: "fr",
    custom_headers: "true",
  });
  return `${ZENROWS}?${params.toString()}`;
}

/** Ouvre une session CFNews et renvoie les cookies à réutiliser. */
export async function cfnewsLogin(): Promise<string> {
  const login = process.env["CFNEWS_EMAIL"];
  const password = process.env["CFNEWS_PASSWORD"];
  if (!login || !password) throw new Error("Identifiants CFNews manquants");

  const body = new URLSearchParams({
    RedirectURI: "/Annuaires-base-de-deals/Acteurs",
    Login: login,
    Password: password,
    Cookie: "1",
    LoginButton: "Connexion",
  });

  const res = await fetch(zenUrl("/cfni/login/index.php?url=login"), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });
  if (!res.ok) throw new Error(`Connexion CFNews impossible (${res.status})`);

  const raw = res.headers.get("Zr-Cookies") ?? res.headers.get("Zr-Set-Cookie") ?? "";
  const jar = new Map<string, string>();
  for (const part of raw.split(/,(?=[^;]+=)|;\s*/)) {
    const m = /^\s*([A-Za-z0-9_\-]+)=([^;]*)/.exec(part);
    if (m && m[1] && !/^(path|domain|expires|max-age|secure|httponly|samesite)$/i.test(m[1])) {
      jar.set(m[1], m[2] ?? "");
    }
  }
  const cookie = [...jar.entries()].map(([k, v]) => `${k}=${v}`).join("; ");
  if (!cookie.includes("eZSESSID")) throw new Error("Session CFNews non obtenue");
  return cookie;
}

export async function cfnewsGet(path: string, cookie: string): Promise<string> {
  const res = await fetch(zenUrl(path), { headers: { Cookie: cookie } });
  if (!res.ok) throw new Error(`CFNews ${res.status} sur ${path}`);
  return await res.text();
}

export type ParsedCompany = { name: string; path: string };

export function parseCompanyLinks(html: string): ParsedCompany[] {
  const out = new Map<string, string>();
  const re = /href="(\/Annuaires-base-de-deals\/Acteurs\/[^"/]+\/[^"/?#]+)"([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const path = m[1]!;
    const titleAttr = /title="([^"]+)"/.exec(m[2] ?? "");
    const after = html.slice(re.lastIndex, re.lastIndex + 1500);
    const end = after.indexOf("</a>");
    const inner = end >= 0 ? cleanText(after.slice(0, end)) : "";
    const label = cleanText(titleAttr?.[1] ?? "") || inner;
    const prev = out.get(path);
    if (!prev || (label && label.length > prev.length)) out.set(path, label);
  }
  return [...out.entries()].map(([path]) => ({
    path,
    name: cleanText(decodeURIComponent(path.split("/").pop() ?? "").replace(/-/g, " ")),
  }));
}

export type ParsedMember = { fullName: string; jobTitle: string | null; path: string };

export function parseTeam(html: string): ParsedMember[] {
  const out = new Map<string, ParsedMember>();
  const blocks = html.split(/<div class="card member-list-item/g).slice(1);
  for (const block of blocks) {
    const link = /href="(\/Annuaires-base-de-deals\/Personnalites\/[^"?#]+)"/.exec(block);
    const name = /<h3>([\s\S]*?)<\/h3>/.exec(block);
    const title = /class="member-title"[\s\S]{0,200}?<a[^>]*>([\s\S]*?)<\/a>/.exec(block);
    if (!link || !name) continue;
    const fullName = cleanText(name[1] ?? "");
    if (!fullName) continue;
    out.set(link[1]!, {
      path: link[1]!,
      fullName,
      jobTitle: title ? cleanText(title[1] ?? "").replace(/\s*\/\s*/g, " / ") || null : null,
    });
  }
  return [...out.values()];
}

export type ParsedPerson = {
  email: string | null;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  jobTitle: string | null;
  company: string | null;
  city: string | null;
};

function dottedField(html: string, label: string): string | null {
  const re = new RegExp(`dotted-overflow"[^>]*>\\s*${label}\\s*<`, "i");
  const m = re.exec(html);
  if (!m) return null;
  const rest = html.slice(m.index);
  const start = rest.indexOf('dotted-value"');
  if (start < 0) return null;
  const end = rest.indexOf("</li>", start);
  const value = cleanText(rest.slice(start, end < 0 ? start + 2000 : end))
    .replace(/^[^>]*>/, "")
    .split(/Copier|CFNEWS IMMO|email scoring/i)[0]!
    .trim();
  return value || null;
}

export function parsePerson(html: string): ParsedPerson {
  const emailMatch = /id="email_text"[^>]*>([^<]+)</.exec(html);
  const email = emailMatch ? cleanText(emailMatch[1] ?? "").toLowerCase() : null;
  const phone = dottedField(html, "Mobile") ?? dottedField(html, "T[^<]{0,3}l[^<]{0,3}phone");
  return {
    email: email && /^[^@\s]+@[^@\s]+\.[a-z]{2,}$/.test(email) ? email : null,
    phone,
    firstName: dottedField(html, "Pr[^<]{0,3}nom"),
    lastName: dottedField(html, "Nom"),
    jobTitle: dottedField(html, "Titre"),
    company: dottedField(html, "Organisation"),
    city: dottedField(html, "Ville"),
  };
}

export const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
