import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

// Lecture publique d'une synthèse via son lien secret (bouton du mail).
export const getDigestByToken = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ token: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("digest_reports")
      .select("day, html, speech")
      .eq("token", data.token)
      .maybeSingle();
    return row ?? null;
  });
