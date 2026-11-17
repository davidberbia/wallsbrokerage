import { createFileRoute } from "@tanstack/react-router";
import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { runAttachments } from "@/lib/attachments.server";

// Reprise des pièces jointes coupées : 1 minute après, jusqu'à 3 fois. Sortie immédiate si rien à reprendre.
export const Route = createFileRoute("/api/public/cron/attachments-retry")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
        return Response.json({ ok: true, ...(await runAttachments("retry")) });
      },
    },
  },
});
