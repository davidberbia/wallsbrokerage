import type { FormationModule, Question } from "./types";

export const PASS_RATE = 0.8;
export const MIN_FINAL = 10;
export const MAX_FINAL = 20;

export function scoreFinal(questions: Question[], answers: (number | null)[]) {
  const correct = questions.reduce((n, q, i) => n + (answers[i] === q.answer ? 1 : 0), 0);
  const rate = questions.length ? correct / questions.length : 0;
  return { correct, total: questions.length, rate, passed: rate >= PASS_RATE };
}

/** Progression en % : étapes franchies + questionnaire final comptant comme une étape. */
export function progressPercent(mod: FormationModule, stepIndex: number) {
  const total = mod.steps.length + 1;
  return Math.round((Math.min(stepIndex, total) / total) * 100);
}

/** Liste des écarts aux règles du parcours (vide = conforme). */
export function checkModule(mod: FormationModule): string[] {
  const errs: string[] = [];
  if (mod.final.length < MIN_FINAL || mod.final.length > MAX_FINAL) errs.push(`final: ${mod.final.length} questions`);
  let run = 0;
  mod.steps.forEach((s, i) => {
    if (s.kind === "page") {
      run++;
      if (run > 4) errs.push(`plus de 4 pages sans quiz avant l'étape ${i}`);
    } else {
      if (run < 3) errs.push(`quiz trop rapproché à l'étape ${i}`);
      if (s.questions.length < 2 || s.questions.length > 3) errs.push(`quiz étape ${i}: ${s.questions.length} questions`);
      run = 0;
    }
  });
  for (const q of [...mod.final, ...mod.steps.flatMap((s) => (s.kind === "quiz" ? s.questions : []))]) {
    if (q.answer < 0 || q.answer >= q.options.length) errs.push(`réponse invalide: ${q.q}`);
  }
  return errs;
}
