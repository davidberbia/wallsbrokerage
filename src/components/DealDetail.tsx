import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Tables } from "@/integrations/supabase/types";
import type { MailExtraction } from "@/lib/mail-extract";
import { STAGE_NAMES, TARGET_STAGE } from "@/lib/deal-stages";

const STAGES = [TARGET_STAGE, ...STAGE_NAMES];
type Deal = Tables<"deals">;
type DealMail = Pick<
  Tables<"mail_messages">,
  "id" | "folder" | "received_at" | "subject" | "from_name" | "from_email" | "to_display" | "preview" | "web_link"
> & { extracted?: MailExtraction | null };
const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
const fmtAmount = (v: number | null) =>
  v == null ? null : `${new Intl.NumberFormat("fr-FR").format(v)} €`;

export function DealDetail({ id, onClose }: { id: string; onClose: () => void }) {
  const qc = useQueryClient();
  const deal = useQuery({
    queryKey: ["deal", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("deals").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  });
  const assets = useQuery({
    queryKey: ["assets-light"],
    queryFn: async () => {
      const { data } = await supabase.from("assets").select("id,title").order("title");
      return data ?? [];
    },
  });
  const contacts = useQuery({
    queryKey: ["deal-contacts", id],
    queryFn: async () => {
      const { data } = await supabase.from("deal_contacts").select("*").eq("deal_id", id);
      return data ?? [];
    },
  });
  const mails = useQuery({
    queryKey: ["deal-mails", id],
    queryFn: async () => {
      const { data } = await supabase
        .from("mail_messages")
        .select("id,folder,received_at,subject,from_name,from_email,to_display,preview,web_link,extracted")
        .eq("deal_id", id)
        .order("received_at", { ascending: false })
        .limit(200);
      return (data ?? []) as unknown as DealMail[];
    },
  });

  const [form, setForm] = useState<(Partial<Deal> & { address?: string | null }) | null>(null);
  const current = form ?? deal.data ?? null;
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["deal", id] });
    qc.invalidateQueries({ queryKey: ["deals"] });
    qc.invalidateQueries({ queryKey: ["deal-contacts", id] });
    qc.invalidateQueries({ queryKey: ["deal-mails", id] });
  };

  const save = async () => {
    if (!form) return;
    const { error } = await supabase
      .from("deals")
      .update({
        name: current?.name ?? "",
        stage: current?.stage ?? "Cible",
        company: current?.company ?? null,
        contact_name: current?.contact_name ?? null,
        amount: current?.amount ?? null,
        address: current?.address ?? null,
        fee_amount: current?.fee_amount ?? null,
        fee_pct: current?.fee_pct ?? null,
        probability: current?.probability ?? null,
        expected_payment_at: current?.expected_payment_at ?? null,
        paid_at: current?.paid_at ?? null,
        notes: current?.notes ?? null,
        asset_id: current?.asset_id ?? null,
      } as never)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setForm(null);
    toast.success("Dossier enregistré");
    refresh();
  };

  const addContact = async () => {
    const e = email.trim().toLowerCase();
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) {
      toast.error("Email invalide");
      return;
    }
    const { error } = await supabase.from("deal_contacts").insert({ deal_id: id, email: e });
    if (error) {
      toast.error(error.message);
      return;
    }
    setEmail("");
    toast.success("Contact ajouté, emails rattachés");
    refresh();
  };

  const found = useQuery({
    queryKey: ["mail-search", search],
    enabled: search.trim().length >= 3,
    queryFn: async () => {
      const q = search.trim().replace(/[%,()]/g, " ");
      const { data } = await supabase
        .from("mail_messages")
        .select("id,received_at,subject,from_name,from_email,deal_id")
        .or(`subject.ilike.%${q}%,from_email.ilike.%${q}%,from_name.ilike.%${q}%`)
        .order("received_at", { ascending: false })
        .limit(20);
      return data ?? [];
    },
  });

  const linkMail = async (mailId: string, dealId: string | null) => {
    const { error } = await supabase
      .from("mail_messages")
      .update({ deal_id: dealId, linked_manually: dealId !== null })
      .eq("id", mailId);
    if (error) {
      toast.error(error.message);
      return;
    }
    refresh();
    qc.invalidateQueries({ queryKey: ["mail-search"] });
  };

  const remove = async () => {
    if (!confirm("Supprimer ce dossier ? Les emails resteront dans la boîte.")) return;
    const { error } = await supabase.from("deals").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    qc.invalidateQueries({ queryKey: ["deals"] });
    onClose();
  };

  if (!current) return <p className="p-4 text-sm text-muted-foreground">Chargement…</p>;
  const set = (patch: Partial<Deal> & { address?: string | null }) => setForm({ ...current, ...patch });

  // Agrège les informations détectées dans les emails liés (règles, sans IA).
  const detected = (() => {
    const amounts = new Map<number, number>();
    const phones = new Map<string, number>();
    const addresses = new Map<string, number>();
    for (const m of mails.data ?? []) {
      const ex = m.extracted;
      if (!ex) continue;
      for (const a of ex.amounts ?? []) amounts.set(a, (amounts.get(a) ?? 0) + 1);
      for (const p of ex.phones ?? []) phones.set(p, (phones.get(p) ?? 0) + 1);
      for (const a of ex.addresses ?? []) addresses.set(a, (addresses.get(a) ?? 0) + 1);
    }
    const sort = <T,>(map: Map<T, number>) =>
      [...map.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
    return { amounts: sort(amounts), phones: sort(phones), addresses: sort(addresses) };
  })();
  const hasDetected =
    detected.amounts.length > 0 || detected.phones.length > 0 || detected.addresses.length > 0;

  return (
    <div className="space-y-5">
      <SheetHeader>
        <SheetTitle>{current.name}</SheetTitle>
      </SheetHeader>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Label>Nom</Label>
          <Input value={current.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div>
          <Label>Étape</Label>
          <Select value={current.stage ?? "Cible"} onValueChange={(v) => set({ stage: v })}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Actif lié</Label>
          <Select
            value={current.asset_id ?? "none"}
            onValueChange={(v) => set({ asset_id: v === "none" ? null : v })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">Aucun</SelectItem>
              {(assets.data ?? []).map((a) => (
                <SelectItem key={a.id} value={a.id}>
                  {a.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Société</Label>
          <Input value={current.company ?? ""} onChange={(e) => set({ company: e.target.value })} />
        </div>
        <div>
          <Label>Contact</Label>
          <Input
            value={current.contact_name ?? ""}
            onChange={(e) => set({ contact_name: e.target.value })}
          />
        </div>
        <div>
          <Label>Montant indicatif (€)</Label>
          <Input
            type="number"
            value={current.amount ?? ""}
            onChange={(e) => set({ amount: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Adresse de l'actif</Label>
          <Input value={current.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div>
          <Label>Honoraires prévus (€)</Label>
          <Input
            type="number"
            value={current.fee_amount ?? ""}
            onChange={(e) => set({ fee_amount: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>ou honoraires en % du montant</Label>
          <Input
            type="number"
            step="0.1"
            value={current.fee_pct ?? ""}
            onChange={(e) => set({ fee_pct: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Probabilité de succès (%)</Label>
          <Input
            type="number"
            min={0}
            max={100}
            value={current.probability ?? ""}
            onChange={(e) => set({ probability: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Encaissement prévu le</Label>
          <Input
            type="date"
            value={current.expected_payment_at ?? ""}
            onChange={(e) => set({ expected_payment_at: e.target.value || null })}
          />
        </div>
        <div>
          <Label>Encaissé le</Label>
          <Input
            type="date"
            value={current.paid_at ?? ""}
            onChange={(e) => set({ paid_at: e.target.value || null })}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Textarea rows={3} value={current.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={remove}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
        <Button onClick={save} disabled={!form}>
          Enregistrer
        </Button>
      </div>

      {hasDetected && (
        <section className="space-y-2 border-t border-border pt-4">
          <h3 className="text-sm font-semibold">Informations détectées dans les emails</h3>
          <p className="text-xs text-muted-foreground">
            Relevées automatiquement dans les objets et aperçus. Cliquez pour les retenir dans la fiche.
          </p>
          {detected.amounts.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Montants</span>
              <div className="flex flex-wrap gap-2">
                {detected.amounts.map(([a, n]) => (
                  <button
                    key={a}
                    onClick={() => set({ amount: a })}
                    className="rounded-sm border border-border px-2 py-1 text-xs hover:border-primary"
                    title={`Vu ${n} fois — cliquer pour retenir`}
                  >
                    {fmtAmount(a)}
                  </button>
                ))}
              </div>
            </div>
          )}
          {detected.addresses.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Adresses</span>
              <div className="flex flex-col gap-1">
                {detected.addresses.map(([a, n]) => (
                  <button
                    key={a}
                    onClick={() => set({ address: a })}
                    className="rounded-sm border border-border px-2 py-1 text-left text-xs hover:border-primary"
                    title={`Vue ${n} fois — cliquer pour retenir`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
          {detected.phones.length > 0 && (
            <div className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">Téléphones</span>
              <div className="flex flex-wrap gap-2">
                {detected.phones.map(([p]) => (
                  <span key={p} className="rounded-sm border border-border px-2 py-1 font-mono text-xs">
                    {p}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Contacts du dossier</h3>
        <p className="text-xs text-muted-foreground">
          Tous les emails échangés avec ces adresses sont rattachés automatiquement.
        </p>
        <div className="flex flex-wrap gap-2">
          {(contacts.data ?? []).map((c) => (
            <span
              key={c.id}
              className="inline-flex items-center gap-1 rounded-sm border border-border px-2 py-1 text-xs"
            >
              {c.email}
              <select
                aria-label="Rôle"
                value={(c as { role?: string }).role ?? "autre"}
                onChange={async (e) => {
                  await supabase.from("deal_contacts").update({ role: e.target.value }).eq("id", c.id);
                  refresh();
                }}
                className="ml-1 rounded-sm border border-border bg-background px-1 text-[11px]"
              >
                <option value="autre">—</option>
                <option value="vendeur">Vendeur</option>
                <option value="acquéreur">Acquéreur</option>
              </select>
              <button
                aria-label="Retirer"
                onClick={async () => {
                  await supabase.from("deal_contacts").delete().eq("id", c.id);
                  refresh();
                }}
                className="text-muted-foreground hover:text-destructive"
              >
                ×
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Input placeholder="email@societe.com" value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button variant="outline" onClick={addContact}>
            Ajouter
          </Button>
        </div>
      </section>

      <section className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Rattacher un email manuellement</h3>
        <Input
          placeholder="Rechercher par objet ou expéditeur (3 lettres min.)"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        {(found.data ?? []).map((m) => (
          <div key={m.id} className="flex items-center justify-between gap-2 text-xs">
            <span className="min-w-0 truncate">
              {fmtDate(m.received_at)} · {m.from_name || m.from_email} · {m.subject}
            </span>
            {m.deal_id === id ? (
              <span className="text-muted-foreground">Rattaché</span>
            ) : (
              <Button size="sm" variant="outline" onClick={() => linkMail(m.id, id)}>
                Rattacher
              </Button>
            )}
          </div>
        ))}
      </section>

      <section className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Emails liés ({mails.data?.length ?? 0})</h3>
        {(mails.data ?? []).map((m) => (
          <div key={m.id} className="rounded-sm border border-border p-3 text-sm">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate font-medium">{m.subject || "(sans objet)"}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {m.folder === "sentitems" ? `Envoyé à ${m.to_display}` : `De ${m.from_name || m.from_email}`} ·{" "}
                  {fmtDate(m.received_at)}
                </div>
              </div>
              <div className="flex shrink-0 gap-1">
                {m.web_link && (
                  <a href={m.web_link} target="_blank" rel="noreferrer" aria-label="Ouvrir dans Outlook">
                    <ExternalLink className="h-4 w-4 text-primary" />
                  </a>
                )}
                <button
                  className="text-xs text-muted-foreground hover:text-destructive"
                  onClick={() => linkMail(m.id, null)}
                >
                  Détacher
                </button>
              </div>
            </div>
            {m.preview && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{m.preview}</p>}
          </div>
        ))}
      </section>
    </div>
  );
}
