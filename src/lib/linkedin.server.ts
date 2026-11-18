// Logique serveur LinkedIn : rédaction, planning du mois, publication.
import { anonymizeAsset, monthPlan, type PostKind } from "@/lib/linkedin";

export const LINKEDIN_BUDGET_EUR = 10;
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
export async function writePost(admin: Admin, userId: string, kind: PostKind): Promise<{ body: string; chart: Chart | null } | { error: string }> {
  if (!(await linkedinBudgetLeft(admin))) return { error: `Plafond LinkedIn de ${LINKEDIN_BUDGET_EUR} € atteint ce mois-ci.` };
  const { data: s } = await admin.from("linkedin_settings").select("specialty").eq("user_id", userId).maybeSingle();
  const specialty = s?.specialty?.trim() || "immobilier d'investissement";
  const g = await import("@/lib/gemini.server");
  try {
    if (kind === "actifs") {
      const { data: assets } = await admin.from("assets").select("asset_class, asset_subclass, surface, postal_code, city, price")
        .eq("owner_id", userId).eq("status", "disponible").order("updated_at", { ascending: false }).limit(30);
      const lines = (assets ?? []).map(anonymizeAsset).filter(Boolean).slice(0, 3) as string[];
      if (lines.length === 0) return { error: "Aucun actif disponible avec type et prix pour ce post." };
      const body = await g.callGemini({ task: "linkedin", system: STYLE, turns: [{ role: "user", text: `Rédige un post court de début de semaine présentant ces actifs à vendre, en reprenant chaque ligne telle quelle en liste, avec une accroche et un appel à me contacter en message privé :\n${lines.map((l) => `- ${l}`).join("\n")}` }] });
      return { body, chart: null };
    }
    if (kind === "specialite") {
      const body = await g.callGemini({ task: "linkedin", system: STYLE, turns: [{ role: "user", text: `Rédige un article LinkedIn (250 à 400 mots) sur un sujet utile et actuel de ma spécialité : ${specialty}. Un titre accrocheur en première ligne.` }] });
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
export async function publishToLinkedin(userId: string, text: string): Promise<{ ok: true } | { ok: false; reconnect?: boolean; error: string }> {
  const { getConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
  const { callAsAppUser, appUserReconnectRequired } = await import("@/integrations/lovable/appUserConnector");
  const key = await getConnectionKeyForUser(userId, "linkedin");
  if (!key) return { ok: false, error: "LinkedIn non connecté." };
  const me = await callAsAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: "linkedin", path: "/v2/userinfo", requiredScopes: LINKEDIN_SCOPES });
  if (await appUserReconnectRequired(me)) return { ok: false, reconnect: true, error: "Connexion LinkedIn à renouveler." };
  if (!me.ok) return { ok: false, error: `LinkedIn profil [${me.status}] ${(await me.text()).slice(0, 200)}` };
  const { sub } = (await me.json()) as { sub: string };
  const res = await callAsAppUser({
    gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: "linkedin", path: "/v2/ugcPosts", requiredScopes: LINKEDIN_SCOPES,
    init: { method: "POST", headers: { "Content-Type": "application/json", "X-Restli-Protocol-Version": "2.0.0" }, body: JSON.stringify({
      author: `urn:li:person:${sub}`, lifecycleState: "PUBLISHED",
      specificContent: { "com.linkedin.ugc.ShareContent": { shareCommentary: { text }, shareMediaCategory: "NONE" } },
      visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
    }) },
  });
  if (await appUserReconnectRequired(res)) return { ok: false, reconnect: true, error: "Connexion LinkedIn à renouveler." };
  if (!res.ok) return { ok: false, error: `LinkedIn publication [${res.status}] ${(await res.text()).slice(0, 200)}` };
  return { ok: true };
}
