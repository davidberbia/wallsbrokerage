import { createServerFn } from "@tanstack/react-start";
import { getRequest } from "@tanstack/react-start/server";
import { z } from "zod";
import { requireStaffAuth } from "@/lib/staff-middleware";

/** Rédige (ou réécrit) un post. Sans postId : nouveau brouillon du jour. */
export const generateLinkedinPost = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d: { kind: "actifs" | "specialite" | "marche"; postId?: string; assetIds?: string[]; reject?: boolean }) =>
    z.object({ reject: z.boolean().optional(), kind: z.enum(["actifs", "specialite", "marche"]), postId: z.string().uuid().optional(), assetIds: z.array(z.string().uuid()).min(1).max(3).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getAdmin } = await import("@/lib/automation.server");
    const { writePost } = await import("@/lib/linkedin.server");
    let assetIds = data.assetIds ?? [];
    if (data.kind === "actifs" && !data.assetIds && data.postId) {
      const { data: cur } = await supabase.from("linkedin_posts").select("asset_ids").eq("id", data.postId).eq("user_id", userId).maybeSingle();
      assetIds = cur?.asset_ids ?? [];
    }
    if (data.reject && data.kind === "specialite" && data.postId) {
      const { postTitle } = await import("@/lib/linkedin.server");
      const { data: cur } = await supabase.from("linkedin_posts").select("body").eq("id", data.postId).eq("user_id", userId).maybeSingle();
      const t = postTitle(cur?.body);
      if (t) {
        const { data: st } = await supabase.from("linkedin_settings").select("rejected_topics").eq("user_id", userId).maybeSingle();
        const list = [...(st?.rejected_topics ?? []), t].slice(-30);
        if (st) await supabase.from("linkedin_settings").update({ rejected_topics: list }).eq("user_id", userId);
        else await supabase.from("linkedin_settings").insert({ user_id: userId, rejected_topics: list });
      }
    }
    const r = await writePost(await getAdmin(), userId, data.kind, assetIds);
    if ("error" in r) return { error: r.error };
    if (!r.body.trim()) return { error: "L'IA n'a rien renvoyé." };
    let id = data.postId;
    if (id) {
      const { error } = await supabase.from("linkedin_posts").update({ body: r.body.trim(), chart: r.chart, error: null, asset_ids: assetIds }).eq("id", id).eq("user_id", userId);
      if (error) return { error: error.message };
    } else {
      const { data: row, error } = await supabase.from("linkedin_posts").insert({ user_id: userId, kind: data.kind, body: r.body.trim(), chart: r.chart, asset_ids: assetIds }).select("id").single();
      if (error) return { error: error.message };
      id = row.id;
    }
    // Actifs : l'image n'est créée qu'à la demande du collaborateur.
    if (data.kind === "actifs") return { id, imageError: null };
    const { makePostImage } = await import("@/lib/linkedin.server");
    const img = await makePostImage(await getAdmin(), userId, id, data.kind, r.body, r.chart);
    return { id, imageError: "error" in img ? img.error : null };
  });

/** Prépare les emplacements du mois (sans IA ; la rédaction se fait ensuite par paquets). */
export const planLinkedinMonth = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: s } = await supabase.from("linkedin_settings").select("market_day").eq("user_id", userId).maybeSingle();
    const { getAdmin } = await import("@/lib/automation.server");
    const { ensureMonthPlan } = await import("@/lib/linkedin.server");
    return { added: await ensureMonthPlan(await getAdmin(), userId, s?.market_day ?? 1) };
  });

export const linkedinStatus = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .handler(async ({ context }) => {
    const { getAdmin } = await import("@/lib/automation.server");
    const admin = await getAdmin();
    const { data } = await admin.from("app_user_connections").select("updated_at").eq("user_id", context.userId).eq("connector_id", "linkedin").maybeSingle();
    return { configured: !!process.env["LINKEDIN_APP_USER_CONNECTOR_CLIENT_API_KEY"], connected: !!data };
  });

export const startLinkedinConnect = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .handler(async ({ context }) => {
    const clientKey = process.env["LINKEDIN_APP_USER_CONNECTOR_CLIENT_API_KEY"];
    if (!clientKey) throw new Error("Application LinkedIn de l'entreprise non configurée.");
    const request = getRequest();
    if (!request) throw new Error("Requête manquante.");
    const url = new URL(request.url);
    const sandboxHost = url.hostname === "localhost" ? request.headers.get("x-forwarded-host") : null;
    const returnUrl = new URL("/api/oauth/linkedin/return", sandboxHost ? `https://${sandboxHost}` : url.origin).toString();
    const { authorizeAppUserOAuth } = await import("@/integrations/lovable/appUserConnector");
    const { GATEWAY_BASE_URL, LINKEDIN_SCOPES } = await import("@/lib/linkedin.server");
    const { authorizationUrl } = await authorizeAppUserOAuth({ gatewayBaseUrl: GATEWAY_BASE_URL, connectorId: "linkedin", appUserId: context.userId, clientAPIKey: clientKey, returnUrl, credentialsConfiguration: { scopes: LINKEDIN_SCOPES } });
    return { authorizationUrl };
  });

export const completeLinkedinConnect = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d: { code: string }) => z.object({ code: z.string().min(1).max(2000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { exchangeAppUserOAuthCode } = await import("@/integrations/lovable/appUserConnector");
    const { GATEWAY_BASE_URL } = await import("@/lib/linkedin.server");
    const { saveConnectionKeyForUser } = await import("@/lib/appUserConnections.server");
    const r = await exchangeAppUserOAuthCode(GATEWAY_BASE_URL, data.code);
    if (r.connectorId !== "linkedin") throw new Error("Mauvais connecteur.");
    await saveConnectionKeyForUser(context.userId, "linkedin", r.connectionAPIKey);
    await context.supabase.from("linkedin_settings").update({ reconnect_required: false }).eq("user_id", context.userId);
    return { ok: true };
  });

export const disconnectLinkedin = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .handler(async ({ context }) => {
    const { getConnectionKeyForUser, deleteConnectionForUser } = await import("@/lib/appUserConnections.server");
    const key = await getConnectionKeyForUser(context.userId, "linkedin");
    if (key) {
      const { disconnectAppUser } = await import("@/integrations/lovable/appUserConnector");
      const { GATEWAY_BASE_URL } = await import("@/lib/linkedin.server");
      await disconnectAppUser({ gatewayBaseUrl: GATEWAY_BASE_URL, connectionAPIKey: key, connectorId: "linkedin" });
    }
    await deleteConnectionForUser(context.userId, "linkedin");
    return { ok: true };
  });

/** Recrée l'image d'un post avec Gemini. */
export const regenerateLinkedinImage = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d: { postId: string }) => z.object({ postId: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: p } = await context.supabase.from("linkedin_posts").select("id, kind, body, chart").eq("id", data.postId).eq("user_id", context.userId).maybeSingle();
    if (!p) return { error: "Post introuvable." };
    if (!p.body.trim()) return { error: "Rédigez d'abord le texte." };
    const { getAdmin } = await import("@/lib/automation.server");
    const { makePostImage } = await import("@/lib/linkedin.server");
    const r = await makePostImage(await getAdmin(), context.userId, p.id, p.kind as "actifs" | "specialite" | "marche", p.body, p.chart as never);
    return "error" in r ? { error: r.error } : { ok: true };
  });
