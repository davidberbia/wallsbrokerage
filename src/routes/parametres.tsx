import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  TAXONOMY_LABELS,
  useTaxonomyItems,
  type TaxonomyItem,
  type TaxonomyKind,
} from "@/lib/lists";
import {
  createViewerUser,
  deleteBackofficeUser,
  listBackofficeUsers,
} from "@/lib/admin.functions";

export const Route = createFileRoute("/parametres")({
  head: () => ({
    meta: [
      { title: "Paramètres — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Gérez les utilisateurs du back-office et les listes de référence : classes d'actifs, types d'investisseurs, pays et tranches de prix.",
      },
      { property: "og:title", content: "Paramètres — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Utilisateurs, classes d'actifs, types d'investisseurs, pays et tranches de prix.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker requireAdmin>
      <SettingsPage />
    </AppLayout>
  ),
});

const KINDS: TaxonomyKind[] = ["asset_class", "investor_profile", "country", "amount_band"];

function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <p className="eyebrow">Administration</p>
        <h1 className="mt-1 text-3xl">Paramètres</h1>
      </div>

      <Tabs defaultValue="users">
        <TabsList>
          <TabsTrigger value="users">Utilisateurs</TabsTrigger>
          <TabsTrigger value="lists">Listes de référence</TabsTrigger>
        </TabsList>
        <TabsContent value="users" className="mt-6">
          <UsersPanel />
        </TabsContent>
        <TabsContent value="lists" className="mt-6 space-y-6">
          {KINDS.map((kind) => (
            <ListPanel key={kind} kind={kind} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UsersPanel() {
  const qc = useQueryClient();
  const listUsers = useServerFn(listBackofficeUsers);
  const createUser = useServerFn(createViewerUser);
  const deleteUser = useServerFn(deleteBackofficeUser);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["backoffice_users"],
    queryFn: () => listUsers({ data: undefined }),
  });

  const create = useMutation({
    mutationFn: () => createUser({ data: { email, password } }),
    onSuccess: () => {
      setEmail("");
      setPassword("");
      qc.invalidateQueries({ queryKey: ["backoffice_users"] });
      toast.success("Utilisateur lecteur créé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (userId: string) => deleteUser({ data: { userId } }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["backoffice_users"] });
      toast.success("Utilisateur supprimé");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-6">
      <form
        className="panel space-y-4 p-5"
        onSubmit={(e) => {
          e.preventDefault();
          create.mutate();
        }}
      >
        <div>
          <h2 className="text-lg">Créer un utilisateur en lecture seule</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Ce compte pourra consulter le back-office (investisseurs, actifs, envois) sans pouvoir
            modifier ou supprimer, ni accéder aux paramètres.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <div className="space-y-2">
            <Label>Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prenom.nom@wallsbroker.com"
            />
          </div>
          <div className="space-y-2">
            <Label>Mot de passe provisoire</Label>
            <Input
              type="text"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="8 caractères minimum"
            />
          </div>
          <div className="flex items-end">
            <Button type="submit" disabled={create.isPending}>
              <Plus className="size-4" /> Créer l'utilisateur
            </Button>
          </div>
        </div>
      </form>

      <div className="panel p-5">
        <h2 className="text-lg">Comptes back-office</h2>
        {isLoading && <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>}
        <div className="mt-4 grid gap-2">
          {(data ?? []).map((u) => (
            <div
              key={u.id}
              className="flex items-center gap-3 rounded-md border border-border px-3 py-2"
            >
              <span className="flex-1 text-sm">{u.email}</span>
              <Badge variant={u.role === "broker" ? "secondary" : "outline"}>
                {u.role === "broker" ? "Administrateur" : "Lecture seule"}
              </Badge>
              {u.role === "viewer" && (
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  onClick={() => remove.mutate(u.id)}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function ListPanel({ kind }: { kind: TaxonomyKind }) {
  const qc = useQueryClient();
  const { data, isLoading } = useTaxonomyItems();
  const items = (data ?? []).filter((i) => i.kind === kind);
  const [newLabel, setNewLabel] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");

  const invalidate = () => qc.invalidateQueries({ queryKey: ["taxonomy_items"] });

  const add = useMutation({
    mutationFn: async (label: string) => {
      const { error } = await supabase.from("taxonomy_items").insert({
        kind,
        label: label.trim(),
        sort_order: (items.at(-1)?.sort_order ?? 0) + 1,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewLabel("");
      invalidate();
      toast.success("Valeur ajoutée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const rename = useMutation({
    mutationFn: async ({ id, label }: { id: string; label: string }) => {
      const { error } = await supabase
        .from("taxonomy_items")
        .update({ label: label.trim() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      setEditingId(null);
      invalidate();
      toast.success("Valeur modifiée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (item: TaxonomyItem) => {
      const { error } = await supabase.from("taxonomy_items").delete().eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast.success("Valeur supprimée");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="panel p-5">
      <h2 className="text-lg">{TAXONOMY_LABELS[kind]}</h2>
      {isLoading && <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>}
      <div className="mt-4 grid gap-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2 rounded-md border border-border px-3 py-2"
          >
            {editingId === item.id ? (
              <>
                <Input
                  className="h-8 flex-1"
                  value={editingLabel}
                  onChange={(e) => setEditingLabel(e.target.value)}
                />
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Enregistrer"
                  onClick={() => rename.mutate({ id: item.id, label: editingLabel })}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Annuler"
                  onClick={() => setEditingId(null)}
                >
                  <X className="size-4" />
                </Button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  className="flex-1 text-left text-sm"
                  onClick={() => {
                    setEditingId(item.id);
                    setEditingLabel(item.label);
                  }}
                >
                  {item.label}
                </button>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer"
                  onClick={() => remove.mutate(item)}
                >
                  <Trash2 className="size-4" />
                </Button>
              </>
            )}
          </div>
        ))}
      </div>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (newLabel.trim()) add.mutate(newLabel);
        }}
      >
        <Input
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          placeholder={`Ajouter — ${TAXONOMY_LABELS[kind].toLowerCase()}`}
        />
        <Button type="submit" disabled={add.isPending}>
          <Plus className="size-4" /> Ajouter
        </Button>
      </form>
    </div>
  );
}
