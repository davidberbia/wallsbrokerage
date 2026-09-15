import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/automation.server";

// Réception des événements de livraison Sender (délivré, bounce, ouverture, clic,
// plainte). À configurer dans Sender avec l'URL de ce point d'entrée + ?token=<jeton cron>.
type SenderEvent = {
  type?: string;
  event?: string;
  data?: Record<string, unknown>;
  email?: string;
  message_id?: string;
};

const pick = (value: unknown): string | null =>
  typeof value === "string" && value.trim() !== "" ? value.trim() : null;

export const Route = createFileRoute("/api/public/sender-events")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const admin = await getAdmin();
        const token = new URL(request.url).searchParams.get("token");
        const { data: config } = await admin
          .from("automation_config")
          .select("cron_token")
          .eq("id", true)
          .maybeSingle();
        if (!token || !config || config.cron_token !== token) {
          return new Response("Unauthorized", { status: 401 });
        }

        let payload: SenderEvent | SenderEvent[];
        try {
          payload = (await request.json()) as SenderEvent | SenderEvent[];
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const events = Array.isArray(payload) ? payload : [payload];
        const now = new Date().toISOString();

        for (const event of events) {
          const body = (event.data ?? event) as Record<string, unknown>;
          const type = (pick(event.type) ?? pick(event.event) ?? pick(body["type"]) ?? "").toLowerCase();
          const email = pick(body["email"]) ?? pick(body["recipient"]) ?? pick(event.email);
          const messageId = pick(body["message_id"]) ?? pick(body["id"]) ?? pick(event.message_id);
          if (!type || (!email && !messageId)) continue;

          const patch: Record<string, unknown> = { provider_status: type };
          if (type.includes("open")) patch["opened_at"] = now;
          if (type.includes("click")) patch["clicked_at"] = now;
          if (type.includes("bounce") || type.includes("complaint") || type.includes("spam")) {
            patch["bounced_at"] = now;
            patch["status"] = "erreur";
          }
          if (type.includes("deliver")) patch["delivered_at"] = now;

          let query = admin.from("brochure_sends").update(patch);
          query = messageId
            ? query.eq("provider_message_id", messageId)
            : query.eq("email_to", email!);
          const { error } = await query;
          if (error) console.error("sender webhook update", error);
        }

        return Response.json({ ok: true });
      },
    },
  },
});
