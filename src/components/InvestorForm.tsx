import { MultiSelect } from "@/components/MultiSelect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HORIZONS, INVESTOR_STATUS, REGIONS, STRATEGIES } from "@/lib/taxonomy";
import { useLists } from "@/lib/lists";
import { AssetClassBands, type BandsByAsset } from "@/components/AssetClassBands";
import type { Investor } from "@/lib/types";

export type InvestorDraft = Partial<Investor> & { full_name: string };

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {children}
    </div>
  );
}

export function InvestorForm({
  draft,
  onChange,
  onSubmit,
  saving,
  showStatus = true,
  submitLabel = "Valider",
  footer,
  bands = {},
  onBandsChange,
}: {
  draft: InvestorDraft;
  onChange: (d: InvestorDraft) => void;
  onSubmit: () => void;
  saving: boolean;
  showStatus?: boolean;
  submitLabel?: string;
  footer?: React.ReactNode;
  bands?: BandsByAsset;
  onBandsChange?: (b: BandsByAsset) => void;
}) {
  const set = (patch: Partial<InvestorDraft>) => onChange({ ...draft, ...patch });
  const { assetClasses, investorProfiles, amountBands } = useLists();

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Prénom">
          <Input
            value={draft.first_name ?? ""}
            onChange={(e) => set({ first_name: e.target.value })}
          />
        </Field>
        <Field label="Nom de famille *">
          <Input
            required
            value={draft.full_name}
            onChange={(e) => set({ full_name: e.target.value })}
          />
        </Field>
        <Field label="Société">
          <Input value={draft.company ?? ""} onChange={(e) => set({ company: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={draft.email ?? ""}
            onChange={(e) => set({ email: e.target.value })}
          />
        </Field>
        <Field label="Téléphone">
          <Input
            type="tel"
            value={draft.phone ?? ""}
            onChange={(e) => set({ phone: e.target.value })}
          />
        </Field>
        <Field label="Adresse">
          <Input value={draft.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
        </Field>
        <Field label="Code postal">
          <Input
            value={draft.postal_code ?? ""}
            onChange={(e) => set({ postal_code: e.target.value })}
          />
        </Field>
        <Field label="Ville">
          <Input value={draft.city ?? ""} onChange={(e) => set({ city: e.target.value })} />
        </Field>
        <Field label="Type d'investisseur">
          <Select
            value={draft.investor_profile ?? ""}
            onValueChange={(v) => set({ investor_profile: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {investorProfiles.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        {showStatus && (
          <Field label="Statut">
            <Select value={draft.status ?? "actif"} onValueChange={(v) => set({ status: v })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {INVESTOR_STATUS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        )}
        <Field label="Horizon de détention">
          <Select
            value={draft.holding_horizon ?? ""}
            onValueChange={(v) => set({ holding_horizon: v })}
          >
            <SelectTrigger>
              <SelectValue placeholder="—" />
            </SelectTrigger>
            <SelectContent>
              {HORIZONS.map((h) => (
                <SelectItem key={h} value={h}>
                  {h}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      </div>

      <Field label="Classes d'actifs recherchées et tranches d'investissement">
        <AssetClassBands
          assetClasses={assetClasses}
          amountBands={amountBands}
          selected={draft.asset_classes ?? []}
          bands={bands}
          onChange={({ selected, bands: nextBands }) => {
            set({ asset_classes: selected });
            onBandsChange?.(nextBands);
          }}
        />
      </Field>
      <Field label="Stratégies">
        <MultiSelect
          options={STRATEGIES}
          value={draft.strategies ?? []}
          onChange={(v) => set({ strategies: v })}
        />
      </Field>
      <Field label="Régions ciblées">
        <MultiSelect
          options={REGIONS}
          value={draft.regions ?? []}
          onChange={(v) => set({ regions: v })}
        />
      </Field>
      <Field label="Notes">
        <Textarea
          rows={3}
          value={draft.notes ?? ""}
          onChange={(e) => set({ notes: e.target.value })}
        />
      </Field>

      {footer ?? (
        <div className="flex justify-end">
          <Button type="submit" disabled={saving}>
            {submitLabel}
          </Button>
        </div>
      )}
    </form>
  );
}

export function investorPayload(draft: InvestorDraft) {
  return {
    full_name: draft.full_name,
    first_name: draft.first_name ?? null,
    company: draft.company ?? null,
    email: draft.email ?? null,
    phone: draft.phone ?? null,
    city: draft.city ?? null,
    country: draft.country ?? null,
    address: draft.address ?? null,
    postal_code: draft.postal_code ?? null,
    job_title: draft.job_title ?? null,
    investor_profile: draft.investor_profile ?? null,
    budget_min: draft.budget_min ?? null,
    budget_max: draft.budget_max ?? null,
    asset_classes: draft.asset_classes ?? [],
    strategies: draft.strategies ?? [],
    regions: draft.regions ?? [],
    min_yield: draft.min_yield ?? null,
    holding_horizon: draft.holding_horizon ?? null,
    financing: draft.financing ?? null,
    status: draft.status ?? "actif",
    notes: draft.notes ?? null,
    profile_updated_at: new Date().toISOString(),
    next_review_at: new Date(Date.now() + 182 * 24 * 3600 * 1000).toISOString(),
  };
}
