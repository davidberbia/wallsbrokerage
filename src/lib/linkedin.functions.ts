import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireStaffAuth } from "@/lib/staff-middleware";
import { anonymizeAsset, type PostKind } from "@/lib/linkedin";

export const LINKEDIN_BUDGET_EUR = 10;

const STYLE = `Tu écris des posts LinkedIn en français pour un collaborateur de Walls Brokerage (immobilier d'investissement). Ton expert, concret, sans jargon creux, sans emojis excessifs (2 maximum), 3 à 5 hashtags à la fin. Jamais d'adresse, d'enseigne, de locataire ni de propriétaire.`;

export const generateLinkedinPost = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d: { kind: PostKind }) => z.object({ kind: z.enum(["actifs", "specialite", "marche"]) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { getAdmin } = await import("@/lib/automation.server");
    const admin = await getAdmin();
    const start = new Date();
    start.setUTCDate(1);
    start.setUTCHours(0, 0, 0, 0);
    const { data: used } = await admin.from("ai_usage").select("cost_eur").eq("task", "linkedin").gte("created_at", start.toISOString());
    if ((used ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0) >= LINKEDIN_BUDGET_EUR)
      return { error: `Plafond LinkedIn de ${LINKEDIN_BUDGET_EUR} € atteint ce mois-ci.` };

    const { data: s } = await supabase.from("linkedin_settings").select("specialty").eq("user_id", userId).maybeSingle();
    const specialty = s?.specialty?.trim() || "immobilier d'investissement";
    const g = await import("@/lib/gemini.server");
    let body = "";
    type Chart = { title: string; unit: string; points: { label: string; value: number }[] };
    let chart: Chart | null = null;

    try {
      if (data.kind === "actifs") {
        const { data: assets } = await supabase
          .from("assets")
          .select("asset_class, asset_subclass, surface, postal_code, city, price")
          .eq("owner_id", userId)
          .eq("status", "disponible")
          .order("updated_at", { ascending: false })
          .limit(30);
        const lines = (assets ?? []).map(anonymizeAsset).filter(Boolean).slice(0, 3) as string[];
        if (lines.length === 0) return { error: "Aucun actif disponible avec type et prix pour ce post." };
        body = await g.callGemini({
          task: "linkedin",
          system: STYLE,
          turns: [{ role: "user", text: `Rédige un post court de début de semaine présentant ces actifs à vendre, en reprenant chaque ligne telle quelle en liste, avec une accroche et un appel à me contacter en message privé :\n${lines.map((l) => `- ${l}`).join("\n")}` }],
        });
      } else if (data.kind === "specialite") {
        body = await g.callGemini({
          task: "linkedin",
          system: STYLE,
          turns: [{ role: "user", text: `Rédige un article LinkedIn (250 à 400 mots) de milieu de semaine sur un sujet utile et actuel de ma spécialité : ${specialty}. Un titre accrocheur en première ligne.` }],
        });
      } else {
        const { data: src } = await supabase.from("linkedin_sources").select("url").eq("user_id", userId);
        const urls = (src ?? []).map((r) => r.url);
        if (urls.length === 0) return { error: "Ajoutez au moins un site source pour le point marché." };
        const r = (await g.callGeminiSearch({
          task: "linkedin",
          system: `${STYLE} Réponds uniquement en JSON {"body": string, "chart": {"title": string, "unit": string, "points": [{"label": string, "value": number}]}}. Le graphique contient 4 à 8 valeurs chiffrées réelles tirées des sources (ex. prix au m² ou taux sur plusieurs périodes).`,
          prompt: `Résume l'évolution récente du marché « ${specialty} » d'après ces sites, en citant les chiffres clés, pour un post LinkedIn mensuel (200 à 300 mots) :\n${urls.join("\n")}`,
        })) as { body?: string; summary?: string; chart?: Chart } | null;
        body = r?.body ?? r?.summary ?? "";
        const pts = r?.chart?.points?.filter((p: { label: string; value: number }) => p && typeof p.value === "number" && p.label) ?? [];
        chart = pts.length >= 2 ? { title: r?.chart?.title ?? "", unit: r?.chart?.unit ?? "", points: pts.slice(0, 8) } : null;
      }
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Génération impossible." };
    }
    if (!body.trim()) return { error: "L'IA n'a rien renvoyé." };
    const { data: row, error } = await supabase
      .from("linkedin_posts")
      .insert({ user_id: userId, kind: data.kind, body: body.trim(), chart })
      .select("id")
      .single();
    if (error) return { error: error.message };
    return { id: row.id };
  });
