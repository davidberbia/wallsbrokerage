import { subjectFor } from "./subject";
export type PigeCycle = { started_at: string | null; due_at: string | null; completed_at: string | null };
export function pigeActive(p: PigeCycle | undefined, now = new Date()) {
  return !!p?.started_at && !p.completed_at && !!p.due_at && new Date(p.due_at).getTime() > now.getTime();
}
export function pigeDue(sent: Date) { return new Date(sent.getTime() + 7 * 86400_000); }
export function pigeMail(asset: { title: string; asset_class?: string | null; city?: string | null; keys_count?: number | null; surface?: number | null; price?: number | null; rent?: number | null; transaction_type?: string | null }, firstName: string, signature: string) {
  const type = asset.asset_class?.toLocaleLowerCase("fr") || "bien";
  const details = [asset.city ? `situé à ${asset.city}` : "", asset.keys_count ? `disposant de ${asset.keys_count} chambres` : asset.surface ? `d’une surface de ${asset.surface} m²` : ""].filter(Boolean).join(" et ");
  const money = (v: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(v);
  const rental = asset.transaction_type === "location";
  const offer = rental ? `serait à louer${asset.rent ? ` pour un loyer annuel de ${money(asset.rent)}` : ""}` : `serait à vendre${asset.price ? ` au prix de ${money(asset.price)}` : ""}`;
  return { subject: subjectFor(asset), body: `Bonjour${firstName.trim() ? ` ${firstName.trim()}` : ""},\n\nUn confrère m’indique qu’un ${type}${details ? ` ${details}` : ""} ${offer}.\n\nEst-ce que ce dossier pourrait t’intéresser ?\n\nDans l’affirmative, n’hésite pas à revenir vers moi pour approfondir le sujet.\n\nBien à toi,\n\n${signature}` };
}