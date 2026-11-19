// Remplissage du contrat-cadre des agents commerciaux (sans IA).
export type AgentContractFields = {
  denomination?: string; adresse?: string; siren?: string; rsac?: string;
  assureur?: string; rc_numero?: string; rc_echeance?: string;
  quote_agent?: string; date_effet?: string; lieu?: string; qualite?: string;
};
export const REQUIRED_CONTRACT_FIELDS: [keyof AgentContractFields, string][] = [
  ["denomination", "Nom ou société"], ["adresse", "Adresse / siège"], ["siren", "SIREN"],
  ["quote_agent", "Quote-part de l'agent"], ["date_effet", "Date d'effet"],
];
export function missingContractFields(f: AgentContractFields): string[] {
  const out = REQUIRED_CONTRACT_FIELDS.filter(([k]) => !String(f[k] ?? "").trim()).map(([, l]) => l);
  const q = Number(f.quote_agent);
  if (f.quote_agent && !(q >= 0 && q <= 100)) out.push("Quote-part entre 0 et 100");
  return out;
}
// L'agent s'assure seul : aucune donnée d'assurance n'est demandée.
export const RC_CLAUSE = "L'Agent déclare être informé de l'obligation légale de disposer d'une assurance garantissant sa responsabilité civile professionnelle. Il se fait fort de la souscrire et de la maintenir à ses frais, sous sa seule et entière responsabilité, et décharge expressément WALLSBROKER de toute responsabilité ou recours à ce titre.";
const fr = (iso?: string) => {
  if (!iso) return "";
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
};
export function contractValues(f: AgentContractFields, agentName: string, today = new Date()): Record<string, string> {
  const qa = Number(f.quote_agent ?? 0);
  return {
    denomination: f.denomination ?? "", adresse: f.adresse ?? "", siren: f.siren ?? "",
    rsac: f.rsac?.trim() || "Non applicable",
    assurance: RC_CLAUSE,
    quote_agent: String(qa), quote_wallsbroker: String(Math.round((100 - qa) * 100) / 100),
    date_effet: fr(f.date_effet), lieu: f.lieu?.trim() || "Paris",
    date_signature: today.toLocaleDateString("fr-FR", { timeZone: "Europe/Paris" }),
    wb_nom: "David BERBIA PEREZ", wb_qualite: "Président",
    ag_nom: agentName, ag_qualite: f.qualite?.trim() || "Agent commercial indépendant",
  };
}
const xmlEsc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
export function fillDocumentXml(xml: string, values: Record<string, string>): string {
  return xml.replace(/\{\{(\w+)\}\}/g, (all, k: string) => (k in values ? xmlEsc(values[k] ?? "") : all));
}
