export type ManualSection = { id: string; title: string; body: string[]; auto?: boolean };
export type ManualTab = {
  slug: string;
  label: string;
  /** Adresse de l'onglet dans le CRM (sert au bouton « Besoin d'aide »). */
  routes: string[];
  admin?: boolean;
  /** Résumé court affiché dans la fenêtre d'aide. */
  intro: string;
  /** Texte lu par la voix sur la présentation générale. */
  narration: string;
  /** Libellés encadrés sur la capture, dans l'ordre de la narration. */
  marks: string[];
  sections: ManualSection[];
};
export type FaqItem = { q: string; tab: string; section: string };
export type ShotBox = { n: number; label: string; x: number; y: number; w: number; h: number };
export type Shot = { w: number; h: number; boxes: ShotBox[] };
