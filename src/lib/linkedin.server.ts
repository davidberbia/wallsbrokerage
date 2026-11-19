// Logique serveur LinkedIn : rédaction, planning du mois, publication.
import { anonymizeAsset, monthPlan, type PostKind } from "@/lib/linkedin";

export const LINKEDIN_BUDGET_EUR = 10;
export const LINKEDIN_IMAGE_BUDGET_EUR = 5;
const IMAGE_COST_EUR = 0.04; // ≈ 1 290 jetons image Gemini
const IMAGE_MODEL = "gemini-2.5-flash-image";
export const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev";
export const LINKEDIN_SCOPES = ["openid", "profile", "w_member_social"];

const STYLE = `Tu écris des posts LinkedIn en français pour un collaborateur de Walls Brokerage (immobilier d'investissement). Ton expert, concret, sans jargon creux, sans emojis excessifs (2 maximum), 3 à 5 hashtags à la fin. Jamais d'adresse, d'enseigne, de locataire ni de propriétaire.`;
type Chart = { title: string; unit: string; points: { label: string; value: number }[] };
type Admin = Awaited<ReturnType<typeof import("@/lib/automation.server").getAdmin>>;

export async function linkedinBudgetLeft(admin: Admin): Promise<boolean> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await admin.from("ai_usage").select("cost_eur").eq("task", "linkedin").gte("created_at", start.toISOString());
  return (data ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0) < LINKEDIN_BUDGET_EUR;
}

/** Rédige le texte d'un post pour un collaborateur (lecture limitée à ses propres données). */
export async function writePost(admin: Admin, userId: string, kind: PostKind, assetIds: string[] = []): Promise<{ body: string; chart: Chart | null } | { error: string }> {
  if (!(await linkedinBudgetLeft(admin))) return { error: `Plafond LinkedIn de ${LINKEDIN_BUDGET_EUR} € atteint ce mois-ci.` };
  const { data: s } = await admin.from("linkedin_settings").select("specialty").eq("user_id", userId).maybeSingle();
  const specialty = s?.specialty?.trim() || "immobilier d'investissement";
  const g = await import("@/lib/gemini.server");
  try {
    if (kind === "actifs") {
      if (assetIds.length < 1 || assetIds.length > 3) return { error: "Choisissez 1 à 3 actifs dans le portefeuille." };
      const { data: assets } = await admin.from("assets").select("asset_class, asset_subclass, surface, postal_code, city, price")
        .eq("owner_id", userId).in("id", assetIds);
      const lines = (assets ?? []).map(anonymizeAsset).filter(Boolean) as string[];
      if (lines.length === 0) return { error: "Les actifs choisis n'ont pas de type ou de prix." };
      const body = await g.callGemini({ task: "linkedin", system: STYLE, turns: [{ role: "user", text: `Rédige un post court de début de semaine présentant ces actifs à vendre, en reprenant chaque ligne telle quelle en liste, avec une accroche et un appel à me contacter en message privé :\n${lines.map((l) => `- ${l}`).join("\n")}` }] });
      return { body, chart: null };
    }
    if (kind === "specialite") {
      const { data: pub } = await admin.from("linkedin_posts").select("body").eq("user_id", userId).eq("kind", "specialite").eq("status", "publie").order("created_at", { ascending: false }).limit(15);
      const { data: rej } = await admin.from("linkedin_settings").select("rejected_topics").eq("user_id", userId).maybeSingle();
      const liked = (pub ?? []).map((r) => postTitle(r.body)).filter(Boolean);
      const avoid = (rej?.rejected_topics ?? []).slice(-20);
      let pref = "";
      if (liked.length) pref += `\nSujets déjà publiés que j'ai aimés (inspire-toi de ces thèmes sans jamais les répéter) :\n${liked.map((t) => `- ${t}`).join("\n")}`;
      if (avoid.length) pref += `\nSujets refusés, à éviter :\n${avoid.map((t) => `- ${t}`).join("\n")}`;
      const body = await g.callGemini({ task: "linkedin", system: STYLE, turns: [{ role: "user", text: `Rédige un article LinkedIn (250 à 400 mots) sur un sujet utile et actuel de ma spécialité : ${specialty}. Un titre accrocheur en première ligne.${pref}` }] });
      return { body, chart: null };
    }
    const { data: src } = await admin.from("linkedin_sources").select("url").eq("user_id", userId);
    const urls = (src ?? []).map((r) => r.url);
    if (urls.length === 0) return { error: "Ajoutez au moins un site source pour le point marché." };
    const r = (await g.callGeminiSearch({
      task: "linkedin",
      system: `${STYLE} Réponds uniquement en JSON {"body": string, "chart": {"title": string, "unit": string, "points": [{"label": string, "value": number}]}}. Le graphique contient 4 à 8 valeurs chiffrées réelles tirées des sources (ex. prix au m² ou taux sur plusieurs périodes).`,
      prompt: `Résume l'évolution récente du marché « ${specialty} » d'après ces sites, en citant les chiffres clés, pour un post LinkedIn mensuel (200 à 300 mots) :\n${urls.join("\n")}`,
    })) as { body?: string; summary?: string; chart?: Chart } | null;
    const pts = r?.chart?.points?.filter((p) => p && typeof p.value === "number" && p.label) ?? [];
    return { body: r?.body ?? r?.summary ?? "", chart: pts.length >= 2 ? { title: r?.chart?.title ?? "", unit: r?.chart?.unit ?? "", points: pts.slice(0, 8) } : null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Génération impossible." };
  }
}

async function imageBudgetLeft(admin: Admin): Promise<boolean> {
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await admin.from("ai_usage").select("cost_eur").eq("task", "linkedin_image").gte("created_at", start.toISOString());
  return (data ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0) + IMAGE_COST_EUR <= LINKEDIN_IMAGE_BUDGET_EUR;
}

function imagePrompt(kind: PostKind, body: string, chart: Chart | null): string {
  const common = "Format paysage 1200x627 pour LinkedIn, rendu professionnel haut de gamme, couleurs sobres. Aucun logo, aucune adresse, aucune enseigne, aucun visage reconnaissable.";
  if (kind === "marche" && chart) {
    return `Infographie élégante en graphique à barres, titre « ${chart.title} ». Valeurs exactes à afficher, dans cet ordre : ${chart.points.map((p) => `${p.label} = ${p.value.toLocaleString("fr-FR")}${chart.unit ? ` ${chart.unit}` : ""}`).join(" ; ")}. Textes en français, lisibles, sans faute. ${common}`;
  }
  const what = kind === "actifs" ? "une photographie d'architecture évoquant ces biens immobiliers à vendre" : "une photographie d'illustration éditoriale pour cet article immobilier";
  return `Crée ${what}, sans aucun texte dans l'image. Sujet : ${body.slice(0, 900)}. ${common}`;
}

/** Gemini crée l'image du post et la range dans l'espace privé du collaborateur. */
export async function makePostImage(admin: Admin, userId: string, postId: string, kind: PostKind, body: string, chart: Chart | null): Promise<{ path: string } | { error: string }> {
  if (!(await imageBudgetLeft(admin))) return { error: `Plafond images LinkedIn de ${LINKEDIN_IMAGE_BUDGET_EUR} € atteint ce mois-ci.` };
  const key = process.env["GEMINI_API_KEY"];
  if (!key) return { error: "Clé Gemini absente." };
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${IMAGE_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({ contents: [{ parts: [{ text: imagePrompt(kind, body, chart) }] }], generationConfig: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio: "16:9" } } }),
  });
  if (!res.ok) return { error: `Image Gemini [${res.status}] ${(await res.text()).slice(0, 200)}` };
  const d = (await res.json()) as { candidates?: { content?: { parts?: { inlineData?: { mimeType?: string; data?: string } }[] } }[] };
  const img = d.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data)?.inlineData;
  await admin.from("ai_usage").insert({ task: "linkedin_image", tokens_in: 0, tokens_out: 1290, cost_eur: img ? IMAGE_COST_EUR : 0 });
  if (!img?.data) return { error: "Gemini n'a pas renvoyé d'image." };
  const bytes = Uint8Array.from(atob(img.data), (c) => c.charCodeAt(0));
  const path = `${userId}/${postId}-${Date.now()}.png`;
  const { error } = await admin.storage.from("linkedin-images").upload(path, bytes, { contentType: img.mimeType ?? "image/png" });
  if (error) return { error: error.message };
  await admin.from("linkedin_posts").update({ image_path: path }).eq("id", postId);
  return { path };
}

/** Crée les emplacements vides du mois restant (sans IA). */
export async function ensureMonthPlan(admin: Admin, userId: string, marketDay: number, from = new Date()) {
  const rows = monthPlan(from, marketDay).map((p) => ({ user_id: userId, kind: p.kind, scheduled_for: p.date, body: "" }));
  if (rows.length === 0) return 0;
  const { data: existing } = await admin.from("linkedin_posts").select("kind, scheduled_for").eq("user_id", userId).gte("scheduled_for", rows[0]!.scheduled_for);
  const have = new Set((existing ?? []).map((e) => `${e.kind}|${e.scheduled_for}`));
  const add = rows.filter((r) => !have.has(`${r.kind}|${r.scheduled_for}`));
  if (add.length) await admin.from("linkedin_posts").insert(add);
  return add.length;
}

/** Publie un texte sur le profil LinkedIn du collaborateur. */
export async function publishToLinkedin(userId: string, text: string, imagePath?: string | null): Promise<{ ok: true } | { ok: false; reconnect?: boolean; error: string }> {
  const { getConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
  const { callAsAppUser, appUserReconnectRequired } = await import("@/integrations/lovable/appUserConnector");
  const key = await getConnectionKeyForUser(userId, "linkedin");
  if (!key) return { ok: false, error: "LinkedIn non connecté." };
  const me = await callAsAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: "linkedin", path: "/v2/userinfo", requiredScopes: LINKEDIN_SCOPES });
  if (await appUserReconnectRequired(me)) return { ok: false, reconnect: true, error: "Connexion LinkedIn à renouveler." };
  if (!me.ok) return { ok: false, error: `LinkedIn profil [${me.status}] ${(await me.text()).slice(0, 200)}` };
  const { sub } = (await me.json()) as { sub: string };
  let asset: string | null = null;
  if (imagePath) {
    const { getAdmin } = await import("@/lib/automation.server");
    const { data: file } = await (await getAdmin()).storage.from("linkedin-images").download(imagePath);
    if (!file) return { ok: false, error: "Image du post introuvable." };
    const reg = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: "linkedin", path: "/v2/assets?action=registerUpload", requiredScopes: LINKEDIN_SCOPES,
      init: { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ registerUploadRequest: { recipes: ["urn:li:digitalmediaRecipe:feedshare-image"], owner: `urn:li:person:${sub}`, serviceRelationships: [{ relationshipType: "OWNER", identifier: "urn:li:userGeneratedContent" }] } }) },
    });
    if (!reg.ok) return { ok: false, error: `LinkedIn image [${reg.status}] ${(await reg.text()).slice(0, 200)}` };
    const v = ((await reg.json()) as { value: { asset: string; uploadMechanism: Record<string, { uploadUrl: string }> } }).value;
    const up = new URL(v.uploadMechanism["com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest"]!.uploadUrl);
    const put = await callAsAppUser({
      gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: "linkedin", path: up.pathname + up.search, requiredScopes: LINKEDIN_SCOPES,
      init: { method: "PUT", headers: { "Content-Type": "application/octet-stream" }, body: await file.arrayBuffer() },
    });
    if (!put.ok) return { ok: false, error: `LinkedIn envoi image [${put.status}] ${(await put.text()).slice(0, 200)}` };
    asset = v.asset;
  }
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: "linkedin", path: "/v2/ugcPosts", requiredScopes: LINKEDIN_SCOPES,
    init: { method: "POST", headers: { "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" }, body: JSON.stringify({
      author: `urn:li:person:${sub}`, lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, ...(asset ? { shareMediaCategory: "IMAGE", media: [{ status: "READY", media: asset }] } : { shareMediaCategory: "NONE" }) } },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }) },
  });
  if (await appUserReconnectRequired(res)) return { ok: false, reconnect: true, error: "Connexion LinkedIn à renouveler." };
  if (!res.ok) return { ok: false, error: `LinkedIn publication [${res.status}] ${(await res.text()).slice(0, 200)}` };
  return { ok: true };
}

/** Titre d'un article = sa première ligne non vide. */
export function postTitle(body: string | null | undefined): string {
  return (body ?? "").split("\n").map((l) => l.replace(/[*#]/g, "").trim()).find(Boolean)?.slice(0, 160) ?? "";
}
