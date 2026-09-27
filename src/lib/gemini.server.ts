// Appels à Gemini avec la clé Google de David, suivi des coûts et plafond mensuel.
import { getAdmin } from "@/lib/automation.server";

export const GEMINI_MODEL = "gemini-3.5-flash";
export const MONTHLY_BUDGET_EUR = 50;
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
        generationConfig: { thinkingConfig: { thinkingLevel: "low" }, ...(opts.json ? { responseMimeType: "application/json" } : {}) },
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

/** Variante avec un fichier joint (PDF, image…) envoyé directement à Gemini. */
export async function callGeminiFileJson<T>(opts: {
  task: string;
  system: string;
  prompt: string;
  file: { mimeType: string; base64: string };
}): Promise<T | null> {
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
        contents: [
          {
            role: "user",
            parts: [{ inlineData: { mimeType: opts.file.mimeType, data: opts.file.base64 } }, { text: opts.prompt }],
          },
        ],
        generationConfig: { thinkingConfig: { thinkingLevel: "low" }, responseMimeType: "application/json" },
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
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  try {
    return JSON.parse(text.replace(/^```json\s*|```$/g, "")) as T;
  } catch {
    return null;
  }
}

/** Variante générique : parties libres (texte, vidéo YouTube via fileData…), réponse JSON. */
export async function callGeminiPartsJson<T>(opts: {
  task: string;
  system: string;
  parts: Record<string, unknown>[];
}): Promise<T | null> {
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
        contents: [{ role: "user", parts: opts.parts }],
        generationConfig: { thinkingConfig: { thinkingLevel: "low" }, responseMimeType: "application/json" },
      }),
    },
  );
  if (!res.ok) throw new Error(`Gemini [${res.status}] ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as {
    candidates?: { content?: { parts?: { text?: string }[] } }[];
    usageMetadata?: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number };
  };
  const u = data.usageMetadata ?? {};
  const tin = u.promptTokenCount ?? 0;
  const tout = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
  const admin = await getAdmin();
  await admin.from("ai_usage").insert({ task: opts.task, tokens_in: tin, tokens_out: tout, cost_eur: (tin * PRICE_IN + tout * PRICE_OUT) / 1_000_000 });
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  try {
    return JSON.parse(text.replace(/^```json\s*|```$/g, "")) as T;
  } catch {
    return null;
  }
}

async function logUsage(task: string, u: { promptTokenCount?: number; candidatesTokenCount?: number; thoughtsTokenCount?: number } = {}) {
  const tin = u.promptTokenCount ?? 0;
  const tout = (u.candidatesTokenCount ?? 0) + (u.thoughtsTokenCount ?? 0);
  const admin = await getAdmin();
  await admin.from("ai_usage").insert({ task, tokens_in: tin, tokens_out: tout, cost_eur: (tin * PRICE_IN + tout * PRICE_OUT) / 1_000_000 + (task === "enrichissement" ? 0.03 : 0) });
}

/** Recherche web ancrée Google Search ; réponse JSON (analysée depuis le texte). */
export async function callGeminiSearch(opts: { task: string; system: string; prompt: string }): Promise<{ summary?: string; suggestion?: string } | null> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("Clé Gemini absente.");
  if ((await monthSpent()) >= MONTHLY_BUDGET_EUR) throw new BudgetReachedError();
  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: opts.system }] },
      contents: [{ role: "user", parts: [{ text: opts.prompt }] }],
      tools: [{ google_search: {} }],
      generationConfig: { thinkingConfig: { thinkingLevel: "low" } },
    }),
  });
  if (!res.ok) throw new Error(`Gemini [${res.status}] ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as { candidates?: { content?: { parts?: { text?: string }[] } }[]; usageMetadata?: Record<string, number> };
  await logUsage(opts.task, data.usageMetadata);
  const text = (data.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? "").join("").trim();
  const m = /\{[\s\S]*\}/.exec(text);
  try {
    return m ? (JSON.parse(m[0]) as { summary?: string; suggestion?: string }) : { summary: text.slice(0, 3000) };
  } catch {
    return { summary: text.slice(0, 3000) };
  }
}

/** Envoie une vidéo à l'espace fichiers de Gemini (jusqu'à ~100 Mo) et attend qu'elle soit prête. */
export async function uploadGeminiFile(bytes: Uint8Array, mimeType: string): Promise<{ fileUri: string; mimeType: string }> {
  const key = process.env["GEMINI_API_KEY"];
  if (!key) throw new Error("Clé Gemini absente.");
  const up = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files?uploadType=media", {
    method: "POST",
    headers: { "x-goog-api-key": key, "Content-Type": mimeType },
    body: bytes as unknown as BodyInit,
  });
  if (!up.ok) throw new Error(`Gemini [${up.status}] ${(await up.text()).slice(0, 300)}`);
  const { file } = (await up.json()) as { file: { name: string; uri: string; state: string } };
  let state = file.state;
  for (let i = 0; i < 30 && state === "PROCESSING"; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    const g = await fetch(`https://generativelanguage.googleapis.com/v1beta/${file.name}`, { headers: { "x-goog-api-key": key } });
    if (g.ok) state = ((await g.json()) as { state: string }).state;
  }
  if (state !== "ACTIVE") throw new Error(`Vidéo non prête chez Google (${state}).`);
  return { fileUri: file.uri, mimeType };
}
