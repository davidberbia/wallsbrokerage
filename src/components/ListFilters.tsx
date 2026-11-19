import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Key = "class" | "surface" | "price";
export type ListItemValues = { cls: string | null; surface: number | null; price: number | null };

export function useListFilters() {
  const [cls, setCls] = useState<string>("all");
  const [sort, setSort] = useState<{ key: Key; dir: 1 | -1 } | null>(null);
  const [range, setRange] = useState<Record<"surface" | "price", [string, string]>>({ surface: ["", ""], price: ["", ""] });
  const apply = <T,>(rows: T[], get: (r: T) => ListItemValues): T[] => {
    const num = (s: string) => (s.trim() === "" ? null : Number(s.replace(/\s/g, "").replace(",", ".")));
    const inRange = (v: number | null, [a, b]: [string, string]) => {
      const lo = num(a), hi = num(b);
      if (lo == null && hi == null) return true;
      if (v == null) return false;
      return (lo == null || v >= lo) && (hi == null || v <= hi);
    };
    const out = rows.filter((r) => {
      const v = get(r);
      return (cls === "all" || (v.cls ?? "") === cls) && inRange(v.surface, range.surface) && inRange(v.price, range.price);
    });
    if (!sort) return out;
    return [...out].sort((x, y) => {
      const a = get(x), b = get(y);
      if (sort.key === "class") return sort.dir * (a.cls ?? "").localeCompare(b.cls ?? "", "fr");
      const va = sort.key === "surface" ? a.surface : a.price, vb = sort.key === "surface" ? b.surface : b.price;
      if (va == null) return 1;
      if (vb == null) return -1;
      return sort.dir * (va - vb);
    });
  };
  return { cls, setCls, sort, setSort, range, setRange, apply };
}
type F = ReturnType<typeof useListFilters>;

function Trigger({ label, active }: { label: string; active: boolean }) {
  return (
    <PopoverTrigger asChild>
      <button type="button" className={`inline-flex min-h-8 items-center gap-1 text-xs font-semibold ${active ? "text-accent" : "text-muted-foreground"}`}>
        {label}<ChevronDown className="size-3" />
      </button>
    </PopoverTrigger>
  );
}

export function ClassFilter({ f, options }: { f: F; options: string[] }) {
  return (
    <Popover>
      <Trigger label="Classe" active={f.cls !== "all" || f.sort?.key === "class"} />
      <PopoverContent align="start" className="max-h-80 w-56 overflow-y-auto p-1">
        <div className="flex gap-1 p-1">
          <Button size="sm" variant={f.sort?.key === "class" && f.sort.dir === 1 ? "default" : "outline"} className="flex-1" onClick={() => f.setSort({ key: "class", dir: 1 })}>A → Z</Button>
          <Button size="sm" variant={f.sort?.key === "class" && f.sort.dir === -1 ? "default" : "outline"} className="flex-1" onClick={() => f.setSort({ key: "class", dir: -1 })}>Z → A</Button>
        </div>
        {["all", ...options].map((o) => (
          <button key={o} type="button" onClick={() => f.setCls(o)} className={`block min-h-9 w-full rounded px-2 text-left text-sm hover:bg-muted ${f.cls === o ? "font-semibold text-accent" : ""}`}>
            {o === "all" ? "Toutes les classes" : o}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

export function RangeFilter({ f, k, label }: { f: F; k: "surface" | "price"; label: string }) {
  const [lo, hi] = f.range[k];
  const set = (i: 0 | 1, v: string) => f.setRange({ ...f.range, [k]: (i === 0 ? [v, hi] : [lo, v]) as [string, string] });
  return (
    <Popover>
      <Trigger label={label} active={f.sort?.key === k || !!lo || !!hi} />
      <PopoverContent align="end" className="w-60 space-y-2 p-2">
        <div className="flex gap-1">
          <Button size="sm" variant={f.sort?.key === k && f.sort.dir === 1 ? "default" : "outline"} className="flex-1" onClick={() => f.setSort({ key: k, dir: 1 })}>Croissant</Button>
          <Button size="sm" variant={f.sort?.key === k && f.sort.dir === -1 ? "default" : "outline"} className="flex-1" onClick={() => f.setSort({ key: k, dir: -1 })}>Décroissant</Button>
        </div>
        <div className="flex gap-1">
          <Input inputMode="numeric" placeholder="Mini" value={lo} onChange={(e) => set(0, e.target.value)} />
          <Input inputMode="numeric" placeholder="Maxi" value={hi} onChange={(e) => set(1, e.target.value)} />
        </div>
        <Button size="sm" variant="ghost" className="w-full" onClick={() => { f.setRange({ ...f.range, [k]: ["", ""] }); if (f.sort?.key === k) f.setSort(null); }}>Effacer</Button>
      </PopoverContent>
    </Popover>
  );
}
