import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { CheckCircle2, Clock, Eye, FileDown } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";


export const Route = createFileRoute("/envois")({
  head: () => ({
    meta: [
      { title: "Historique des envois — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Traçabilité horodatée des brochures envoyées à chaque investisseur, avec accusé de lecture.",
      },
      { property: "og:title", content: "Historique des envois — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Qui a reçu quelle brochure, quand, et qui l'a ouverte.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <SendsPage />
    </AppLayout>
  ),
});

type SendRow = {
  id: string;
  asset_id: string;
  sent_at: string;
  opened_at: string | null;
  email_to: string | null;
  subject: string | null;
  status: string;
  channel: string;
  assets: { title: string; reference: string | null } | null;
  investors: { company: string | null } | null;
};

const dt = (v: string | null) =>
  v
    ? new Date(v).toLocaleString("fr-FR", {
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";

const ALL = "__all__";

function SendsPage() {
  const [assetId, setAssetId] = useState<string>(ALL);

  const assets = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("id, title, reference, city, price, yield_pct, asset_class")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const sends = useQuery({
    queryKey: ["sends"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("brochure_sends")
        .select(
          "id, asset_id, sent_at, opened_at, email_to, subject, status, channel, assets(title, reference), investors(company)",
        )
        .order("sent_at", { ascending: false })
        .limit(2000);
      if (error) throw error;
      return data as unknown as SendRow[];
    },
  });

  const rows = (sends.data ?? []).filter((r) => assetId === ALL || r.asset_id === assetId);
  const opened = rows.filter((r) => r.opened_at).length;
  const asset = (assets.data ?? []).find((a) => a.id === assetId) ?? null;

  const generateReport = async () => {
    if (rows.length === 0) {
      toast.error("Aucun envoi à reporter pour cette sélection.");
      return;
    }
    const { jsPDF } = await import("jspdf");
    const autoTable = (await import("jspdf-autotable")).default;

    const doc = new jsPDF({ unit: "pt", format: "a4" });
    doc.setFontSize(18);
    doc.text("Marketing Report", 40, 50);
    doc.setFontSize(11);
    doc.text(asset ? asset.title : "Tous les actifs", 40, 72);
    doc.setFontSize(9);
    doc.text(
      `Édité le ${new Date().toLocaleDateString("fr-FR")} · ${rows.length} envoi(s) · ${opened} ouverture(s) · taux d'ouverture ${
        rows.length ? Math.round((opened / rows.length) * 100) : 0
      }%`,
      40,
      90,
    );

    autoTable(doc, {
      startY: 110,
      head: [["Date et heure", "Société", "Actif", "Statut", "Ouverture"]],
      body: rows.map((r) => [
        dt(r.sent_at),
        r.investors?.company ?? "—",
        r.assets?.title ?? "—",
        r.status,
        r.opened_at ? dt(r.opened_at) : "non ouvert",
      ]),
      styles: { fontSize: 8, cellPadding: 4 },
      headStyles: { fillColor: [17, 34, 51] },
    });

    doc.save(`marketing-report-${asset ? asset.title.replace(/[^\w-]+/g, "_") : "global"}.pdf`);
    toast.success("Marketing Report généré");
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Traçabilité</p>
        <h1 className="mt-1 text-3xl">Historique des envois</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Chaque brochure envoyée est horodatée : vous pouvez prouver à quel client vous avez
          transmis quel actif, à quelle date et à quelle heure.
        </p>
      </div>

      <div className="panel flex flex-wrap items-end gap-4 p-4">
        <div className="min-w-72 flex-1 space-y-2">
          <Label>Actif</Label>
          <Select value={assetId} onValueChange={setAssetId}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les actifs</SelectItem>
              {(assets.data ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                  {a.city ? ` — ${a.city}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button variant="outline" onClick={generateReport}>
          <FileDown className="size-4" /> Générer Marketing Report
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <Stat label="Envois" value={rows.length} icon={<Clock className="size-4" />} />
        <Stat label="Ouverts" value={opened} icon={<Eye className="size-4" />} />
      </div>

      <div className="panel overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Date et heure</th>
              <th className="px-4 py-3">Société</th>
              <th className="px-4 py-3">Actif</th>
              <th className="px-4 py-3">Statut</th>
              <th className="px-4 py-3">Ouverture</th>
            </tr>
          </thead>
          <tbody>
            {sends.isLoading && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Chargement…
                </td>
              </tr>
            )}
            {!sends.isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Aucun envoi enregistré pour le moment.
                </td>
              </tr>
            )}
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-border/60 last:border-0">
                <td className="whitespace-nowrap px-4 py-3">{dt(r.sent_at)}</td>
                <td className="px-4 py-3 font-medium">{r.investors?.company ?? "—"}</td>
                <td className="px-4 py-3">
                  <p>{r.assets?.title ?? "—"}</p>
                  <p className="text-xs text-muted-foreground">{r.assets?.reference ?? ""}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={r.status === "erreur" ? "outline" : "secondary"}>
                    {r.status}
                  </Badge>
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  {r.opened_at ? (
                    <span className="inline-flex items-center gap-1 text-foreground">
                      <CheckCircle2 className="size-4" /> {dt(r.opened_at)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">non ouvert</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}


function Stat({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="panel flex items-center gap-3 px-5 py-4">
      <span className="text-muted-foreground">{icon}</span>
      <div>
        <p className="font-display text-2xl leading-none">{value}</p>
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      </div>
    </div>
  );
}
