import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/mandats")({
  head: () => ({
    meta: [
      { title: "Registre des mandats — Walls Brokerage CRM" },
      { name: "description", content: "Registre numéroté des mandats de vente et de location." },
      { property: "og:title", content: "Registre des mandats — Walls Brokerage CRM" },
      { property: "og:description", content: "Registre numéroté des mandats de vente et de location." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <MandatesPage />
    </AppLayout>
  ),
});

const STATUSES = ["brouillon", "envoyé", "signé", "expiré"] as const;
const fmt = (d: string | null) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

function MandatesPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["mandates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mandates")
        .select("id, number, status, assets(title, city, owner_name, mandate_exclusive, mandate_type, transaction_type, mandate_start, mandate_end)")
        .order("number", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const rows = (data ?? []).map((m) => {
    const a = m.assets;
    const expired = a?.mandate_end && new Date(a.mandate_end).getTime() < Date.now() && m.status !== "signé";
    return {
      id: m.id,
      number: m.number,
      title: a?.title ?? "—",
      city: a?.city ?? "",
      owner: a?.owner_name ?? "—",
      exclusive: a?.mandate_exclusive == null ? "—" : a.mandate_exclusive ? "Exclusif" : "Non exclusif",
      type: a?.mandate_type ?? a?.transaction_type ?? "—",
      start: fmt(a?.mandate_start ?? null),
      end: fmt(a?.mandate_end ?? null),
      status: expired ? "expiré" : m.status,
    };
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("mandates")
      .update({ status, signed_at: status === "signé" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) { toast.error(error.message); return; }
    await qc.invalidateQueries({ queryKey: ["mandates"] });
  };

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "N°": r.number, Actif: r.title, Ville: r.city, Propriétaire: r.owner,
        Exclusivité: r.exclusive, Type: r.type, Début: r.start, Fin: r.end, Statut: r.status,
      })),
    );
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Mandats");
    XLSX.writeFile(wb, "Registre_des_mandats.xlsx");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div>
          <p className="eyebrow">Registre</p>
          <h1 className="mt-1 text-3xl">Mandats</h1>
        </div>
        <Button variant="outline" className="min-h-11 sm:ml-auto" onClick={() => void exportXlsx()} disabled={!rows.length}>
          <Download className="size-4" /> Export Excel
        </Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && rows.length === 0 && (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          Aucun mandat. Il est créé à l'étape « Mandat » d'un nouvel actif (n° à partir de 202193).
        </div>
      )}
      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="panel grid gap-2 p-4 sm:grid-cols-[6rem_minmax(0,1fr)_auto] sm:items-center">
            <p className="font-display text-lg">N° {r.number}</p>
            <div className="min-w-0 text-sm">
              <p className="font-medium">{r.title}{r.city ? ` · ${r.city}` : ""}</p>
              <p className="text-muted-foreground">
                {r.owner} · {r.exclusive} · {r.type} · {r.start} → {r.end}
              </p>
            </div>
            <Select value={r.status} onValueChange={(v) => void setStatus(r.id, v)}>
              <SelectTrigger className="min-h-11 w-full sm:w-36"><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        ))}
      </div>
    </div>
  );
}
