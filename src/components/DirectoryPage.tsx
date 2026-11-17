import { CompactRow, RecordDialog, RecordFacts } from "@/components/CompactRow";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2, Pencil } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CopyEmail } from "@/components/CopyEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type Kind = "broker" | "notary" | "utile";
const LABELS: Record<Kind, { plural: string; one: string; desc: string }> = {
  broker: {
    plural: "Brokers",
    one: "broker",
    desc: "Vos confrères, pour partager dossiers et honoraires.",
  },
  utile: { plural: "Utile", one: "contact utile", desc: "Diagnostiqueurs et autres contacts utiles." },
  notary: { plural: "Notaires", one: "notaire", desc: "Vos notaires partenaires." },
};
const EMPTY = { full_name: "", company: "", email: "", phone: "", job_title: "", notes: "" };

export function DirectoryPage({ kind }: { kind: Kind }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const title = LABELS[kind].plural;

  const { data = [], isLoading } = useQuery({
    queryKey: ["directory", kind],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("directory_contacts")
        .select("*")
        .eq("kind", kind)
        .order("company", { ascending: true, nullsFirst: false })
        .limit(5000);
      if (error) throw error;
      return data;
    },
  });

  const rows = useMemo(() => {
    const q = search.toLowerCase().trim();
    if (!q) return data;
    return data.filter((r) =>
      [r.full_name, r.company, r.email, r.phone, r.job_title].some((v) =>
        v?.toLowerCase().includes(q),
      ),
    );
  }, [data, search]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["directory"] });
    void qc.invalidateQueries({ queryKey: ["nav-counts"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const clean = {
        full_name: form.full_name.trim() || null,
        company: form.company.trim() || null,
        email: form.email.trim() || null,
        phone: form.phone.trim() || null,
        job_title: form.job_title.trim() || null,
        notes: form.notes.trim() || null,
      };
      if (!clean["full_name"] && !clean["company"] && !clean["email"])
        throw new Error("Indiquez au moins un nom, une société ou un email.");
      const { error } = editingId
        ? await supabase.from("directory_contacts").update(clean).eq("id", editingId)
        : await supabase.from("directory_contacts").insert({ ...clean, kind });
      if (error)
        throw new Error(
          error.code === "23505" ? "Cet email est déjà dans l'annuaire." : error.message,
        );
    },
    onSuccess: () => {
      toast.success(`${LABELS[kind].plural} : fiche ajoutée`);
      setForm(EMPTY);
      setEditingId(null);
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = async (id: string, to: Kind) => {
    const { error } = await supabase.from("directory_contacts").update({ kind: to }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Déplacé dans ${LABELS[to].plural}`);
      refresh();
    }
  };
  const remove = async (id: string) => {
    const { error } = await supabase.from("directory_contacts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  const detail = data.find((r) => r.id === detailId);
  const edit = (r: (typeof data)[number]) => {
    setEditingId(r.id);
    setForm({
      full_name: r.full_name ?? "",
      company: r.company ?? "",
      email: r.email ?? "",
      phone: r.phone ?? "",
      job_title: r.job_title ?? "",
      notes: r.notes ?? "",
    });
    setDetailId(null);
    setOpen(true);
  };
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Annuaire</p>
          <h1 className="mt-1 text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{LABELS[kind].desc}</p>
        </div>
        <Button
          className="min-h-11 sm:min-h-9"
          onClick={() => {
            setForm(EMPTY);
            setEditingId(null);
            setOpen(true);
          }}
        >
          <Plus className="size-4" /> Ajouter
        </Button>
      </div>

      <Input
        placeholder="Rechercher un nom, une société, un email…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full sm:w-80"
      />

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && rows.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Aucune fiche. Ajoutez-en une, ou classez des contacts depuis « À qualifier ».
        </div>
      )}

      <div className="overflow-hidden border-y border-border">
        {rows.map((r) => (
          <CompactRow
            key={r.id}
            title={[r.company, r.full_name || r.email].filter(Boolean).join(" · ")}
            subtitle={[r.email, r.phone, r.job_title].filter(Boolean).join(" · ")}
            onOpen={() => setDetailId(r.id)}
            onEdit={() => edit(r)}
            onDelete={() => void remove(r.id)}
          />
        ))}
      </div>
      <RecordDialog
        title={detail?.full_name || detail?.company || "Contact"}
        open={!!detail}
        onClose={() => setDetailId(null)}
      >
        {detail && (
          <>
            <Button onClick={() => edit(detail)}>
              <Pencil className="size-4" /> Modifier
            </Button>
            <RecordFacts
              facts={[
                ["Nom", detail.full_name],
                ["Société", detail.company],
                ["Fonction", detail.job_title],
                [
                  "Email",
                  <span className="flex items-center gap-1 break-all">
                    {detail.email}
                    <CopyEmail email={detail.email} />
                  </span>,
                ],
                [
                  "Téléphone",
                  detail.phone ? <a href={`tel:${detail.phone}`}>{detail.phone}</a> : null,
                ],
                ["Notes", detail.notes],
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button variant="outline" onClick={async () => {const company = window.prompt("Société du prospect",detail.company || "");if(!company?.trim())return;const {error}=await supabase.rpc("directory_to_prospect",{_id:detail.id,_company:company});if(error)toast.error(error.message);else {toast.success("Déplacé dans Prospects");setDetailId(null);refresh();void qc.invalidateQueries({queryKey:["prospects"]});}}}>Vers Prospects</Button>
              {(Object.keys(LABELS) as Kind[])
                .filter((k) => k !== kind)
                .map((k) => (
                  <Button
                    key={k}
                    variant="outline"
                    onClick={() => {
                      void move(detail.id, k);
                      setDetailId(null);
                    }}
                  >
                    Vers {LABELS[k].plural}
                  </Button>
                ))}
            </div>
          </>
        )}
      </RecordDialog>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Modifier la fiche" : "Nouvelle fiche"} — {LABELS[kind].one}
            </DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <Input
              placeholder="Nom complet"
              value={form.full_name}
              onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            />
            <Input
              placeholder="Société"
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <Input
              placeholder="Fonction"
              value={form.job_title}
              onChange={(e) => setForm({ ...form, job_title: e.target.value })}
            />
            <Input
              type="email"
              placeholder="Email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <Input
              type="tel"
              placeholder="Téléphone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
            <Textarea
              placeholder="Notes (dossiers partagés, clé de répartition des honoraires…)"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={3}
            />
            <DialogFooter>
              <Button type="submit" className="min-h-11 w-full sm:w-auto" disabled={add.isPending}>
                {add.isPending ? "Enregistrement…" : "Enregistrer"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
