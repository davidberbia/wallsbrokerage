import { createFileRoute } from "@tanstack/react-router";
import { publicAddress } from "@/lib/public-address";

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" };

// Catalogue public lu par le site Wallsbroker : uniquement les biens cochés « Publier », sans données internes.
export const Route = createFileRoute("/api/public/catalogue")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("assets")
          .select("id,title,reference,asset_class,transaction_type,address,city,postal_code,price,surface,description,status,publish_on_site,hide_street_number,hide_street_name,residential_details,updated_at")
          .eq("publish_on_site", true)
          .neq("status", "retiré")
          .limit(500);
        if (error) return Response.json({ error: "indisponible" }, { status: 500, headers: CORS });
        const ids = (data ?? []).map((a) => a.id);
        const { data: docs } = ids.length
          ? await supabaseAdmin.from("asset_documents").select("asset_id,path,name,sort_order").in("asset_id", ids).eq("category", "photo").order("sort_order")
          : { data: [] };
        const photos = new Map<string, { url: string; alt: string; sort_order: number }[]>();
        for (const d of docs ?? []) {
          const { data: s } = await supabaseAdmin.storage.from("brochures").createSignedUrl(d.path, 60 * 60 * 24);
          if (!s?.signedUrl) continue;
          const list = photos.get(d.asset_id) ?? [];
          list.push({ url: s.signedUrl, alt: "", sort_order: d.sort_order ?? 0 });
          photos.set(d.asset_id, list);
        }
        const assets = (data ?? []).map((a) => ({
          id: a.id, title: a.title, reference: a.reference, asset_class: a.asset_class,
          transaction_type: a.transaction_type, city: a.city, postal_code: a.postal_code,
          address: publicAddress(a.address, a.hide_street_number, a.hide_street_name),
          price: a.price == null ? null : Number(a.price), surface: a.surface == null ? null : Number(a.surface),
          description: a.description, status: a.status ?? "disponible", publish_on_site: true,
          residential_details: a.residential_details ?? {}, diagnostics: {}, photos: photos.get(a.id) ?? [], plans: [],
          virtual_tour_url: null, updated_at: a.updated_at,
        }));
        return Response.json({ assets }, { headers: { ...CORS, "Cache-Control": "public, max-age=300" } });
      },
    },
  },
});
