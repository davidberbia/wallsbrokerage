import { createFileRoute } from "@tanstack/react-router";

// Pixel de suivi : marque la brochure comme ouverte par le destinataire.
const PIXEL = Uint8Array.from(
  atob("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"),
  (c) => c.charCodeAt(0),
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export const Route = createFileRoute("/api/public/t/$id")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const raw = new URL(request.url).pathname.split("/").pop() ?? "";
        const trackingId = raw.replace(/\.gif$/i, "");

        if (UUID_RE.test(trackingId)) {
          try {
            const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
            await supabaseAdmin
              .from("brochure_sends")
              .update({ opened_at: new Date().toISOString() })
              .eq("tracking_id", trackingId)
              .is("opened_at", null);
          } catch (err) {
            console.error("tracking pixel error", err);
          }
        }

        return new Response(PIXEL, {
          headers: {
            "Content-Type": "image/gif",
            "Cache-Control": "no-store, no-cache, must-revalidate, private",
          },
        });
      },
    },
  },
});
