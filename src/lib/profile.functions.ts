import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const sendProfileConfirmation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ profileId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: profile, error } = await context.supabase
      .from("investors")
      .select("id, email, first_name, full_name")
      .eq("id", data.profileId)
      .eq("user_id", context.userId)
      .single();

    if (error || !profile?.email) throw new Error("Profil ou adresse email introuvable.");

    const { sendSenderMail } = await import("@/lib/sender.server");
    const name = profile.first_name?.trim() || profile.full_name.trim();
    await sendSenderMail({
      to: profile.email,
      toName: name,
      subject: "Bienvenue dans la communauté d’investisseurs Wallsbroker",
      html: `<p>Bonjour ${escapeHtml(name)},</p><p>Bienvenue dans la communauté d’investisseurs de Wallsbroker !</p><p>Vos critères ont été correctement enregistrés.</p><p>Si vous souhaitez les modifier, connectez-vous à votre compte sur <a href="https://www.wallsbrokerage.com">www.wallsbrokerage.com</a>.</p><p>L’équipe Wallsbroker<br><a href="https://www.wallsbroker.com">www.wallsbroker.com</a></p>`,
    });
    return { sent: true };
  });

function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => {
    const entities: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;",
    };
    return entities[character] ?? character;
  });
}