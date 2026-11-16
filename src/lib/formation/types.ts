export type Question = { q: string; options: string[]; answer: number; explain: string };
export type Page = { kind: "page"; title: string; body: string[] };
export type Quiz = { kind: "quiz"; questions: Question[] };
export type Step = Page | Quiz;
export type FormationModule = {
  slug: string;
  title: string;
  summary: string;
  minutes: number;
  steps: Step[];
  final: Question[];
};
