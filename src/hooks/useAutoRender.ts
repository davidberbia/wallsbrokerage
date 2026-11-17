// Conversion automatique, en arrière-plan, des pages photo/plan des PDF reçus par mail.
// Tourne dans le navigateur d'un membre de l'équipe connecté (pdf.js indisponible côté serveur).
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { planCategory } from "@/lib/autofill";

type Page = { page: number; kind: "plan" | "plan_masse" | "photo"; label?: string | null };

async function dims(url: string) {
  const img = new Image();
  img.src = url;
  await img.decode();
  return { w: img.naturalWidth, h: img.naturalHeight };
}

async function renderOne(): Promise<boolean> {
  const { data: rows } = await supabase.from("asset_documents").select("id, asset_id, path, name, render_pages").not("render_pages", "is", null).limit(1);
  const doc = rows?.[0];
  if (!doc) return false;
  // Réservation : un seul onglet traite ce document.
  const { data: claimed } = await supabase.from("asset_documents").update({ render_pages: null }).eq("id", doc.id).not("render_pages", "is", null).select("id");
  if (!claimed?.length) return true;
  const pages = (doc.render_pages as Page[]) ?? [];
  try {
    const { data: file } = await supabase.storage.from("brochures").download(doc.path);
    if (!file) return true;
    const { pdfToImages } = await import("@/lib/pdf-to-images");
    const nums = pages.map((p) => p.page);
    const images = await pdfToImages(await file.arrayBuffer(), 2, nums);
    const sorted = [...nums].sort((a, b) => a - b);
    const { data: existing } = await supabase.from("asset_documents").select("name").eq("asset_id", doc.asset_id).like("name", "Photo principale%").limit(1);
    let hasMain = !!existing?.length;
    let best: { i: number; score: number } | null = null;
    const dataUrls = sorted.map((n, i) => ({ page: pages.find((p) => p.page === n)!, url: images[i]! })).filter((x) => x.url);
    if (!hasMain) {
      for (const [i, x] of dataUrls.entries()) {
        if (x.page.kind !== "photo") continue;
        const { w, h } = await dims(x.url);
        const score = (w > h ? 1e9 : 0) + w * h;
        if (!best || score > best.score) best = { i, score };
      }
    }
    const base = doc.name.replace(/\.pdf$/i, "");
    for (const [i, x] of dataUrls.entries()) {
      const blob = await (await fetch(x.url)).blob();
      const isPhoto = x.page.kind === "photo";
      const label = isPhoto ? (!hasMain && best?.i === i ? "Photo principale" : "Autre") : planCategory(x.page.kind, x.page.label);
      const name = isPhoto ? `${label} — ${base} p${x.page.page}.jpg` : `${label}.jpg`;
      const path = `actifs/${doc.asset_id}/${isPhoto ? "photos" : "plans"}/${crypto.randomUUID()}-p${x.page.page}.jpg`;
      const up = await supabase.storage.from("brochures").upload(path, blob, { contentType: "image/jpeg" });
      if (up.error) continue;
      await supabase.from("asset_documents").insert({ asset_id: doc.asset_id, path, name, category: isPhoto ? "photo" : "plan", sort_order: 1000 + x.page.page });
      if (label === "Photo principale") hasMain = true;
    }
  } catch {
    // Document illisible : il reste disponible en PDF.
  }
  return true;
}

export function useAutoRender(enabled: boolean) {
  useEffect(() => {
    if (!enabled) return;
    let stop = false;
    const t = setTimeout(async () => {
      for (let i = 0; i < 5 && !stop; i++) if (!(await renderOne())) break;
    }, 8000);
    return () => {
      stop = true;
      clearTimeout(t);
    };
  }, [enabled]);
}
