// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import type { BrochureData, RentalRow } from "./brochure-types";

/** Parse un nombre écrit en français (espaces, virgule, €, m²…). */
export function parseAmt(v?: string): number {
  if (v === undefined || v === null || v === "") return NaN;
  let cleaned = String(v).replace(/\s/g, "").replace(/[^\d,.\-]/g, "");
  if (!cleaned) return NaN;
  const hasComma = cleaned.includes(",");
  const hasDot = cleaned.includes(".");
  if (hasComma && hasDot) {
    const lastComma = cleaned.lastIndexOf(",");
    const lastDot = cleaned.lastIndexOf(".");
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    cleaned = cleaned.replace(new RegExp(`\\${thousandsSep}`, "g"), "").replace(decimalSep, ".");
  } else if (hasComma || hasDot) {
    const sep = hasComma ? "," : ".";
    const parts = cleaned.split(sep);
    const tail = parts.slice(1);
    if (tail.length > 0 && tail.every((p) => p.length === 3)) cleaned = parts.join("");
    else cleaned = parts.slice(0, -1).join("") + "." + parts[parts.length - 1];
  }
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : NaN;
}

/**
 * Reformate une chaîne numérique française : sépare les milliers par des
 * espaces et conserve le suffixe (€, m², %, …). Utilisé au blur des inputs
 * et lors des imports pour normaliser les valeurs (ex : "219.429€" → "219 429 €").
 */
export function formatFrThousandsStr(v: string): string {
  if (!v) return v;
  const trimmed = v.trim();
  const m = trimmed.match(/^(-?)([\d.,\s]+)(.*)$/);
  if (!m) return v;
  const sign = m[1] || "";
  const numRaw = m[2].trim();
  const suffix = (m[3] || "").trim();
  if (!numRaw) return v;
  let intPart = "";
  let decPart = "";
  const hasComma = numRaw.includes(",");
  const hasDot = numRaw.includes(".");
  if (hasComma && hasDot) {
    const lastComma = numRaw.lastIndexOf(",");
    const lastDot = numRaw.lastIndexOf(".");
    const decimalSep = lastComma > lastDot ? "," : ".";
    const thousandsSep = decimalSep === "," ? "." : ",";
    const parts = numRaw.split(decimalSep);
    intPart = parts.slice(0, -1).join(decimalSep).replace(new RegExp(`[\\s\\${thousandsSep}]`, "g"), "");
    decPart = (parts[parts.length - 1] || "").replace(/\D/g, "");
  } else if (hasComma || hasDot) {
    const sep = hasComma ? "," : ".";
    const parts = numRaw.split(sep);
    const last = parts[parts.length - 1];
    const allThousand = parts.length > 1 && parts.slice(1).every((p) => p.length === 3);
    if (allThousand) {
      intPart = parts.join("").replace(/\s/g, "");
    } else if (last && last.length !== 3) {
      decPart = last.replace(/\D/g, "");
      intPart = parts.slice(0, -1).join("").replace(/[\s.,]/g, "");
    } else {
      intPart = parts.join("").replace(/\s/g, "");
    }
  } else {
    intPart = numRaw.replace(/\s/g, "");
  }
  if (!/^\d+$/.test(intPart)) return v;
  const withSpaces = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  const numOut = decPart ? `${withSpaces},${decPart}` : withSpaces;
  return suffix ? `${sign}${numOut} ${suffix}` : `${sign}${numOut}`;
}

/** Formate un nombre à la française. */
export function fmtNum(n: number, digits = 0): string {
  if (!Number.isFinite(n)) return "";
  return n.toLocaleString("fr-FR", { maximumFractionDigits: digits, minimumFractionDigits: digits });
}

/** Parse une date FR (JJ/MM/AAAA, JJ-MM-AAAA), ISO (YYYY-MM-DD) ou MM/AAAA. */
export function parseDate(v?: string): Date | null {
  if (!v) return null;
  const s = v.trim();
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (m) {
    let y = +m[3]; if (y < 100) y += 2000;
    return new Date(y, +m[2] - 1, +m[1]);
  }
  m = s.match(/^(\d{1,2})[\/\-.](\d{4})$/);
  if (m) return new Date(+m[2], +m[1] - 1, 1);
  m = s.match(/^(\d{4})$/);
  if (m) return new Date(+m[1], 0, 1);
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

/** Nombre d'années (décimales) entre deux dates. */
export function yearsBetween(a: Date | null, b: Date | null): number {
  if (!a || !b) return NaN;
  return (b.getTime() - a.getTime()) / (365.25 * 24 * 3600 * 1000);
}

export function fmtYears(n: number): string {
  if (!Number.isFinite(n) || n < 0) return "";
  return n.toFixed(1).replace(".", ",");
}

/** Calcule WALB (aujourd'hui → prochain break) et WALT (aujourd'hui → fin de bail). */
export function computeRowDurations(r: RentalRow): { walb: string; walt: string } {
  const d0 = new Date();
  const brk = parseDate(r.prochainBreak);
  const fin = parseDate(r.finBail);
  return {
    walb: fmtYears(yearsBetween(d0, brk)),
    walt: fmtYears(yearsBetween(d0, fin)),
  };
}

/** Recalcule WALB/WALT (depuis aujourd'hui) sur toutes les lignes. */
export function fillLocatairesDurations(rows: RentalRow[]): RentalRow[] {
  return rows.map((r) => {
    const c = computeRowDurations(r);
    return {
      ...r,
      walb: c.walb || r.walb,
      walt: c.walt || r.walt,
    };
  });
}

/** Moyennes WALB/WALT (pondérées par surface si dispo, sinon simples). */
export function computeAverages(rows: RentalRow[]): { walb: string; walt: string; totalSurface: number; totalLoyer: number } {
  let sumSurf = 0, sumLoy = 0;
  let wWalb = 0, wWalt = 0, sumWWalb = 0, sumWWalt = 0;
  for (const r of rows) {
    const surf = parseAmt(r.surface) || 0;
    const loy = parseAmt(r.loyerAnnuel) || 0;
    sumSurf += surf;
    sumLoy += loy;
    const c = computeRowDurations(r);
    const walb = parseAmt(c.walb) || parseAmt(r.walb);
    const walt = parseAmt(c.walt) || parseAmt(r.walt);
    const w = surf > 0 ? surf : 1;
    if (Number.isFinite(walb)) { wWalb += walb * w; sumWWalb += w; }
    if (Number.isFinite(walt)) { wWalt += walt * w; sumWWalt += w; }
  }
  return {
    walb: sumWWalb > 0 ? fmtYears(wWalb / sumWWalb) : "",
    walt: sumWWalt > 0 ? fmtYears(wWalt / sumWWalt) : "",
    totalSurface: sumSurf,
    totalLoyer: sumLoy,
  };
}

const IDF_DEPTS = new Set(["75", "77", "78", "91", "92", "93", "94", "95"]);
export function isIleDeFrance(codePostal?: string): boolean {
  const cp = (codePostal || "").trim().slice(0, 2);
  return IDF_DEPTS.has(cp);
}

/** Retourne les 6 valeurs numériques (chiffres uniquement) + labels correspondants. */
export function computeAutoPointsCles(
  data: Pick<BrochureData, "locataires" | "prixVente" | "honoraires" | "codePostal"> & { nbParkings?: string },
): { values: string[]; labels: string[] } {
  const avg = computeAverages(data.locataires || []);
  const surface = avg.totalSurface;
  const loyer = avg.totalLoyer;
  const loyerM2 = surface > 0 && loyer > 0 ? loyer / surface : NaN;
  const prixNet = parseAmt(data.prixVente);
  const honos = parseAmt(data.honoraires) || 0;
  const droits = Number.isFinite(prixNet) ? prixNet * (isIleDeFrance(data.codePostal) ? 0.08 : 0.075) : NaN;
  const aem = Number.isFinite(prixNet) ? prixNet + droits + honos : NaN;
  const rendement = Number.isFinite(aem) && aem > 0 && loyer > 0 ? (loyer / aem) * 100 : NaN;
  const parking = (data.nbParkings || "").trim();

  const values: string[] = [
    surface > 0 ? `${fmtNum(surface)} m²` : "",
    Number.isFinite(loyerM2) ? `${fmtNum(loyerM2)} €/m²` : "",
    loyer > 0 ? `${fmtNum(loyer)} €` : "",
    Number.isFinite(rendement) ? `${fmtNum(rendement, 2)} %` : "",
    parking,
    avg.walb || "",
  ];
  const labels: string[] = [
    "Picto Surface",
    "Picto Loyer / m²",
    "Picto Revenu locatif",
    "Picto Rendement AEM",
    "Picto Parking",
    "Picto WALB",
  ];
  return { values, labels };
}
