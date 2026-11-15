import { departmentalRate } from "./department-rates";
export type AcquisitionDetails = {
  keys?: number; agency_pct?: number; agency_included?: boolean; agency_vat_recoverable?: boolean;
  reduced_eligible?: boolean; notary_total?: number; departmental_rate?: number; department?: string; transaction_date?: string; disbursements?: number;
};
export function acquisitionCost(price: number, details: AcquisitionDetails) {
  if (!(price > 0)) return null;
  // Departmental rate must be confirmed for the transaction date, never guessed.
  const rate=details.departmental_rate ?? departmentalRate(details.department || "",details.transaction_date || "");
  const emoluments=(Math.min(price,6500)*0.0387+Math.max(0,Math.min(price,17000)-6500)*0.01596+Math.max(0,Math.min(price,60000)-17000)*0.01064+Math.max(0,price-60000)*0.00799)*1.2;
  const notary = details.notary_total ?? (details.reduced_eligible ? price * 0.018 : rate != null ? price*(rate/100*1.0237+0.012)+Math.max(15,price*0.001)+emoluments+(details.disbursements ?? 1200) : null);
  if (notary == null) return null;
  const agency = details.agency_included ? 0 : price * (details.agency_pct ?? 3) / 100 * (details.agency_vat_recoverable ? 1 : 1.2);
  return price + notary + agency;
}
export function comparableMetric(row: {kind: string; asset_class?: string | null; surface?: number | null; rent?: number | null; rent_m2?: number | null; price?: number | null; price_m2?: number | null; acquisition_details?: unknown}) {
  const details = (row.acquisition_details ?? {}) as AcquisitionDetails;
  if (row.kind === "location") return {label: "Loyer/m²/an", value: row.rent_m2 ?? (row.rent != null && Number(row.surface) > 0 ? row.rent / Number(row.surface) : null), unit: "€"};
  const kind = (row.asset_class ?? "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  if (/hotel/.test(kind)) return {label: "Prix/clé", value: row.price != null && Number(details.keys) > 0 ? row.price / Number(details.keys) : null, unit: "€"};
  if (/appartement/.test(kind)) return {label: "Prix/m²", value: row.price_m2 ?? (row.price != null && Number(row.surface) > 0 ? row.price / Number(row.surface) : null), unit: "€"};
  if(!/commercial|commerce|logistique|activite|bureaux|bureau/.test(kind))return {label:"Prix/m²",value:row.price_m2 ?? (row.price!=null && Number(row.surface)>0 ? row.price/Number(row.surface):null),unit:"€"};
  const cost = acquisitionCost(Number(row.price), details);
  return {label: "Rendement acte en main", value: cost && row.rent != null ? row.rent / cost * 100 : null, unit: "%"};
}