import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * Filtre par année identique sur toutes les listes du CRM : trois boutons rapides
 * (année en cours, précédente, avant-précédente) puis un menu « Autres années ».
 */
export function YearFilter({
  years,
  value,
  onChange,
  label = "Année",
}: {
  years: number[];
  value: string;
  onChange: (year: string) => void;
  label?: string;
}) {
  const thisYear = new Date().getFullYear();
  const quick = [thisYear, thisYear - 1, thisYear - 2];
  const inQuick = quick.map(String).includes(value);
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label={label}>
      {quick.map((y) => (
        <Button
          key={y}
          size="sm"
          className="min-h-11"
          variant={value === String(y) ? "default" : "outline"}
          onClick={() => onChange(String(y))}
        >
          {y}
        </Button>
      ))}
      <Select value={inQuick ? "" : value} onValueChange={onChange}>
        <SelectTrigger
          className={`min-h-11 w-[10rem] ${inQuick ? "" : "border-primary"}`}
          aria-label="Autres années"
        >
          <SelectValue placeholder="Autres années" />
        </SelectTrigger>
        <SelectContent>
          {years
            .filter((y) => !quick.includes(y))
            .map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          <SelectItem value="all">Toutes années</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
