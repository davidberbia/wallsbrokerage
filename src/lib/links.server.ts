// Analyse d'un lien partagé (article, vidéo YouTube, reel Instagram/TikTok) par Gemini.
import { getAdmin } from "@/lib/automation.server";
import { SYSTEM, saveExtraction, sha256, type Extraction } from "@/lib/aiscan.server";
import { callGeminiPartsJson, uploadGeminiFile } from "@/lib/gemini.server";
import { enrichTarget } from "@/lib/targets.server";

const UA = "Mozilla/5.0 (compatible; facebookexternalhit/1.1; +http://www.facebook.com/externalhit_uatext.php)";

const LINK_SYSTEM = `${SYSTEM}
Ajoute aussi à la racine du JSON : "title" (titre court du contenu) et "summary" (3 à 6 phrases en français : ce qu'il faut retenir pour un courtier en immobilier commercial — acteurs, actifs, montants, opportunités, personnes à appeler).
David a partagé ce contenu parce qu'il y a repéré une info utile : cherche-la sans qu'il ait besoin de l'expliquer.
Mets TOUJOURS dans "targets" au moins une cible : l'opportunité principale du contenu (l'actif, le portefeuille ou l'acteur/la famille/la société à démarcher), avec un name court et explicite.`;

type LinkResult = Extraction & { title?: string; summary?: string };

const decode = (s: string) =>
  s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;|&#x27;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");

function meta(html: string, name: string): string | null {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i");
  const re2 = new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:property|name)=["']${name}["']`, "i");
  const m = re.exec(html) ?? re2.exec(html);
  return m ? decode(m[1]!) : null;
}

const htmlText = (html: string) =>
  decode(
    html
      .replace(/<(script|style|noscript|svg|header|footer|nav)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<br\s*\/?>|<\/(p|div|li|h\d|tr)>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();

const MAX_VIDEO = 90 * 1024 * 1024;
const BOT_UA = "Mozilla/5.0 (compatible; Discordbot/2.0; +https://discordapp.com)";

async function download(media: string): Promise<Uint8Array | null> {
  const v = await fetch(media, { headers: { "User-Agent": BOT_UA }, redirect: "follow" });
  if (!v.ok || !(v.headers.get("content-type") ?? "").includes("video")) return null;
  if (Number(v.headers.get("content-length") ?? 0) > MAX_VIDEO) return null;
  const buf = new Uint8Array(await v.arrayBuffer());
  return buf.length && buf.length <= MAX_VIDEO ? buf : null;
}

/** Cobalt privé, seulement si une instance est configurée. */
async function viaCobalt(url: string): Promise<Uint8Array | null> {
  const instances = (process.env["COBALT_API_URL"] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  for (const base of instances) {
    try {
      const r = await fetch(base.replace(/\/$/, "") + "/", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ url, videoQuality: "480", downloadMode: "auto" }),
      });
      if (!r.ok) continue;
      const j = (await r.json()) as { url?: string; picker?: { type?: string; url?: string }[] };
      const media = j.url ?? j.picker?.find((p) => p.type === "video")?.url;
      if (media) {
        const b = await download(media);
        if (b) return b;
      }
    } catch {
      /* suivante */
    }
  }
  return null;
}

/** Instagram : services publics gratuits de prévisualisation (sans compte). */
async function viaInstagramMirror(url: string): Promise<Uint8Array | null> {
  const id = /\/(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/.exec(new URL(url).pathname)?.[1];
  if (!id) return null;
  for (const host of ["uuinstagram.com", "kkinstagram.com", "vxinstagram.com"]) {
    try {
      const b = await download(`https://${host}/videos/${id}/1`);
      if (b) return b;
    } catch {
      /* suivant */
    }
  }
  return null;
}

/** TikTok : API publique gratuite tikwm. */
async function viaTikwm(url: string): Promise<Uint8Array | null> {
  try {
    const r = await fetch(`https://www.tikwm.com/api/?url=${encodeURIComponent(url)}`);
    const j = (await r.json()) as { code?: number; data?: { play?: string; wmplay?: string } };
    const media = j.data?.play ?? j.data?.wmplay;
    if (j.code === 0 && media) return await download(media.startsWith("http") ? media : `https://www.tikwm.com${media}`);
  } catch {
    /* ignore */
  }
  return null;
}

/** Récupère la vidéo d'un Reel / TikTok et la dépose chez Gemini. null si impossible. */
async function socialVideo(url: string, host: string): Promise<{ fileUri: string; mimeType: string } | null> {
  const bytes =
    (await viaCobalt(url)) ?? (host.endsWith("instagram.com") ? await viaInstagramMirror(url) : await viaTikwm(url));
  if (!bytes) return null;
  return uploadGeminiFile(bytes, "video/mp4");
}

async function collect(url: string): Promise<{ parts: Record<string, unknown>[]; title: string | null }> {
  const u = new URL(url);
  const host = u.hostname.replace(/^www\.|^m\./, "");
  if (/(^|\.)youtube\.com$|^youtu\.be$/.test(host)) {
    return { parts: [{ fileData: { fileUri: url } }, { text: `Vidéo YouTube : ${url}` }], title: null };
  }
  const extra: string[] = [];
  const videoPart: Record<string, unknown>[] = [];
  if (/tiktok\.com$|instagram\.com$/.test(host)) {
    const vid = await socialVideo(url, host);
    if (vid) {
      videoPart.push({ fileData: vid });
      extra.push("(La vidéo complète est jointe : analyse aussi ce qui est dit et montré.)");
    }
  }
  if (/tiktok\.com$/.test(host)) {
    try {
      const r = await fetch(`https://www.tiktok.com/oembed?url=${encodeURIComponent(url)}`);
      if (r.ok) {
        const j = (await r.json()) as { title?: string; author_name?: string };
        extra.push(`Légende TikTok : ${j.title ?? ""}\nAuteur : ${j.author_name ?? ""}`);
      }
    } catch {
      /* ignore */
    }
  }
  let title: string | null = null;
  try {
    const r = await fetch(url, { headers: { "User-Agent": UA, "Accept-Language": "fr-FR,fr;q=0.9" }, redirect: "follow" });
    const html = (await r.text()).slice(0, 2_000_000);
    title = meta(html, "og:title") ?? /<title[^>]*>([^<]*)<\/title>/i.exec(html)?.[1]?.trim() ?? null;
    const desc = meta(html, "og:description") ?? meta(html, "description");
    const art = /<article[\s\S]*?<\/article>/i.exec(html)?.[0];
    extra.push(`Titre : ${title ?? ""}\nDescription : ${desc ?? ""}\n\n${htmlText(art ?? html).slice(0, 60_000)}`);
  } catch (e) {
    extra.push(`(page illisible : ${e instanceof Error ? e.message : String(e)})`);
  }
  const text = extra.join("\n\n").trim();
  return { parts: [...videoPart, { text: `Lien partagé : ${url}\n\n${text}` }], title };
}

export async function processLink(id: string): Promise<void> {
  const admin = await getAdmin();
  const { data: row } = await admin.from("shared_links").select("id,url,note").eq("id", id).single();
  if (!row) return;
  await admin.from("shared_links").update({ status: "en cours", error: null }).eq("id", id);
  try {
    const { parts, title } = await collect(row.url);
    if (row.note) parts.push({ text: `Remarque de David : ${row.note}` });
    const ex = (await callGeminiPartsJson<LinkResult>({ task: "lien", system: LINK_SYSTEM, parts })) ?? {};
    const key = `link:${(await sha256(new TextEncoder().encode(row.url))).slice(0, 32)}`;
    const saved = await saveExtraction(admin, ex, key, new Date().toISOString(), { source: "lien" });
    // Enrichissement web de la cible principale (meilleur effort).
    const { data: tgt } = await admin
      .from("deals")
      .select("id")
      .eq("source", "lien")
      .is("enriched_at", null)
      .gte("created_at", new Date(Date.now() - 10 * 60_000).toISOString())
      .order("created_at", { ascending: false })
      .limit(2);
    for (const t of tgt ?? []) await enrichTarget(t.id).catch(() => undefined);
    await admin
      .from("shared_links")
      .update({
        status: "analysé",
        title: (ex.title || title || row.url).slice(0, 300),
        summary: ex.summary?.slice(0, 3000) ?? null,
        found_contacts: saved.contacts,
        found_comparables: saved.comparables,
        found_news: saved.news,
      })
      .eq("id", id);
  } catch (e) {
    await admin
      .from("shared_links")
      .update({
        status: "erreur",
        error: /Gemini \[402\]/.test(String(e))
          ? "Crédit Google Gemini épuisé : rechargez-le sur aistudio.google.com (Facturation), puis relancez le lien."
          : (e instanceof Error ? e.message : String(e)).slice(0, 400),
      })
      .eq("id", id);
  }
}
