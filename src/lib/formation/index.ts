import type { FormationModule } from "./types";

const ORDER = [
  "bases-immobilier", "metier-agent", "bon-agent", "vente-habitation-droit",
  "loi-hoguet-carte", "deontologie", "non-discrimination", "lcb-ft",
  "mandat", "honoraires", "diagnostics", "offre-acte",
  "immobilier-commercial", "evaluation", "fiscalite", "prospection-rgpd",
];

const files = import.meta.glob<{ module: FormationModule }>("./modules/*.ts", { eager: true });

export const MODULES: FormationModule[] = Object.values(files)
  .map((f) => f.module)
  .sort((a, b) => ORDER.indexOf(a.slug) - ORDER.indexOf(b.slug));

export const getModule = (slug: string) => MODULES.find((m) => m.slug === slug);
