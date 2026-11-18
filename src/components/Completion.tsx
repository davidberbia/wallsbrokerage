import type { completion } from '@/lib/completion';
export function Completion({ value, detail = false }: { value: ReturnType<typeof completion>; detail?: boolean }) {
  return <div className="space-y-2"><span className="text-xs font-semibold text-primary" aria-label={`Remplissage ${value.percent} %`}>Remplissage · {value.percent} %</span>{detail && <div className="flex flex-wrap gap-x-4 gap-y-2 border-y border-border py-3">{value.checks.map(c => <span key={c.key} className={`text-xs ${c.present ? 'text-success' : 'text-muted-foreground'}`}>{c.present ? '✓' : '○'} {c.label} · {c.weight} %</span>)}</div>}</div>;
}
