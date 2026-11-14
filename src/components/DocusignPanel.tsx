import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getDocusignStatus, startDocusignConnect } from "@/lib/docusign.functions";

export function DocusignPanel() {
  const status = useServerFn(getDocusignStatus);
  const start = useServerFn(startDocusignConnect);
  const { data } = useQuery({ queryKey: ["docusign-status"], queryFn: () => status() });
  const [busy, setBusy] = useState(false);
  const go = async (env: "prod" | "demo") => {
    setBusy(true);
    try { const u = (await start({ data: { env } })).url; if (window.top && window.top !== window) { window.open(u, "_blank", "noopener"); setBusy(false); } else { window.location.href = u; } }
    catch (e) { toast.error((e as Error).message); setBusy(false); }
  };
  return (
    <section className="panel space-y-3 p-5">
      <h2 className="text-lg">DocuSign</h2>
      <p className="text-sm text-muted-foreground">
        {data?.connected ? `Connecté${data.email ? ` (${data.email})` : ""}` : "Non connecté"}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-11" disabled={busy} onClick={() => void go("prod")}>
          {data?.connected ? "Reconnecter DocuSign" : "Connecter DocuSign"}
        </Button>
        <Button variant="ghost" className="min-h-11 text-xs" disabled={busy} onClick={() => void go("demo")}>
          Compte de test
        </Button>
      </div>
    </section>
  );
}
