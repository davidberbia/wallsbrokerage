import { createFileRoute } from "@tanstack/react-router";
import { handleNas, verifyKey } from "@/lib/nas.server";

// Point d'entrée du programme d'aspiration du NAS : protégé par la clé privée générée dans Paramètres.
export const Route = createFileRoute("/api/public/nas-ingest")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await verifyKey(request))) return Response.json({ error: "Clé invalide" }, { status: 401 });
        try {
          const body = await request.json();
          return Response.json(await handleNas(String(body.action ?? ""), body));
        } catch (e) {
          return Response.json({ error: e instanceof Error ? e.message : "Erreur" }, { status: 400 });
        }
      },
    },
  },
});
