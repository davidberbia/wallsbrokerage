export type InvestorCriteria = {
  id: string;
  investor_id: string;
  bubble_id: string | null;
  asset_class: string;
  investor_profile: string | null;
  strategies: string[];
  amount_bands: string[];
  regions: string[];
  city_scope: string | null;
  periphery_scope: string | null;
  city_targets: string[];
};

export type Investor = {
  id: string;
  full_name: string;
  first_name: string | null;
  bubble_id?: string | null;
  job_title?: string | null;
  investor_profile?: string | null;
  address?: string | null;
  postal_code?: string | null;
  user_id: string | null;
  profile_updated_at: string;
  next_review_at: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string | null;
  budget_min: number | null;
  budget_max: number | null;
  asset_classes: string[];
  strategies: string[];
  regions: string[];
  min_yield: number | null;
  holding_horizon: string | null;
  financing: string | null;
  status: string;
  notes: string | null;
  created_at: string;
};

export type Asset = {
  id: string;
  title: string;
  reference: string | null;
  asset_class: string | null;
  strategy: string | null;
  region: string | null;
  city: string | null;
  price: number | null;
  yield_pct: number | null;
  surface: number | null;
  brochure_url: string | null;
  description: string | null;
  status: string;
  created_at: string;
};

export type Criteria = {
  price: number | null;
  yield_pct: number | null;
  asset_class: string | null;
  strategy: string | null;
  region: string | null;
};

export type MatchResult = {
  investor: Investor;
  score: number;
  reasons: string[];
  misses: string[];
};

/**
 * Un investisseur "matche" si aucun de ses critères renseignés n'est contredit
 * par l'actif. Un critère non renseigné côté investisseur = ouvert (neutre).
 */
export function matchInvestor(investor: Investor, c: Criteria): MatchResult {
  const reasons: string[] = [];
  const misses: string[] = [];

  const check = (label: string, ok: boolean | null) => {
    if (ok === null) return;
    if (ok) reasons.push(label);
    else misses.push(label);
  };

  // Budget
  if (c.price != null && (investor.budget_min != null || investor.budget_max != null)) {
    const okMin = investor.budget_min == null || c.price >= investor.budget_min;
    const okMax = investor.budget_max == null || c.price <= investor.budget_max;
    check("Budget", okMin && okMax);
  }

  // Rendement minimum attendu
  if (c.yield_pct != null && investor.min_yield != null) {
    check("Rendement", c.yield_pct >= investor.min_yield);
  }

  if (c.asset_class && investor.asset_classes.length > 0) {
    check("Classe d'actif", investor.asset_classes.includes(c.asset_class));
  }
  if (c.strategy && investor.strategies.length > 0) {
    check("Stratégie", investor.strategies.includes(c.strategy));
  }
  if (c.region && investor.regions.length > 0) {
    check("Région", investor.regions.includes(c.region));
  }

  const total = reasons.length + misses.length;
  const score = total === 0 ? 0 : Math.round((reasons.length / total) * 100);

  return { investor, score, reasons, misses };
}
