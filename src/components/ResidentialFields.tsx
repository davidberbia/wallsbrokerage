import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type ResidentialValues = Record<string, string | number | boolean | null>;
const NUMBERS = [
  ["bedrooms", "Chambres"], ["carrez", "Surface Carrez (m²)"], ["rooms", "Pièces"],
  ["bathrooms", "Salles de bain"], ["wc", "WC"], ["floor", "Étage"],
  ["balcony_surface", "Surface balcon (m²)"], ["terrace_surface", "Surface terrasse (m²)"],
  ["parking", "Stationnements"],
] as const;
const CHOICES = [
  ["kitchen", "Cuisine", ["Ouverte", "Fermée"]],
  ["elevator", "Ascenseur", ["Oui", "Non"]], ["air_conditioning", "Climatisation", ["Oui", "Non"]],
  ["fireplace", "Cheminée", ["Oui", "Non"]], ["balcony", "Balcon", ["Oui", "Non"]],
  ["terrace", "Terrasse", ["Oui", "Non"]],
] as const;

export function ResidentialFields({ value, onChange, buyer = false }: {
  value: ResidentialValues; onChange: (next: ResidentialValues) => void; buyer?: boolean;
}) {
  const set = (key: string, v: ResidentialValues[string]) => onChange({ ...value, [key]: v });
  return <div className="grid gap-4 sm:grid-cols-2">
    {buyer && ([ ["areas", "Villes, quartiers et rues"], ["constraints", "Contraintes et préférences"] ] as const).map(([key, label]) =>
      <div key={key} className="space-y-2 sm:col-span-2"><Label htmlFor={`res-${key}`}>{label}</Label><Input id={`res-${key}`} value={String(value[key] ?? "")} onChange={e => set(key, e.target.value)} /></div>)}
    {(buyer ? [["surface_min", "Surface minimum (m²)"], ["surface_max", "Surface maximum (m²)"], ...NUMBERS] : NUMBERS).map(([key, label]) =>
      <div key={key} className="space-y-2"><Label htmlFor={`res-${key}`}>{label}{buyer && key === "bedrooms" ? " minimum" : ""}</Label><Input id={`res-${key}`} type="number" min={key === "floor" ? undefined : 0} step="any" value={value[key] == null ? "" : String(value[key])} onChange={e => set(key, e.target.value === "" ? null : Number(e.target.value))} /></div>)}
    {CHOICES.map(([key, label, options]) => <div key={key} className="space-y-2"><Label>{label}</Label><Select value={String(value[key] ?? "unset")} onValueChange={v => set(key, v === "unset" ? null : v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="unset">Non renseigné</SelectItem>{options.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div>)}
    {([["heating", "Type de chauffage"], ["flooring", "Type de sol"]] as const).map(([key, label]) => <div key={key} className="space-y-2"><Label htmlFor={`res-${key}`}>{label}</Label><Input id={`res-${key}`} value={String(value[key] ?? "")} onChange={e => set(key, e.target.value)} /></div>)}
  </div>;
}