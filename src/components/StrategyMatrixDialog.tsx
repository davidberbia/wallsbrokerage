import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { REGIONS, STRATEGIES } from "@/lib/taxonomy";
import { useLists } from "@/lib/lists";
import type { BandsByAsset } from "@/components/AssetClassBands";

export type StrategiesByAsset = Record<string, string[]>;

export type StrategyMatrixValue = {
  assetClasses: string[];
  bands: BandsByAsset;
  strategiesByAsset: StrategiesByAsset;
  regions: string[];
};

function Cell({
  checked,
  onClick,
  label,
  ariaLabel,
}: {
  checked: boolean;
  onClick: () => void;
  label?: string;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked}
      onClick={onClick}
      className={cn(
        "flex size-6 sm:size-5 items-center justify-center rounded border border-input transition-colors touch-none",
        checked
          ? "border-accent bg-accent text-accent-foreground"
          : "bg-background hover:bg-muted",
      )}
      title={label}
    >
      {checked && <Check className="size-4 sm:size-3.5" />}
    </button>
  );
}

function Chips({
  options,
  value,
  onToggle,
}: {
  options: readonly string[];
  value: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const on = value.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={cn(
              "rounded-full border border-input px-3 py-1.5 sm:px-2.5 sm:py-1 text-xs transition-colors",
              on
                ? "border-accent bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-muted",
            )}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

export function StrategyMatrixDialog({
  open,
  onOpenChange,
  value,
  onChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: StrategyMatrixValue;
  onChange: (next: StrategyMatrixValue) => void;
}) {
  const { assetClasses, amountBands, countries } = useLists();

  const toggleAsset = (asset: string) => {
    const on = value.assetClasses.includes(asset);
    const nextBands = { ...value.bands };
    const nextStrategies = { ...value.strategiesByAsset };
    if (on) {
      delete nextBands[asset];
      delete nextStrategies[asset];
    } else {
      nextBands[asset] = nextBands[asset] ?? [];
      nextStrategies[asset] = nextStrategies[asset] ?? [];
    }
    onChange({
      ...value,
      assetClasses: on
        ? value.assetClasses.filter((a) => a !== asset)
        : [...value.assetClasses, asset],
      bands: nextBands,
      strategiesByAsset: nextStrategies,
    });
  };

  const ensureAsset = (asset: string) =>
    value.assetClasses.includes(asset)
      ? value.assetClasses
      : [...value.assetClasses, asset];

  const toggleBand = (asset: string, band: string) => {
    const current = value.bands[asset] ?? [];
    const next = current.includes(band)
      ? current.filter((b) => b !== band)
      : [...current, band];
    onChange({
      ...value,
      assetClasses: ensureAsset(asset),
      bands: { ...value.bands, [asset]: next },
    });
  };

  const toggleStrategy = (asset: string, strategy: string) => {
    const current = value.strategiesByAsset[asset] ?? [];
    const next = current.includes(strategy)
      ? current.filter((s) => s !== strategy)
      : [...current, strategy];
    onChange({
      ...value,
      assetClasses: ensureAsset(asset),
      strategiesByAsset: { ...value.strategiesByAsset, [asset]: next },
    });
  };

  const toggleRegion = (opt: string) =>
    onChange({
      ...value,
      regions: value.regions.includes(opt)
        ? value.regions.filter((v) => v !== opt)
        : [...value.regions, opt],
    });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[92vh] w-[calc(100%-1rem)] sm:w-[calc(100%-1.5rem)] max-w-5xl flex-col overflow-hidden p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>Stratégie d'investissement</DialogTitle>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-0.5 pb-2">
          <div>
            <p className="eyebrow mb-2">Classes d'actifs, tranches & stratégies</p>
            <div className="overflow-x-auto rounded-lg border border-border shadow-sm">
              <table className="w-full border-collapse text-sm">
                <thead className="bg-muted/60">
                  <tr>
                    <th
                      rowSpan={2}
                      className="sticky left-0 z-10 bg-muted px-2 py-1.5 text-left text-xs font-semibold align-bottom border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]"
                    >
                      Classe d'actif
                    </th>
                    <th
                      colSpan={amountBands.length}
                      className="border-b border-border px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Tranches d'investissement
                    </th>
                    <th
                      colSpan={STRATEGIES.length}
                      className="border-b border-l border-border px-2 py-1 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground"
                    >
                      Stratégies
                    </th>
                  </tr>
                  <tr>
                    {amountBands.map((band) => (
                      <th
                        key={band}
                        className="whitespace-nowrap px-2 py-1.5 text-center text-xs font-semibold"
                      >
                        {band}
                      </th>
                    ))}
                    {STRATEGIES.map((strategy, i) => (
                      <th
                        key={strategy}
                        className={cn(
                          "whitespace-nowrap px-2 py-1.5 text-center text-xs font-semibold",
                          i === 0 && "border-l border-border",
                        )}
                      >
                        {strategy}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {assetClasses.map((asset) => {
                    const on = value.assetClasses.includes(asset);
                    return (
                      <tr
                        key={asset}
                        className={cn("border-t border-border", on && "bg-accent/5")}
                      >
                        <td className="sticky left-0 z-10 bg-background px-2 py-2 border-r border-border/50 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                          <button
                            type="button"
                            onClick={() => toggleAsset(asset)}
                            className="flex w-full items-center gap-2 text-left min-h-[32px]"
                          >
                            <span
                              className={cn(
                                "flex size-5 shrink-0 items-center justify-center rounded border border-input",
                                on && "border-accent bg-accent text-accent-foreground",
                              )}
                            >
                              {on && <Check className="size-3.5" />}
                            </span>
                            <span className={cn("text-xs leading-tight", on && "font-medium")}>{asset}</span>
                          </button>
                        </td>
                        {amountBands.map((band) => (
                          <td key={band} className="px-2 py-1 text-center">
                            <div className="flex justify-center">
                              <Cell
                                checked={(value.bands[asset] ?? []).includes(band)}
                                onClick={() => toggleBand(asset, band)}
                                ariaLabel={`${asset} — ${band}`}
                              />
                            </div>
                          </td>
                        ))}
                        {STRATEGIES.map((strategy, i) => (
                          <td
                            key={strategy}
                            className={cn("px-2 py-1 text-center", i === 0 && "border-l border-border")}
                          >
                            <div className="flex justify-center">
                              <Cell
                                checked={(value.strategiesByAsset[asset] ?? []).includes(strategy)}
                                onClick={() => toggleStrategy(asset, strategy)}
                                ariaLabel={`${asset} — ${strategy}`}
                              />
                            </div>
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <p className="eyebrow mb-2">Régions ciblées</p>
            <Chips options={REGIONS} value={value.regions} onToggle={toggleRegion} />
          </div>

          <div>
            <p className="eyebrow mb-2">Pays ciblés</p>
            <Chips options={countries} value={value.regions} onToggle={toggleRegion} />
          </div>
        </div>

        <div className="flex shrink-0 justify-end border-t border-border pt-4">
          <Button
            type="button"
            className="w-full sm:w-auto bg-accent text-accent-foreground hover:bg-accent/90 h-11 sm:h-9"
            onClick={() => onOpenChange(false)}
          >
            Terminer
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
