import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { completion, type CompletionAsset, type CompletionDeal } from '@/lib/completion';
export function useCompletion() {
  const data = useQuery({ queryKey: ['record-completion'], refetchInterval: 30000, queryFn: async () => {
    async function readAssets() {
      const rows = [];
      for (let offset = 0; ; offset += 1000) {
        const r = await supabase.from('assets').select('id,transaction_type,price,rent,surface,fee_value,description,portfolio_lots').order('id').range(offset, offset + 999);
        if (r.error) throw r.error;
        rows.push(...(r.data ?? []));
        if ((r.data?.length ?? 0) < 1000) return rows;
      }
    }
    async function readDocs() {
      const rows = [];
      for (let offset = 0; ; offset += 1000) {
        const r = await supabase.from('asset_documents').select('asset_id,name,category,path').order('id').range(offset, offset + 999);
        if (r.error) throw r.error;
        rows.push(...(r.data ?? []));
        if ((r.data?.length ?? 0) < 1000) return rows;
      }
    }
    async function readMandates() {
      const rows = [];
      for (let offset = 0; ; offset += 1000) {
        const r = await supabase.from('mandates').select('asset_id').order('id').range(offset, offset + 999);
        if (r.error) throw r.error;
        rows.push(...(r.data ?? []));
        if ((r.data?.length ?? 0) < 1000) return rows;
      }
    }
    const [assets, docs, mandates] = await Promise.all([
      readAssets(), readDocs(), readMandates(),
    ]);
    return { assets: new Map(assets.map(a => [a.id, a])), docs, mandates: new Set(mandates.map(m => m.asset_id)) };
  }});
  const get = (id?: string | null, asset?: CompletionAsset, deal?: CompletionDeal) => completion(asset ?? (id ? data.data?.assets.get(id) : undefined), id ? data.data?.docs.filter(d => d.asset_id === id) : [], id ? data.data?.mandates.has(id) : false, deal);
  return { get, loaded: !!data.data, error: data.error };
}
