import { createServerFn, createMiddleware } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const requireSuperAdmin = createMiddleware({ type: "function" }).middleware([requireSupabaseAuth]).server(async ({ context, next }) => {
  const { data, error } = await context.supabase.rpc("has_role", { _user_id: context.userId, _role: "admin" });
  if (error || !data) throw new Error("Réservé au super administrateur");
  return next();
});

/** Génère une nouvelle clé (affichée une seule fois) et révoque les anciennes. */
export const createNasKey = createServerFn({ method: "POST" }).middleware([requireSuperAdmin]).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { sha256Hex } = await import("./nas.server");
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const key = "wnas_" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
  await supabaseAdmin.from("nas_ingest_keys").update({ revoked: true }).eq("revoked", false);
  const { error } = await supabaseAdmin.from("nas_ingest_keys").insert({ key_hash: await sha256Hex(key), key_hint: key.slice(-4) });
  if (error) throw new Error(error.message);
  return { key };
});

/** Rattache un dossier « À rattacher » à une fiche et y pose ses fichiers. */
export const assignNasFolder = createServerFn({ method: "POST" }).middleware([requireSuperAdmin])
  .inputValidator((d) => z.object({ folder_id: z.string().uuid(), asset_id: z.string().uuid() }).parse(d))
  .handler(async ({ data }) => {
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { attachDocument } = await import("./nas.server");
    await db.from("nas_folders").update({ asset_id: data.asset_id, status: "matched", updated_at: new Date().toISOString() }).eq("id", data.folder_id);
    const { data: files } = await db.from("nas_files").select("sha256, rel_path, storage_path, category").eq("folder_id", data.folder_id);
    for (const f of files ?? []) {
      if (!f.storage_path) continue;
      const name = f.rel_path.split(/[\\/]/).pop() || "fichier";
      await attachDocument(db, data.asset_id, f.storage_path, name, f.category ?? "document", f.sha256);
      await db.from("nas_files").update({ asset_id: data.asset_id, status: "done" }).eq("sha256", f.sha256);
    }
    return { count: files?.length ?? 0 };
  });
