import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { CompactRow, RecordDialog } from "@/components/CompactRow";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { templateToHtml } from "@/lib/mandate-template";

export type MandateTemplate = {
  id: string;
  kind: string;
  exclusive: boolean;
  title: string;
  body: string;
  file_path: string | null;
  file_name: string | null;
  compliance_notes: string | null;
  sort_order: number;
};

export function useMandateTemplates() {
  return useQuery({
    queryKey: ["mandate-templates"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("mandate_templates")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as MandateTemplate[];
    },
  });
}

const slug = (s: string) => s.normalize("NFD").replace(/[^\w]+/g, "_").replace(/_+/g, "_");

export function downloadWord(body: string, title: string) {
  const blob = new Blob(["\ufeff" + templateToHtml(body, title)], { type: "application/msword" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${slug(title)}.doc`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

export function printPdf(body: string, title: string) {
  const w = window.open("", "_blank");
  if (!w) return void toast.error("Autorisez l'ouverture de fenêtres pour le PDF");
  w.document.write(templateToHtml(body, title));
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}

export function MandateTemplatesPanel() {
  const qc = useQueryClient();
  const { data: list } = useMandateTemplates();
  const [edit, setEdit] = useState<MandateTemplate | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const refresh = () => qc.invalidateQueries({ queryKey: ["mandate-templates"] });

  const save = async () => {
    if (!edit) return;
    setBusy(true);
    const { error } = await supabase
      .from("mandate_templates")
      .update({ title: edit.title, body: edit.body })
      .eq("id", edit.id);
    setBusy(false);
    if (error) return void toast.error(error.message);
    toast.success("Modèle enregistré");
    setEdit(null);
    void refresh();
  };

  const remove = async (t: MandateTemplate) => {
    const { error } = await supabase.from("mandate_templates").delete().eq("id", t.id);
    if (error) return void toast.error(error.message);
    if (t.file_path) await supabase.storage.from("mandate-templates").remove([t.file_path]);
    void refresh();
  };

  const replace = async (file: File) => {
    if (!edit) return;
    setBusy(true);
    try {
      const path = `${edit.id}/${Date.now()}_${slug(file.name)}`;
      const up = await supabase.storage.from("mandate-templates").upload(path, file);
      if (up.error) throw up.error;
      const patch: Partial<MandateTemplate> = { file_path: path, file_name: file.name };
      if (/\.(txt|md)$/i.test(file.name)) patch.body = await file.text();
      const { error } = await supabase.from("mandate_templates").update(patch).eq("id", edit.id);
      if (error) throw error;
      if (edit.file_path) await supabase.storage.from("mandate-templates").remove([edit.file_path]);
      setEdit({ ...edit, ...patch });
      toast.success("Fichier de remplacement enregistré");
      void refresh();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };

  const openFile = async (t: MandateTemplate) => {
    if (!t.file_path) return;
    const { data, error } = await supabase.storage
      .from("mandate-templates")
      .createSignedUrl(t.file_path, 300);
    if (error) return void toast.error(error.message);
    window.open(data.signedUrl, "_blank");
  };

  const add = async () => {
    const { data, error } = await supabase
      .from("mandate_templates")
      .insert({ kind: "autre", title: "Nouveau modèle", body: "# TITRE\n\n", sort_order: 99 })
      .select("*")
      .single();
    if (error) return void toast.error(error.message);
    void refresh();
    setEdit(data as MandateTemplate);
  };

  return (
    <section className="panel p-4 sm:p-6 space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl">Modèles de mandats</h2>
        <Button variant="outline" className="ml-auto min-h-11" onClick={() => void add()}>
          Ajouter
        </Button>
      </div>
      <p className="text-sm text-muted-foreground">
        Les champs entre accolades, comme {"{{prix}}"}, sont remplis à la création du mandat.
      </p>
      <div className="overflow-hidden border-y border-border">
        {(list ?? []).map((t) => (
          <CompactRow
            key={t.id}
            title={t.title}
            subtitle={t.file_name ? `Fichier : ${t.file_name}` : "Modèle texte"}
            onOpen={() => setEdit(t)}
            onEdit={() => setEdit(t)}
            onDelete={() => void remove(t)}
          />
        ))}
      </div>
      <RecordDialog title={edit?.title ?? "Modèle"} open={!!edit} onClose={() => setEdit(null)}>
        {edit && (
          <div className="space-y-3">
            {edit.compliance_notes && (
              <p className="rounded-md bg-muted p-3 text-sm">{edit.compliance_notes}</p>
            )}
            <Label>Titre</Label>
            <Input value={edit.title} onChange={(e) => setEdit({ ...edit, title: e.target.value })} />
            <Label>Texte du mandat</Label>
            <Textarea
              className="min-h-[50vh] font-mono text-xs"
              value={edit.body}
              onChange={(e) => setEdit({ ...edit, body: e.target.value })}
            />
            <div className="grid grid-cols-2 gap-2">
              <Button className="min-h-11" onClick={() => void save()} disabled={busy}>
                Enregistrer
              </Button>
              <Button variant="outline" className="min-h-11" onClick={() => downloadWord(edit.body, edit.title)}>
                Export Word
              </Button>
              <Button variant="outline" className="min-h-11" onClick={() => printPdf(edit.body, edit.title)}>
                Export PDF
              </Button>
              <Button variant="outline" className="min-h-11" onClick={() => fileRef.current?.click()} disabled={busy}>
                Remplacer par un fichier
              </Button>
              {edit.file_path && (
                <Button variant="outline" className="col-span-2 min-h-11" onClick={() => void openFile(edit)}>
                  Ouvrir {edit.file_name}
                </Button>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept=".doc,.docx,.pdf,.txt,.md"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void replace(f);
                e.target.value = "";
              }}
            />
          </div>
        )}
      </RecordDialog>
    </section>
  );
}
