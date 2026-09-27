import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { CopyEmail } from "@/components/CopyEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type Kind = "contact" | "broker";
const EMPTY = { full_name: "", company: "", email: "", phone: "", job_title: "", notes: "" };

export function DirectoryPage({ kind }: { kind: Kind }) {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const title = kind === "broker" ? "Brokers" : "Contacts";

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
    return data.filter((r) => [r.full_name, r.company, r.email, r.phone, r.job_title].some((v) => v?.toLowerCase().includes(q)));
  }, [data, search]);

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ["directory"] });
    void qc.invalidateQueries({ queryKey: ["nav-counts"] });
  };

  const add = useMutation({
    mutationFn: async () => {
      const clean = Object.fromEntries(Object.entries(form).map(([k, v]) => [k, v.trim() || null]));
      if (!clean["full_name"] && !clean["company"] && !clean["email"]) throw new Error("Indiquez au moins un nom, une société ou un email.");
      const { error } = await supabase.from("directory_contacts").insert({ ...clean, kind });
      if (error) throw new Error(error.code === "23505" ? "Cet email est déjà dans l'annuaire." : error.message);
    },
    onSuccess: () => {
      toast.success(`${kind === "broker" ? "Broker" : "Contact"} ajouté`);
      setForm(EMPTY);
      setOpen(false);
      refresh();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = async (id: string, to: Kind) => {
    const { error } = await supabase.from("directory_contacts").update({ kind: to }).eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success(`Déplacé dans ${to === "broker" ? "Brokers" : "Contacts"}`);
      refresh();
    }
  };
  const remove = async (id: string) => {
    if (!confirm("Supprimer définitivement cette fiche ?")) return;
    const { error } = await supabase.from("directory_contacts").delete().eq("id", id);
    if (error) toast.error(error.message);
    else refresh();
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="eyebrow">Annuaire</p>
          <h1 className="mt-1 text-3xl">{title}</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            {kind === "broker"
              ? "Vos confrères, pour partager dossiers et honoraires."
              : "Vos contacts professionnels qualifiés."}
          </p>
        </div>
        <Button className="min-h-11 sm:min-h-9" onClick={() => setOpen(true)}>
          <Plus className="size-4" /> Ajouter
        </Button>
      </div>

      <Input placeholder="Rechercher un nom, une société, un email…" value={search} onChange={(e) => setSearch(e.target.value)} className="w-full sm:w-80" />

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
      {!isLoading && rows.length === 0 && (
        <div className="panel p-10 text-center text-sm text-muted-foreground">
          Aucune fiche. Ajoutez-en une, ou classez des contacts depuis « À qualifier ».
        </div>
      )}

      <div className="grid gap-3">
        {rows.map((r) => (
          <div key={r.id} className="panel flex flex-col gap-3 p-4 md:flex-row md:items-start">
            <div className="min-w-0 flex-1 space-y-0.5">
              <p className="truncate font-semibold">{r.company || "—"}</p>
              <p className="truncate text-sm">{r.full_name || "—"}</p>
              <p className="truncate text-sm text-muted-foreground">{r.job_title || ""}</p>
              {r.notes && <p className="pt-1 text-xs text-muted-foreground whitespace-pre-line">{r.notes}</p>}
            </div>
            <div className="min-w-0 space-y-0.5 md:w-64">
              {r.email && (
                <p className="flex items-center gap-1 text-sm text-muted-foreground">
                  <span className="truncate">{r.email}</span>
                  <CopyEmail email={r.email} />
                </p>
              )}
              {r.phone && (
                <a href={`tel:${r.phone.replace(/\s/g, "")}`} className="text-sm text-muted-foreground underline-offset-2 hover:underline">
                  {r.phone}
                </a>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <Button variant="outline" size="sm" className="min-h-10 sm:min-h-8" onClick={() => move(r.id, kind === "broker" ? "contact" : "broker")}>
                Vers {kind === "broker" ? "Contacts" : "Brokers"}
              </Button>
              <Button variant="ghost" size="icon" aria-label="Supprimer" onClick={() => remove(r.id)}>
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nouveau {kind === "broker" ? "broker" : "contact"}</DialogTitle>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              add.mutate();
            }}
          >
            <Input placeholder="Nom complet" value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} />
            <Input placeholder="Société" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
            <Input placeholder="Fonction" value={form.job_title} onChange={(e) => setForm({ ...form, job_title: e.target.value })} />
            <Input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input type="tel" placeholder="Téléphone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            <Textarea placeholder="Notes (dossiers partagés, clé de répartition des honoraires…)" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3} />
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
