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
import { INVESTOR_STATUS } from "@/lib/taxonomy";
import { useLists } from "@/lib/lists";
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
  onStrategyClick,
}: {
  draft: InvestorDraft;
  onChange: (d: InvestorDraft) => void;
  onSubmit: () => void;
  saving: boolean;
  showStatus?: boolean;
  submitLabel?: string;
  footer?: React.ReactNode;
  onStrategyClick?: () => void;
}) {
  const set = (patch: Partial<InvestorDraft>) => onChange({ ...draft, ...patch });
  const { investorProfiles } = useLists();


  return (
    <form
      className="flex min-h-0 flex-1 flex-col"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-1 pb-4">
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
          <Field label="Adresse email">
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
          <Field label="Adresse de la société">
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
        </div>

        <Field label="Notes">
          <Textarea
            rows={3}
            value={draft.notes ?? ""}
            onChange={(e) => set({ notes: e.target.value })}
          />
        </Field>
      </div>

      {footer ?? (
        <div className="flex shrink-0 flex-col gap-2 border-t border-border bg-background pt-4 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
          {onStrategyClick ? (
            <Button
              type="button"
              onClick={onStrategyClick}
              className="min-h-11 w-full bg-accent text-accent-foreground hover:bg-accent/90 sm:w-auto"
            >
              STRATÉGIE
            </Button>
          ) : (
            <span />
          )}
          <Button className="min-h-11 w-full sm:w-auto" type="submit" disabled={saving}>
            {saving ? "Enregistrement…" : submitLabel}
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
