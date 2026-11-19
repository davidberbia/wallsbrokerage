import { toast } from "sonner";
import { lookupSiren } from "@/lib/siren.functions";

export type SirenResult = Awaited<ReturnType<typeof lookupSiren>>;

/** SIREN complet (9 chiffres, espaces ignorés) ou null. */
export const completeSiren = (v: string | null | undefined) => {
  const s = String(v ?? "").replace(/\s/g, "");
  return /^\d{9}$/.test(s) ? s : null;
};

/** Ne remplit que les champs vides : une saisie existante n'est jamais écrasée. */
export function fillEmpty<T extends Record<string, unknown>>(current: T, found: Partial<Record<keyof T, string>>): T {
  const out = { ...current };
  for (const [k, v] of Object.entries(found)) {
    const cur = out[k as keyof T];
    if (v && (cur === undefined || cur === null || String(cur).trim() === "")) (out as Record<string, unknown>)[k] = v;
  }
  return out;
}

/** Interroge l'annuaire des entreprises dès que le SIREN saisi est complet. */
export async function autoSiren(value: string, apply: (r: SirenResult) => void) {
  const siren = completeSiren(value);
  if (!siren) return;
  try {
    apply(await lookupSiren({ data: { siren } }));
    toast.success("Société trouvée, champs complétés.");
  } catch (e) {
    toast.error(e instanceof Error ? e.message : "Recherche impossible");
  }
}
