import { CompactRow, RecordDialog, RecordFacts } from "@/components/CompactRow";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, PenLine, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { refreshMandateSignatures, sendMandateForSignature } from "@/lib/docusign.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/mandats")({
  head: () => ({
    meta: [
      { title: "Registre des mandats — Walls Brokerage CRM" },
      { name: "description", content: "Registre numéroté des mandats de vente et de location." },
      { property: "og:title", content: "Registre des mandats — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Registre numéroté des mandats de vente et de location.",
      },
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
        .select(
          "id, number, status, asset_title, signature_status, agent_id, address, signed_at, expires_at, assets(title, city, owner_name, mandate_exclusive, mandate_type, transaction_type, mandate_start, mandate_end)",
        )
        .order("number", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: agents } = useQuery({
    queryKey: ["mandate-agents"],
    queryFn: async () => {
      const { data, error } = await supabase.rpc("list_mandate_agents");
      if (error) throw error;
      return data ?? [];
    },
  });
  const agentName = (id: string | null) => agents?.find((g) => g.id === id)?.name ?? "—";
  const setAgent = async (id: string, agent: string) => {
    const { error } = await supabase
      .from("mandates")
      .update({ agent_id: agent === "none" ? null : agent })
      .eq("id", id);
    if (error) return void toast.error(error.message);
    await qc.invalidateQueries({ queryKey: ["mandates"] });
  };

  const rows = (data ?? []).map((m) => {
    const a = m.assets;
    const expired =
      a?.mandate_end && new Date(a.mandate_end).getTime() < Date.now() && m.status !== "signé";
    return {
      id: m.id,
      number: m.number,
      title: a?.title ?? m.asset_title ?? "—",
      city: a?.city ?? "",
      owner: a?.owner_name ?? "—",
      exclusive:
        a?.mandate_exclusive == null ? "—" : a.mandate_exclusive ? "Exclusif" : "Non exclusif",
      type: a?.mandate_type ?? a?.transaction_type ?? "—",
      start: fmt(m.signed_at ?? a?.mandate_start ?? null),
      end: fmt(m.expires_at ?? a?.mandate_end ?? null),
      address: m.address ?? "",
      agentId: m.agent_id,
      status: expired ? "expiré" : m.status,
      sig: m.signature_status,
    };
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("mandates")
      .update({ status, signed_at: status === "signé" ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["mandates"] });
  };

  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = rows.find((r) => r.id === detailId);
  const [target, setTarget] = useState<{ id: string; number: number; owner: string } | null>(null);
  const refresh = useServerFn(refreshMandateSignatures);
  const [syncing, setSyncing] = useState(false);
  const sync = async () => {
    setSyncing(true);
    try {
      const r = await refresh();
      toast.success(`${r.updated} mandat(s) mis à jour`);
      await qc.invalidateQueries({ queryKey: ["mandates"] });
    } catch (e) {
      toast.error((e as Error).message);
    }
    setSyncing(false);
  };

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "N°": r.number,
        Actif: r.title,
        Adresse: r.address || r.city,
        Agent: agentName(r.agentId),
        Propriétaire: r.owner,
        Exclusivité: r.exclusive,
        Type: r.type,
        "Signé le": r.start,
        Expiration: r.end,
        Statut: r.status,
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
        <Button
          variant="outline"
          className="min-h-11 sm:ml-auto"
          onClick={() => void sync()}
          disabled={syncing}
        >
          <RefreshCw className="size-4" /> Statuts DocuSign
        </Button>
        <Button
          variant="outline"
          className="min-h-11"
          onClick={() => void exportXlsx()}
          disabled={!rows.length}
        >
          <Download className="size-4" /> Export Excel
        </Button>
      </div>
      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && rows.length === 0 && (
        <div className="panel p-8 text-center text-sm text-muted-foreground">
          Aucun mandat. Il est créé à l'étape « Mandat » d'un nouvel actif (n° à partir de 202193).
        </div>
      )}
      <div className="overflow-hidden border-y border-border">
        {rows.map((r) => (
          <CompactRow
            key={r.id}
            title={`N° ${r.number} · ${r.title}`}
            subtitle={[r.address || r.city, agentName(r.agentId), r.status].filter(Boolean).join(" · ")}
            summary={r.status}
            onOpen={() => setDetailId(r.id)}
            onEdit={() => setDetailId(r.id)}
          />
        ))}
      </div>
      <RecordDialog
        title={detail ? `Mandat n° ${detail.number}` : "Mandat"}
        open={!!detail}
        onClose={() => setDetailId(null)}
      >
        {detail && (
          <>
            <RecordFacts
              facts={[
                ["Actif", detail.title],
                ["Adresse", detail.address || detail.city],
                ["Propriétaire", detail.owner],
                ["Exclusivité", detail.exclusive],
                ["Type", detail.type],
                ["Signature le", detail.start],
                ["Expiration", detail.end],
                ["Signature", detail.sig ? (SIG[detail.sig] ?? detail.sig) : "—"],
              ]}
            />
            <Label>Agent concerné</Label>
            <Select
              value={detail.agentId ?? "none"}
              onValueChange={(v) => void setAgent(detail.id, v)}
            >
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Non attribué</SelectItem>
                {(agents ?? []).map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Label>Statut</Label>
            <Select value={detail.status} onValueChange={(v) => void setStatus(detail.id, v)}>
              <SelectTrigger className="min-h-11">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              onClick={() => {
                setTarget({
                  id: detail.id,
                  number: detail.number,
                  owner: detail.owner === "—" ? "" : detail.owner,
                });
                setDetailId(null);
              }}
            >
              <PenLine className="size-4" /> Envoyer en signature
            </Button>
          </>
        )}
      </RecordDialog>
      <SignDialog
        target={target}
        onClose={() => setTarget(null)}
        onSent={() => void qc.invalidateQueries({ queryKey: ["mandates"] })}
      />
    </div>
  );
}

const SIG: Record<string, string> = {
  sent: "envoyé",
  delivered: "ouvert",
  completed: "signé par tous",
  declined: "refusé",
  voided: "annulé",
};

function SignDialog({
  target,
  onClose,
  onSent,
}: {
  target: { id: string; number: number; owner: string } | null;
  onClose: () => void;
  onSent: () => void;
}) {
  const send = useServerFn(sendMandateForSignature);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if (target && lastId !== target.id) {
    setLastId(target.id);
    setName(target.owner);
    setEmail("");
    setFile(null);
  }
  const submit = async () => {
    if (!target || !file) return;
    if (file.size > 9_000_000) {
      toast.error("Fichier trop lourd (9 Mo max)");
      return;
    }
    setBusy(true);
    try {
      const buf = new Uint8Array(await file.arrayBuffer());
      let bin = "";
      for (let i = 0; i < buf.length; i += 0x8000)
        bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
      await send({
        data: {
          mandateId: target.id,
          ownerName: name,
          ownerEmail: email,
          fileName: file.name,
          fileBase64: btoa(bin),
        },
      });
      toast.success("Mandat envoyé en signature");
      onSent();
      onClose();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Mandat n° {target?.number} — signature</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1">
            <Label>Nom du propriétaire</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Email du propriétaire</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Mandat (PDF ou Word)</Label>
            <Input
              type="file"
              accept=".pdf,.doc,.docx"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
          <Button
            className="min-h-11 w-full"
            disabled={busy || !file || !name || !email}
            onClick={() => void submit()}
          >
            {busy ? "Envoi…" : "Envoyer au propriétaire et à moi"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
