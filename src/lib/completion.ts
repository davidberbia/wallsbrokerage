export type CompletionAsset = { transaction_type?: string | null; price?: number | null; rent?: number | null; surface?: number | null; fee_value?: number | null; description?: string | null; portfolio_lots?: unknown };
export type CompletionDoc = { name: string; category?: string; path?: string };
export type CompletionDeal = { amount?: number | null; rent?: number | null; surface?: number | null; fee_amount?: number | null; fee_pct?: number | null };
const positive = (n?: number | null) => n != null && Number.isFinite(n) && n > 0;
const norm = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
export function completion(asset: CompletionAsset = {}, docs: readonly CompletionDoc[] = [], mandate = false, deal: CompletionDeal = {}) {
  const unique = [...new Map(docs.map(d => [d.path ?? d.name, d])).values()];
  const photo = (d: CompletionDoc) => d.category === 'photo' || /\.(jpe?g|png|webp|heic)$/i.test(d.name);
  const main = unique.some(d => photo(d) && /photo principale|couverture/.test(norm(d.name)));
  const lots = Array.isArray(asset.portfolio_lots) ? asset.portfolio_lots : [];
  const tenancy = /etat locatif\s*:\s*\S/.test(norm(asset.description ?? '')) || lots.some(l => l && typeof l === 'object' && 'tenant' in l && typeof l.tenant === 'string' && l.tenant.trim());
  const checks = [
    { key: 'main', label: 'Photo principale', weight: 10, present: main },
    { key: 'price', label: 'Prix ou loyer', weight: 10, present: asset.transaction_type === 'Vente' ? positive(asset.price ?? deal.amount) : asset.transaction_type === 'Location' ? positive(asset.rent ?? deal.rent) : false },
    { key: 'surface', label: 'Surface', weight: 10, present: positive(asset.surface ?? deal.surface) },
    { key: 'tenancy', label: 'État locatif', weight: 10, present: tenancy || unique.some(d => /etat[ _-]*locatif|rent[ _-]*roll/.test(norm(d.name))) },
    { key: 'fees', label: 'Honoraires', weight: 10, present: asset.fee_value != null || deal.fee_amount != null || deal.fee_pct != null },
    { key: 'plans', label: 'Plans', weight: 10, present: unique.some(d => d.category === 'plan' || /\bplan|cadastre/.test(norm(d.name))) },
    { key: 'photos', label: 'Reportage photo', weight: 10, present: unique.filter(d => photo(d) && !/photo principale|couverture/.test(norm(d.name))).length > 0 || unique.some(d => /reportage[ _-]*photo/.test(norm(d.name))) },
    { key: 'lease', label: 'Bail', weight: 10, present: unique.some(d => d.category === 'bail' || /\bbail\b|\bbaux\b/.test(norm(d.name))) },
    { key: 'mandate', label: 'Mandat', weight: 20, present: mandate || unique.some(d => d.category === 'mandat' || /\bmandat\b/.test(norm(d.name))) },
  ];
  return { checks, percent: checks.reduce((s, c) => s + (c.present ? c.weight : 0), 0), ready: checks.slice(0, 5).every(c => c.present), missing: checks.slice(0, 5).filter(c => !c.present).map(c => c.label) };
}
