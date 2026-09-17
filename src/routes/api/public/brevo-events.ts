import { createFileRoute } from "@tanstack/react-router";
import { getAdmin } from "@/lib/automation.server";

type BrevoEvent = {
  event?: string;
  email?: string;
  "message-id"?: string;
  messageId?: string;
  date?: string;
  ts_event?: number;
};

const eventDate = (event: BrevoEvent) => {
  if (event.date) {
    const parsed = new Date(event.date);
    if (!Number.isNaN(parsed.getTime())) return parsed.toISOString();
  }
  if (event.ts_event) return new Date(event.ts_event * 1000).toISOString();
  return new Date().toISOString();
};

export const Route = createFileRoute("/api/public/brevo-events")({
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

        let event: BrevoEvent;
        try {
          event = (await request.json()) as BrevoEvent;
        } catch {
          return new Response("Bad request", { status: 400 });
        }

        const type = event.event?.trim().toLowerCase();
        const email = event.email?.trim().toLowerCase();
        const messageId = event["message-id"]?.trim() || event.messageId?.trim();
        if (!type || (!email && !messageId)) return Response.json({ ok: true });

        const occurredAt = eventDate(event);
        const patch: {
          provider_status: string;
          opened_at?: string;
          clicked_at?: string;
          bounced_at?: string;
          delivered_at?: string;
          status?: string;
        } = { provider_status: type };

        if (type === "opened" || type === "unique_opened") patch.opened_at = occurredAt;
        if (type === "click" || type === "unique_click") patch.clicked_at = occurredAt;
        if (["hard_bounce", "soft_bounce", "blocked", "spam", "invalid", "error"].includes(type)) {
          patch.bounced_at = occurredAt;
          patch.status = "erreur";
        }
        if (type === "delivered") patch.delivered_at = occurredAt;

        let targetId: string | null = null;
        if (!messageId && email) {
          const { data: last } = await admin
            .from("brochure_sends")
            .select("id")
            .eq("email_to", email)
            .order("sent_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          targetId = last?.id ?? null;
          if (!targetId) return Response.json({ ok: true });
        }

        const query = admin.from("brochure_sends").update(patch);
        const result = messageId
          ? await query.eq("provider_message_id", messageId)
          : targetId
            ? await query.eq("id", targetId)
            : null;
        if (result?.error) {
          console.error("brevo webhook update", result.error);
          return new Response("Update failed", { status: 500 });
        }

        return Response.json({ ok: true });
      },
    },
  },
});