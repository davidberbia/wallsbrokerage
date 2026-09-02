import { Check, ChevronsUpDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export type BandsByAsset = Record<string, string[]>;

/**
 * Sélection des classes d'actifs avec, pour chacune, les tranches
 * d'investissement à cocher / décocher.
 */
export function AssetClassBands({
  assetClasses,
  amountBands,
  selected,
  bands,
  onChange,
}: {
  assetClasses: readonly string[];
  amountBands: readonly string[];
  selected: string[];
  bands: BandsByAsset;
  onChange: (next: { selected: string[]; bands: BandsByAsset }) => void;
}) {
  const toggleAsset = (asset: string) => {
    if (selected.includes(asset)) {
      const nextBands = { ...bands };
      delete nextBands[asset];
      onChange({ selected: selected.filter((a) => a !== asset), bands: nextBands });
    } else {
      onChange({ selected: [...selected, asset], bands: { ...bands, [asset]: [] } });
    }
  };

  const toggleBand = (asset: string, band: string) => {
    const current = bands[asset] ?? [];
    const next = current.includes(band)
      ? current.filter((b) => b !== band)
      : [...current, band];
    onChange({
      selected: selected.includes(asset) ? selected : [...selected, asset],
      bands: { ...bands, [asset]: next },
    });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" type="button" className="w-full justify-between font-normal">
          <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
            {selected.length === 0 ? "Tous" : selected.join(", ")}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="max-h-80 w-[min(24rem,calc(100vw-2rem))] overflow-y-auto p-1"
        align="center"
        collisionPadding={16}
      >
        {assetClasses.map((asset) => {
          const checked = selected.includes(asset);
          return (
            <div key={asset} className="rounded-md px-1 py-1">
              <button
                type="button"
                onClick={() => toggleAsset(asset)}
                className="flex w-full items-center gap-2 rounded-md px-1 py-1.5 text-left text-sm hover:bg-muted"
              >
                <span
                  className={cn(
                    "flex size-4 shrink-0 items-center justify-center rounded border border-input",
                    checked && "border-accent bg-accent text-accent-foreground",
                  )}
                >
                  {checked && <Check className="size-3" />}
                </span>
                <span className="min-w-0 flex-1">{asset}</span>
              </button>
              {checked && (
                <div className="mt-1 flex flex-wrap gap-1 pl-7 pb-1">
                  {amountBands.map((band) => {
                    const on = (bands[asset] ?? []).includes(band);
                    return (
                      <button
                        key={band}
                        type="button"
                        onClick={() => toggleBand(asset, band)}
                        className={cn(
                          "rounded-full border border-input px-2 py-0.5 text-xs",
                          on
                            ? "border-accent bg-accent text-accent-foreground"
                            : "text-muted-foreground hover:bg-muted",
                        )}
                      >
                        {band}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </PopoverContent>
    </Popover>
  );
}
