// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { requireStaffAuth } from "@/lib/staff-middleware";
import { createServerFn } from "@tanstack/react-start";

const GATEWAY = "https://ai.gateway.lovable.dev/v1/chat/completions";

type EtatLocatifInput = {
  filename: string;
  text?: string;              // texte déjà extrait (xlsx client-side ou copié-collé)
  pdfBase64?: string;         // PDF
  imageBase64?: string;       // JPG/PNG/WEBP
  imageMime?: string;         // ex "image/png"
};

const SYSTEM = `Tu es un extracteur d'état locatif (bail commercial, France).
Tu reçois un tableau d'état locatif (image, PDF, Excel converti en texte, ou texte brut) et tu produis UNIQUEMENT un JSON valide (aucun texte autour, aucune balise markdown) au format :

{
  "locataires": [
    { "enseigne": "", "surface": "", "loyerAnnuel": "", "loyerM2": "", "debutBail": "", "prochainBreak": "", "walb": "", "finBail": "", "walt": "" }
  ]
}

Règles :
- Extrait IMPÉRATIVEMENT TOUTES les lignes du tableau (baux). Un oubli est une erreur critique.
- Ignore la ligne TOTAL (elle sera recalculée automatiquement).
- Conserve les nombres tels qu'écrits (espaces, "€", "m²"), sans conversion.
- Dates au format tel qu'écrit (JJ/MM/AAAA ou similaire).
- Si une colonne manque, mets "".
- Si un chiffre paraît illisible, mets "" plutôt que d'inventer.`;

async function callAI(body: object): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("LOVABLE_API_KEY manquant");
  const r = await fetch(GATEWAY, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`IA état locatif échouée: ${r.status} ${(await r.text()).slice(0, 300)}`);
  const j = (await r.json()) as { choices?: { message?: { content?: string } }[] };
  return j.choices?.[0]?.message?.content?.trim() || "";
}

export const importEtatLocatif = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((data: EtatLocatifInput) => data)
  .handler(async ({ data }) => {
    const model = "google/gemini-2.5-flash";
    let content = "";
    if (data.pdfBase64) {
      content = await callAI({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `Fichier : ${data.filename}. Extrais toutes les lignes du tableau d'état locatif.` },
              { type: "file", file: { filename: data.filename, file_data: `data:application/pdf;base64,${data.pdfBase64}` } },
            ],
          },
        ],
      });
    } else if (data.imageBase64) {
      const mime = data.imageMime || "image/png";
      content = await callAI({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          {
            role: "user",
            content: [
              { type: "text", text: `Image d'un état locatif (${data.filename}). Extrais toutes les lignes.` },
              { type: "image_url", image_url: { url: `data:${mime};base64,${data.imageBase64}` } },
            ],
          },
        ],
      });
    } else if (data.text) {
      content = await callAI({
        model,
        messages: [
          { role: "system", content: SYSTEM },
          { role: "user", content: `Fichier : ${data.filename}. Contenu tabulaire :\n\n${data.text.slice(0, 30000)}` },
        ],
      });
    } else {
      throw new Error("Aucun contenu à extraire.");
    }
    try {
      const cleaned = content.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned) as { locataires?: unknown };
      const rows = Array.isArray(parsed.locataires) ? parsed.locataires : [];
      return { locataires: rows, error: "" };
    } catch {
      return { locataires: [], error: "JSON invalide", raw: content.slice(0, 500) };
    }
  });
