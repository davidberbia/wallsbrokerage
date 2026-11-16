import shots from "@/lib/manuel/shots.json";
import type { Shot as ShotT } from "@/lib/manuel/types";

const IMAGES = import.meta.glob("@/assets/manuel/*.jpg", { eager: true, import: "default" }) as Record<string, string>;
const imageFor = (slug: string) => Object.entries(IMAGES).find(([k]) => k.endsWith(`/${slug}.jpg`))?.[1];

/** Capture de l'onglet avec les boutons présentés encadrés et numérotés. */
export function Shot({ slug, alt }: { slug: string; alt: string }) {
  const src = imageFor(slug);
  const s = (shots as Record<string, ShotT>)[slug];
  if (!src || !s) return null;
  return (
    <figure className="space-y-2">
      <div className="relative overflow-hidden rounded-lg border border-border bg-muted">
        <img src={src} alt={alt} className="block w-full" loading="lazy" />
        {s.boxes.map((b) => (
          <div
            key={b.n}
            className="pointer-events-none absolute rounded-md border-2 border-destructive ring-2 ring-background/70"
            style={{ left: `${(b.x / s.w) * 100}%`, top: `${(b.y / s.h) * 100}%`, width: `${(b.w / s.w) * 100}%`, height: `${(b.h / s.h) * 100}%` }}
          >
            <span className="absolute -left-2 -top-2 flex size-5 items-center justify-center rounded-full bg-destructive font-mono text-[10px] font-bold text-destructive-foreground">{b.n}</span>
          </div>
        ))}
      </div>
      {s.boxes.length > 0 && (
        <figcaption>
          <ol className="grid gap-1 text-xs text-muted-foreground sm:grid-cols-2">
            {s.boxes.map((b) => (
              <li key={b.n} className="flex items-center gap-1.5">
                <span className="flex size-4 shrink-0 items-center justify-center rounded-full bg-destructive font-mono text-[9px] font-bold text-destructive-foreground">{b.n}</span>
                {b.label}
              </li>
            ))}
          </ol>
        </figcaption>
      )}
    </figure>
  );
}
