import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const submitLink = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ url: z.string().url().max(2000), note: z.string().max(2000).optional() }).parse(d),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: ok } = await supabase.rpc("has_role", { _user_id: userId, _role: "broker" });
    if (!ok) throw new Error("Accès refusé");
    const { data: existing } = await supabase.from("shared_links").select("id,status").eq("url", data.url).maybeSingle();
    let id = existing?.id;
    if (!id) {
      const { data: ins, error } = await supabase
        .from("shared_links")
        .insert({ url: data.url, note: data.note || null, created_by: userId })
        .select("id")
        .single();
      if (error) throw new Error(error.message);
      id = ins.id;
    } else if (existing?.status === "analysé") {
      return { id, already: true };
    }
    const { processLink } = await import("@/lib/links.server");
    await processLink(id);
    return { id, already: false };
  });
