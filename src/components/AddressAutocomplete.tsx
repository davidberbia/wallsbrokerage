// @ts-nocheck — code repris tel quel du Générateur de brochures (vérifié sous sa configuration TypeScript d'origine).
import { useEffect, useRef, useState } from "react";

/**
 * Autocomplétion d'adresses via l'API officielle française
 * (https://adresse.data.gouv.fr) — gratuite, sans clé API,
 * base d'adresses nationale (BAN). Aucun appel Google Places.
 */

export type SelectedAddress = {
  formatted: string;
  street: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
};

type BanFeature = {
  geometry: { coordinates: [number, number] };
  properties: {
    label: string;
    name?: string;
    housenumber?: string;
    street?: string;
    postcode?: string;
    city?: string;
  };
};

type Suggestion = {
  id: string;
  primary: string;
  secondary: string;
  feature: BanFeature;
};

export function AddressAutocomplete({
  value,
  onChangeText,
  onSelect,
  className,
}: {
  value: string;
  onChangeText: (v: string) => void;
  onSelect: (addr: SelectedAddress) => void;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const query = async (input: string) => {
    if (!input || input.trim().length < 3) { setSuggestions([]); return; }
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(input)}&limit=7&type=street`;
      const r = await fetch(url, { signal: controller.signal });
      if (!r.ok) throw new Error(`BAN ${r.status}`);
      const j = (await r.json()) as { features?: BanFeature[] };
      const list: Suggestion[] = (j.features || []).map((f, i) => {
        const p = f.properties;
        const primary = [p.housenumber, p.street || p.name].filter(Boolean).join(" ") || p.label;
        const secondary = [p.postcode, p.city].filter(Boolean).join(" ");
        return { id: `${p.label}-${i}`, primary, secondary, feature: f };
      });
      setSuggestions(list);
      setOpen(list.length > 0);
    } catch (e) {
      if ((e as Error).name !== "AbortError") console.error("autocomplete BAN", e);
    }
  };

  const onChange = (v: string) => {
    onChangeText(v);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => query(v), 250);
  };

  const choose = (s: Suggestion) => {
    setOpen(false);
    const p = s.feature.properties;
    const [lng, lat] = s.feature.geometry.coordinates;
    const street = [p.housenumber, p.street || p.name].filter(Boolean).join(" ");
    const postalCode = p.postcode || "";
    const city = p.city || "";
    onSelect({
      formatted: p.label || `${street}, ${postalCode} ${city}`,
      street,
      postalCode,
      city,
      lat,
      lng,
    });
  };

  return (
    <div ref={boxRef} className="relative">
      <input
        className={className}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => suggestions.length && setOpen(true)}
        placeholder="Commencez à saisir l'adresse…"
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <ul className="absolute left-0 right-0 top-full mt-1 z-30 max-h-72 overflow-auto rounded-md border border-slate-700 bg-slate-900 shadow-lg">
          {suggestions.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full text-left px-3 py-2 hover:bg-slate-800 text-sm border-b border-slate-800 last:border-0"
                onClick={() => choose(s)}
              >
                <div className="text-slate-100">{s.primary}</div>
                {s.secondary && <div className="text-xs text-slate-400">{s.secondary}</div>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
