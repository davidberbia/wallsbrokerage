import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertBroker(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "broker",
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Accès réservé à l'administrateur");
}

export type BackofficeUser = {
  id: string;
  email: string;
  role: string;
  created_at: string;
};

export const listBackofficeUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertBroker(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: roles, error } = await supabaseAdmin
      .from("user_roles")
      .select("user_id, role, created_at");
    if (error) throw new Error(error.message);
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const byId = new Map((list?.users ?? []).map((u) => [u.id, u.email ?? ""]));
    return (roles ?? [])
      .filter((r) => r.role === "broker" || r.role === "viewer")
      .map((r) => ({
        id: r.user_id,
        email: byId.get(r.user_id) ?? "—",
        role: r.role as string,
        created_at: r.created_at as string,
      })) as BackofficeUser[];
  });

export const createViewerUser = createServerFn({ method: "POST" })
  .inputValidator((input: { email: string; password: string }) => {
    const email = input.email?.trim().toLowerCase();
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Email invalide");
    if (!input.password || input.password.length < 8)
      throw new Error("Le mot de passe doit contenir au moins 8 caractères");
    return { email, password: input.password };
  })
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertBroker(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    const userId = created.user!.id;
    const { error: roleError } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: userId, role: "viewer" });
    if (roleError) throw new Error(roleError.message);
    return { id: userId, email: data.email };
  });

export const deleteBackofficeUser = createServerFn({ method: "POST" })
  .inputValidator((input: { userId: string }) => input)
  .middleware([requireSupabaseAuth])
  .handler(async ({ data, context }) => {
    await assertBroker(context);
    if (data.userId === context.userId) throw new Error("Vous ne pouvez pas supprimer votre compte");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: role } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", data.userId)
      .maybeSingle();
    if (role?.role !== "viewer") throw new Error("Seuls les comptes lecteurs peuvent être supprimés");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
