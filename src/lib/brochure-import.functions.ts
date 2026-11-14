// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type ImportInput = {
  filename: string;
  text?: string;
  pdfBase64?: string;
};

const EXTRACTION_SYSTEM = `Tu es un extracteur de données pour brochures d'immobilier commercial (France).
Tu reçois le contenu texte d'une brochure (PDF/PPTX/Word) et tu produis UNIQUEMENT un JSON valide (aucun texte autour, aucune balise markdown) qui suit strictement ce schéma :

{
  "nomSite": "string",
  "adresse": "string",
  "codePostal": "string",
  "ville": "string",
  "typeBien": "string (ex: Ensemble commercial, Retail Park, Commerce, Cellule…)",
  "surface": "string (m²)",
  "typeVente": "string (ex: Vente de gré à gré)",
  "prixVente": "string (avec devise)",
  "honoraires": "string",
  "loyerAnnuel": "string (avec devise, HC-HT)",
  "loyerM2": "string (€/m²/an)",
  "nbParkings": "string (nombre de places de parking, chiffre uniquement, sinon '')",
  "pointsCles": ["string", "..."],
  "descriptionVille": "string (paragraphe)",
  "envSousTitre": "string",
  "envTrafic": "string",
  "envCA": "string",
  "envNbCommerces": "string",
  "envProjets": "string",
  "populationZone1": "string",
  "populationZone2": "string",
  "surfaceZone1": "string",
  "surfaceZone2": "string",
  "dureeZone1": 15,
  "dureeZone2": 30,
  "modeChalandise": "voiture",
  "revenus": {
    "celibataire": "",
    "coupleSansEnfants": "",
    "familleMonoparentale": "",
    "coupleUnEnfant": "",
    "coupleDeuxEnfants": "",
    "coupleTroisEnfants": ""
  },
  "locataires": [
    { "enseigne": "", "surface": "", "loyerAnnuel": "", "loyerM2": "", "debutBail": "", "prochainBreak": "", "walb": "", "finBail": "", "walt": "" }
  ],
  "comparables": [
    { "enseigne": "", "ville": "", "adresse": "", "surface": "", "loyerAnnuel": "", "loyerM2": "", "dateSignature": "YYYY-MM-DD", "notes": "" }
  ]
}

Règles :
- Mets "" pour toute valeur inconnue, [] pour toute liste vide.
- Ne remplis JAMAIS un champ par inférence : utilise uniquement ce qui figure dans le document.
- Conserve les nombres tels qu'écrits (avec espaces, "€", "m²").
- "nomSite" = NOM COMMERCIAL du site tel qu'affiché sur la page de garde (ex: "CLÉMENCE ISAURE RETAIL PARK", "MOULIN DE RAMBOUILLET"). N'utilise JAMAIS "WALLSBROKER" comme nomSite (WALLSBROKER est le broker, pas le site). Si aucun nom commercial n'est indiqué, laisse "".
- Pour "locataires" : extrais IMPÉRATIVEMENT TOUS les baux listés dans l'état locatif (souvent 2 à 6 lignes). Compte le nombre de lignes du tableau et retourne exactement ce nombre d'entrées. Un oubli est une erreur critique.
- Pour "comparables", si le document contient une slide de références locatives (ventes/loyers comparables), les extraire ici ; sinon [].
- Ne récupère pas l'accessibilité : ce texte n'est pas utilisé et doit rester absent/ignoré.
- pointsCles : les 3 à 6 chiffres/highlights principaux (ex: "742 000 € HC-HT — Revenu locatif annuel").`;


async function callAI(body: object): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`IA import échouée: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content?.trim() || "";
}

export const importBrochure = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: ImportInput) => data)
  .handler(async ({ data }) => {
    const model = "google/gemini-2.5-flash";
    let content = "";
    if (data.pdfBase64) {
      const body = {
        model,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `Fichier : ${data.filename}. Extrais toutes les données.` },
              {
                type: "file",
                file: {
                  filename: data.filename,
                  file_data: `data:application/pdf;base64,${data.pdfBase64}`,
                },
              },
            ],
          },
        ],
      };
      content = await callAI(body);
    } else if (data.text) {
      const body = {
        model,
        messages: [
          { role: "system", content: EXTRACTION_SYSTEM },
          { role: "user", content: `Fichier : ${data.filename}. Texte extrait :\n\n${data.text.slice(0, 30000)}` },
        ],
      };
      content = await callAI(body);
    } else {
      throw new Error("Aucun contenu à extraire.");
    }
    try {
      const cleaned = content.replace(/```json|```/g, "").trim();
      JSON.parse(cleaned); // validate
      return { json: cleaned, error: "" };
    } catch {
      return { json: "{}", error: "JSON invalide", raw: content.slice(0, 500) };
    }
  });

