/** Dossier d'un document non image / non plan : Baux (juridique, locatif, Excel) ou racine (présentations). */
const BAUX = /bail|baux|avenant|kbis|k-bis|statut|juridique|[ée]tat[ _-]?locatif|charges?|d[ée]compte|taxe|foncier|loyer|quittance|\.(xlsx?|csv|ods)$/i;
const PLAN = /plan|coupe|cadastr|fa[cç]ade|[ée]l[ée]vation/i;

export type DocFolder = "Baux" | "Plans" | "racine";

export function docFolder(name: string): DocFolder {
  if (PLAN.test(name) && !/teaser|pr[ée]sentation|brochure/i.test(name)) return "Plans";
  if (BAUX.test(name)) return "Baux";
  return "racine";
}
