// Appels à Gemini avec la clé Google de David, suivi des coûts et plafond mensuel.
import { getAdmin } from "@/lib/automation.server";

export const GEMINI_MODEL = "gemini-3.5-flash";
export const MONTHLY_BUDGET_EUR = 30;
// Tarifs approximatifs (€/million de jetons), volontairement arrondis à la hausse.
const PRICE_IN = 0.5;
const PRICE_OUT = 3.5;

export type GeminiTurn = { role: "user" | "model"; text: string };

export class BudgetReachedError extends Error {
  constructor() {
    super(`Plafond IA de ${MONTHLY_BUDGET_EUR} € atteint ce mois-ci : l'assistant est en pause jusqu'au mois prochain.`);
  }
}

export async function monthSpent(): Promise<number> {
  const admin = await getAdmin();
  const start = new Date();
  start.setUTCDate(1);
  start.setUTCHours(0, 0, 0, 0);
  const { data } = await admin.from("ai_usage").select("cost_eur").gte("created_at", start.toISOString());
  return (data ?? []).reduce((s, r) => s + Number(r.cost_eur ?? 0), 0);
}

export async function callGemini(opts: {
  task: string;
  system: string;
  turns: GeminiTurn[];
  json?: boolean;
}): Promise<string> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("Clé Gemini absente.");
  if ((await monthSpent()) >= MONTHLY_BUDGET_EUR) throw new BudgetReachedError();

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: opts.system }] },
        contents: opts.turns.map((t) => ({ role: t.role, parts: [{ text: t.text }] })),
        generationConfig: opts.json ? { responseMimeType: "application/json" } : {},
      }),
    },
  );
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gemini [${res.status}] ${body.slice(0, 300)}`);
  }
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  const u = data.usageMetadata ?? {};
  const tin = u.promptTokenCount ?? 0;
  const tout = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
  const admin = await getAdmin();
  await admin.from("ai_usage").insert({
    task: opts.task,
    tokens_in: tin,
    tokens_out: tout,
    cost_eur: (tin * PRICE_IN + tout * PRICE_OUT) / 1_000_000,
  });
  return (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
}

export async function callGeminiJson<T>(opts: { task: string; system: string; prompt: string }): Promise<T | null> {
  const text = await callGemini({ ...opts, turns: [{ role: "user", text: opts.prompt }], json: true });
  try {
    return JSON.parse(text.replace(/^```json\s*|```$/g, "")) as T;
  } catch {
    return null;
  }
}
