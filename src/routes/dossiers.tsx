import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ExternalLink, Plus, Trash2 } from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Tables } from "@/integrations/supabase/types";
import type { MailExtraction } from "@/lib/mail-extract";

type DealMail = Pick<
  Tables<"mail_messages">,
  "id" | "folder" | "received_at" | "subject" | "from_name" | "from_email" | "to_display" | "preview" | "web_link"
> & { extracted?: MailExtraction | null };

export const STAGES = [
  "Cible",
  "Avis de valeur",
  "Commercialisation",
  "Offre",
  "LOI",
  "Promesse",
  "Acte",
  "Signé",
  "Perdu",
] as const;

type Deal = Tables<"deals">;

export const Route = createFileRoute("/dossiers")({
  head: () => ({
    meta: [
      { title: "Dossiers — Walls Brokerage CRM" },
      {
        name: "description",
        content: "Pipeline des dossiers, de la cible à l'acte, avec les emails Outlook rattachés.",
      },
      { property: "og:title", content: "Dossiers — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Suivez chaque dossier étape par étape avec son fil d'emails.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <DealsPage />
    </AppLayout>
  ),
});

const fmtDate = (v: string | null) =>
  v ? new Date(v).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" }) : "—";
const fmtAmount = (v: number | null) =>
  v == null ? null : `${new Intl.NumberFormat("fr-FR").format(v)} €`;

function DealsPage() {
  const qc = useQueryClient();
  const { isBroker } = useAuth() as { isBroker?: boolean };
  const isMobile = useIsMobile();
  const [openId, setOpenId] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [newName, setNewName] = useState("");

  const deals = useQuery({
    queryKey: ["deals"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("deals")
        .select("*")
        .order("last_activity_at", { ascending: false, nullsFirst: false });
      if (error) throw error;
      return data;
    },
  });
  const sync = useQuery({
    queryKey: ["mail-sync-state"],
    queryFn: async () => {
      const { data } = await supabase.from("mail_sync_state").select("*");
      return data ?? [];
    },
  });

  const move = useMutation({
    mutationFn: async ({ id, stage }: { id: string; stage: string }) => {
      const { error } = await supabase.from("deals").update({ stage }).eq("id", id);
      if (error) throw error;
    },
    onMutate: ({ id, stage }) => {
      qc.setQueryData<Deal[]>(["deals"], (old) =>
        old?.map((d) => (d.id === id ? { ...d, stage } : d)),
      );
    },
    onError: (e: Error) => toast.error(e.message),
    onSettled: () => qc.invalidateQueries({ queryKey: ["deals"] }),
  });

  const create = useMutation({
    mutationFn: async (name: string) => {
      const { data, error } = await supabase.from("deals").insert({ name }).select("id").single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (id) => {
      setNewName("");
      qc.invalidateQueries({ queryKey: ["deals"] });
      setOpenId(id);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const grouped = useMemo(() => {
    const m = new Map<string, Deal[]>(STAGES.map((s) => [s, []]));
    for (const d of deals.data ?? []) (m.get(d.stage) ?? m.get("Cible")!).push(d);
    return m;
  }, [deals.data]);

  const synced = sync.data?.reduce((n, s) => n + s.messages_synced, 0) ?? 0;
  const lastSync = sync.data?.map((s) => s.last_sync_at).filter(Boolean).sort().pop() ?? null;
  const syncError = sync.data?.find((s) => s.last_error)?.last_error;

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold">Dossiers</h1>
          <p className="text-sm text-muted-foreground">
            {synced.toLocaleString("fr-FR")} emails synchronisés depuis le 1er janvier 2026 ·
            dernière synchro {fmtDate(lastSync)}
          </p>
          {syncError && <p className="text-xs text-destructive">Synchro : {syncError.slice(0, 160)}</p>}
        </div>
        {isBroker !== false && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (newName.trim()) create.mutate(newName.trim());
            }}
          >
            <Input
              placeholder="Nom du nouveau dossier"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="md:w-64"
            />
            <Button type="submit" disabled={create.isPending}>
              <Plus className="h-4 w-4" /> Créer
            </Button>
          </form>
        )}
      </div>

      <div className="flex gap-3 overflow-x-auto pb-4 max-md:flex-col max-md:overflow-visible">
        {STAGES.map((stage) => {
          const list = grouped.get(stage) ?? [];
          return (
            <div
              key={stage}
              className="flex min-w-[240px] flex-1 flex-col rounded-sm border border-border bg-card/50 md:max-w-[280px]"
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragId) move.mutate({ id: dragId, stage });
                setDragId(null);
              }}
            >
              <div className="flex items-center justify-between border-b border-border px-3 py-2">
                <span className="text-sm font-semibold">{stage}</span>
                <span className="font-mono text-xs text-muted-foreground">{list.length}</span>
              </div>
              <div className="flex flex-col gap-2 p-2">
                {list.map((d) => (
                  <div
                    key={d.id}
                    draggable={!isMobile}
                    onDragStart={() => setDragId(d.id)}
                    onClick={() => setOpenId(d.id)}
                    className="cursor-pointer rounded-sm border border-border bg-card p-3 text-sm hover:border-primary"
                  >
                    <div className="font-medium">{d.name}</div>
                    {(d.company || d.contact_name) && (
                      <div className="text-xs text-muted-foreground">
                        {[d.company, d.contact_name].filter(Boolean).join(" · ")}
                      </div>
                    )}
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>{fmtAmount(d.amount) ?? ""}</span>
                      <span>{d.last_activity_at ? fmtDate(d.last_activity_at) : ""}</span>
                    </div>
                    {isMobile && (
                      <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <Select value={d.stage} onValueChange={(s) => move.mutate({ id: d.id, stage: s })}>
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue placeholder="Changer d'étape" />
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
                    )}
                  </div>
                ))}
                {list.length === 0 && (
                  <p className="px-1 py-2 text-xs text-muted-foreground">Aucun dossier</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <Sheet open={!!openId} onOpenChange={(o) => !o && setOpenId(null)}>
        <SheetContent
          side={isMobile ? "bottom" : "right"}
          className="w-full overflow-y-auto sm:max-w-xl max-md:max-h-[90vh]"
        >
          {openId && <DealDetail id={openId} onClose={() => setOpenId(null)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function DealDetail({ id, onClose }: { id: string; onClose: () => void }) {
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
        notes: current?.notes ?? null,
        asset_id: current?.asset_id ?? null,
      })
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
  const set = (patch: Partial<Deal>) => setForm({ ...current, ...patch });

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
