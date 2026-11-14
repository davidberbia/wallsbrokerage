// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";

type EnrichInput = {
  ville: string;
  adresse: string;
  descriptionCourante?: string;
  besoin: "ville" | "trafic" | "traficRoutier" | "fluxPieton" | "commerce" | "projets";
};

const GATEWAY = "https://ai.gateway.lovable.dev/v1/responses";

async function askAI(system: string, user: string): Promise<string> {
  const key = process.env['LOVABLE_API_KEY'];
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: "openai/gpt-6-astra",
      instructions: system,
      input: user,
      stream: true,
      reasoning: { effort: "low", summary: "auto" },
      include: ["reasoning.encrypted_content"],
      store: false,
    }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`IA échouée: ${r.status} ${t.slice(0, 200)}`);
  }
  if (!r.body) throw new Error("IA échouée : réponse vide");
  const reader = r.body.getReader();
  const decoder = new TextDecoder();
  let pending = "";
  let output = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    pending += decoder.decode(value, { stream: true });
    const events = pending.split("\n\n");
    pending = events.pop() || "";
    for (const event of events) {
      for (const line of event.split("\n")) {
        if (!line.startsWith("data: ")) continue;
        const raw = line.slice(6);
        if (raw === "[DONE]") continue;
        try {
          const payload = JSON.parse(raw) as { type?: string; delta?: string };
          if (payload.type === "response.output_text.delta" && payload.delta) output += payload.delta;
        } catch {
          // Ignore keepalive or incomplete stream events.
        }
      }
    }
  }
  if (!output.trim()) throw new Error("Lovable AI n'a retourné aucun texte.");
  return output.trim();
}

export const enrichContent = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: EnrichInput) => data)
  .handler(async ({ data }) => {
    const loc = `${data.adresse}, ${data.ville}`.replace(/^,\s*/, "");
    let system = "";
    let user = "";
    switch (data.besoin) {
      case "ville":
        system =
          "Tu es un rédacteur spécialisé en immobilier commercial en France. " +
          "Tu produis des descriptions factuelles, sobres et informatives (3 à 5 phrases, ~120 mots), sans exagération ni superlatif marketing.";
        user =
          `Décris la ville de ${data.ville} pour une brochure de vente d'un actif commercial. ` +
          `Mentionne : population, position géographique, dynamique économique, principaux atouts, accessibilité générale. ` +
          (data.descriptionCourante ? `Un premier paragraphe existe déjà (issu de Wikipédia) : "${data.descriptionCourante}". Rédige un NOUVEAU paragraphe complémentaire, sans reprendre les mêmes informations, orienté attractivité commerciale et investisseur.` : "");
        break;
      case "trafic":
      case "traficRoutier":
        system =
          "Tu es un analyste immobilier commercial. Réponds en 2-3 phrases synthétiques, exploitables en brochure. Donne uniquement le trafic routier avec des chiffres publics vérifiables ; si aucun comptage public n'est disponible, indique-le clairement sans inventer de valeur.";
        user = `Donne uniquement le trafic routier (véhicules/jour sur les axes proches) à proximité immédiate de : ${loc}. Cite le nom des axes et l'année du comptage quand ils sont identifiables. Ne mentionne aucun flux piéton.`;
        break;
      case "fluxPieton":
        system =
          "Tu es un analyste immobilier commercial. Réponds en 2-3 phrases synthétiques, exploitables en brochure. Donne uniquement les indicateurs factuels de flux piéton et de continuité commerciale ; n'invente jamais un comptage piéton.";
        user = `Décris uniquement le flux piéton à proximité immédiate de : ${loc}, à partir des pôles générateurs, transports, restaurants, commerces et continuité commerciale identifiables. Si aucun comptage public n'existe, indique qu'un comptage terrain reste nécessaire. Ne mentionne aucun trafic routier.`;
        break;
      case "commerce":
        system =
          "Tu es un analyste retail en France. Réponds en 3-4 phrases synthétiques avec chiffres si disponibles publiquement ; distingue les faits publics des estimations prudentes.";
        user = `Pour ${loc}, identifie la zone commerciale la plus proche, estime son chiffre d'affaires annuel, précise le nombre de commerces, et indique le chiffre d'affaires de l'hypermarché/supermarché principal de cette zone quand il existe. Si aucun hypermarché n'est identifiable, écris explicitement qu'aucun hypermarché dominant n'a été identifié.`;
        break;
      case "projets":
        system =
          "Tu es un analyste territorial. Réponds en 2-3 phrases sur les projets urbains, ZAC, transports, ouvertures d'enseignes.";
        user = `Projets à venir susceptibles d'impacter la zone commerciale de : ${loc}.`;
        break;
    }
    const content = await askAI(system, user);
    return { content };
  });

// ─── Revenus mensuels via scrape + AI parse de salairemoyen.com ───
export const fetchRevenus = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: { ville: string; codePostal?: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant");
    // Best-effort scrape
    const slug = data.ville.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    let pageText = "";
    for (const url of [
      `https://www.salairemoyen.com/salaire-ville-${slug}.html`,
      `https://www.salairemoyen.com/salaire-ville-${encodeURIComponent(data.ville)}.html`,
    ]) {
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0" } });
        if (r.ok) {
          const html = await r.text();
          pageText = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 8000);
          if (pageText.length > 500) break;
        }
      } catch {}
    }
    const system = "Tu es un extracteur de données. Réponds UNIQUEMENT en JSON valide, sans texte autour, sans balise markdown. Format : {\"celibataire\":\"1 458 € nets/mois\",\"coupleSansEnfants\":\"...\",\"familleMonoparentale\":\"...\",\"coupleUnEnfant\":\"...\",\"coupleDeuxEnfants\":\"...\",\"coupleTroisEnfants\":\"...\"}. Si une donnée manque, mets \"\".";
    const user = pageText
      ? `Extrais les revenus mensuels nets moyens pour ${data.ville} depuis ce texte de salairemoyen.com :\n\n${pageText}`
      : `Estime au mieux les revenus mensuels nets moyens à ${data.ville}, France, pour 6 types de ménages (célibataire, couple sans enfants, famille monoparentale, couple 1 enfant, couple 2 enfants, couple 3 enfants). Format XX XXX € nets/mois.`;
    const content = await askAI(system, user);
    let parsed: Record<string, string> = {};
    try {
      const cleaned = content.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      // ignore
    }
    return {
      celibataire: parsed.celibataire || "",
      coupleSansEnfants: parsed.coupleSansEnfants || "",
      familleMonoparentale: parsed.familleMonoparentale || "",
      coupleUnEnfant: parsed.coupleUnEnfant || "",
      coupleDeuxEnfants: parsed.coupleDeuxEnfants || "",
      coupleTroisEnfants: parsed.coupleTroisEnfants || "",
    };
  });

// ─── Nombre de commerces via AI (retourne "" si inconnu) ───
export const fetchNbCommerces = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: { ville: string; adresse: string }) => data)
  .handler(async ({ data }) => {
    const loc = `${data.adresse}, ${data.ville}`.replace(/^,\s*/, "");
    const system = "Tu es un analyste retail. Réponds UNIQUEMENT en JSON : {\"nb\":\"XXX\",\"nomZone\":\"...\"} ou {\"nb\":\"\",\"nomZone\":\"\"} si tu ne connais pas la donnée avec fiabilité. Ne devine jamais.";
    const user = `Nombre exact de commerces (boutiques + restaurants) dans la zone commerciale la plus proche de : ${loc}. Nomme la zone si connue.`;
    const raw = await askAI(system, user);
    try {
      const cleaned = raw.replace(/```json|```/g, "").trim();
      const j = JSON.parse(cleaned) as { nb?: string; nomZone?: string };
      return { nb: j.nb || "", nomZone: j.nomZone || "" };
    } catch {
      return { nb: "", nomZone: "" };
    }
  });

// ─── Recherche automatique de logo d'enseigne (Clearbit / Logo.dev fallback) ───
export const fetchLogoAuto = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: { enseigne: string }) => data)
  .handler(async ({ data }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY manquant");
    // 1) Ask AI for likely domain
    const system = "Réponds UNIQUEMENT avec le nom de domaine officiel (ex: carrefour.fr, decathlon.fr, mcdonalds.com) de l'enseigne, sans http, sans espace, sans texte autour. Si inconnu, réponds : none.";
    const domainRaw = await askAI(system, `Enseigne : ${data.enseigne} (France)`);
    const domain = domainRaw.replace(/[^a-zA-Z0-9.\-]/g, "").toLowerCase();
    if (!domain || domain === "none" || !domain.includes(".")) {
      return { dataUrl: "", domain: "" };
    }
    // 2) Try Clearbit (free, PNG with transparency for most)
    for (const url of [
      `https://logo.clearbit.com/${domain}?size=512&format=png`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`,
      `https://icons.duckduckgo.com/ip3/${domain}.ico`,
    ]) {
      try {
        const r = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 Wallsbroker/1.0" } });
        if (r.ok) {
          const buf = new Uint8Array(await r.arrayBuffer());
          if (buf.length < 200) continue;
          let bin = "";
          for (let i = 0; i < buf.length; i++) bin += String.fromCharCode(buf[i]);
          const mime = url.endsWith(".ico") ? "image/x-icon" : "image/png";
          return { dataUrl: `data:${mime};base64,${btoa(bin)}`, domain };
        }
      } catch {}
    }
    return { dataUrl: "", domain };
  });
