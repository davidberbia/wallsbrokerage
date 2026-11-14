import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/docusign/callback")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const u = new URL(request.url);
        const code = u.searchParams.get("code");
        const state = u.searchParams.get("state");
        let ok = "1";
        if (!code || !state || code.length > 4000 || state.length > 100) ok = "0";
        else {
          try {
            const { exchangeCode } = await import("@/lib/docusign.server");
            await exchangeCode(code, state);
          } catch (e) {
            console.error("DocuSign callback", e);
            ok = "0";
          }
        }
        return new Response(null, { status: 302, headers: { Location: `/parametres?docusign=${ok}` } });
      },
    },
  },
});
