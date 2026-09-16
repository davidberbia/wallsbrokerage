import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, ChevronRight, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { CampaignDialog, type Recipient } from "@/components/CampaignDialog";
import { CopyEmail } from "@/components/CopyEmail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CfnewsPanel } from "@/components/CfnewsPanel";
import type { Asset } from "@/lib/types";

export const Route = createFileRoute("/prospects")({
  head: () => ({
    meta: [
      { title: "Prospects — Walls Brokerage CRM" },
      {
        name: "description",
        content:
          "Base de prospects par société : collaborateurs, emails, téléphones et envoi ciblé de brochures.",
      },
      { property: "og:title", content: "Prospects — Walls Brokerage CRM" },
      {
        property: "og:description",
        content: "Recherchez une société, dépliez ses collaborateurs et envoyez-leur un actif.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <ProspectsPage />
    </AppLayout>
  ),
});

type Contact = {
  id: string;
  company_id: string;
  full_name: string;
  first_name: string | null;
  job_title: string | null;
  email: string | null;
  phone: string | null;
};

type Company = {
  id: string;
  name: string;
  city: string | null;
  sector: string | null;
};

type Selected = Recipient & { company: string };

/** Découpe une ligne CSV en respectant les guillemets. */
function splitCsvLine(line: string, sep: string) {
  const out: string[] = [];
  let cur = "";
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const ch = line[i]!;
    if (quoted) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i += 1;
      } else if (ch === '"') quoted = false;
      else cur += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === sep) {
      out.push(cur.trim());
      cur = "";
    } else cur += ch;
  }
  out.push(cur.trim());
  return out;
}

const norm = (v: string) =>
  v
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z]/g, "");

function ProspectsPage() {
  const [companyQuery, setCompanyQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Selected>>({});
  const [assetId, setAssetId] = useState<string>("");
  const [importing, setImporting] = useState(false);

  const companies = useQuery({
    queryKey: ["prospect-companies", companyQuery, nameQuery],
    queryFn: async () => {
      let ids: string[] | null = null;
      if (nameQuery.trim()) {
        const { data, error } = await supabase
          .from("prospect_contacts")
          .select("company_id")
          .ilike("full_name", `%${nameQuery.trim()}%`)
          .limit(500);
        if (error) throw error;
        ids = [...new Set((data ?? []).map((r) => r.company_id))];
        if (ids.length === 0) return [] as Company[];
      }
      let q = supabase
        .from("prospect_companies")
        .select("id, name, city, sector")
        .order("name")
        .limit(200);
      if (companyQuery.trim()) q = q.ilike("name", `%${companyQuery.trim()}%`);
      if (ids) q = q.in("id", ids);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Company[];
    },
  });

  const contacts = useQuery({
    queryKey: ["prospect-contacts", open],
    enabled: Boolean(open),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("prospect_contacts")
        .select("id, company_id, full_name, first_name, job_title, email, phone")
        .eq("company_id", open!)
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Contact[];
    },
  });

  const assets = useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as Asset[];
    },
  });

  const asset = useMemo(
    () => (assets.data ?? []).find((a) => a.id === assetId) ?? null,
    [assets.data, assetId],
  );
  const recipients = useMemo(() => Object.values(selected), [selected]);

  const toggle = (contact: Contact, companyName: string) => {
    setSelected((prev) => {
      const next = { ...prev };
      if (next[contact.id]) delete next[contact.id];
      else
        next[contact.id] = {
          id: contact.id,
          email: contact.email,
          full_name: contact.full_name,
          first_name: contact.first_name,
          company: companyName,
        };
      return next;
    });
  };

  /** Lit un CSV ou un classeur Excel et renvoie les lignes brutes. */
  const readRows = async (file: File): Promise<string[][]> => {
    const isExcel = /\.(xlsx|xlsm|xlsb|xls)$/i.test(file.name);
    if (isExcel) {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const sheetName = wb.SheetNames[0];
      if (!sheetName) throw new Error("Classeur vide");
      const grid = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName]!, {
        header: 1,
        blankrows: false,
        defval: "",
        raw: false,
      });
      return grid
        .map((r) => r.map((c) => String(c ?? "").trim()))
        .filter((r) => r.some((c) => c));
    }
    const text = await file.text();
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines[0]) return [];
    const sep = (lines[0].match(/;/g)?.length ?? 0) >= (lines[0].match(/,/g)?.length ?? 0) ? ";" : ",";
    return lines.map((l) => splitCsvLine(l, sep));
  };

  const importFile = async (file: File) => {
    setImporting(true);
    try {
      const allRows = await readRows(file);
      if (allRows.length < 2) throw new Error("Fichier vide");
      const header = allRows[0]!.map(norm);
      const idx = (...keys: string[]) => header.findIndex((h) => keys.some((k) => h.includes(k)));
      const iCompany = idx("societe", "company", "entreprise");
      const iName = idx("nom", "name", "collaborateur");
      const iTitle = idx("titre", "fonction", "poste", "jobtitle");
      const iEmail = idx("mail", "email");
      const iPhone = idx("tel", "phone");
      const iCity = idx("ville", "city");
      if (iCompany < 0 || iName < 0)
        throw new Error("Colonnes « Société » et « Nom » introuvables dans le fichier.");

      const rows = allRows.slice(1);
      const companyNames = [...new Set(rows.map((r) => r[iCompany]?.trim()).filter(Boolean))] as string[];

      // Sociétés existantes
      const existing = new Map<string, string>();
      for (let i = 0; i < companyNames.length; i += 200) {
        const chunk = companyNames.slice(i, i + 200);
        const { data, error } = await supabase
          .from("prospect_companies")
          .select("id, name")
          .in("name", chunk);
        if (error) throw error;
        (data ?? []).forEach((c) => existing.set(c.name.toLowerCase(), c.id));
      }
      const toCreate = companyNames.filter((n) => !existing.has(n.toLowerCase()));
      for (let i = 0; i < toCreate.length; i += 200) {
        const chunk = toCreate.slice(i, i + 200).map((name) => {
          const row = rows.find((r) => r[iCompany]?.trim() === name);
          return { name, city: iCity >= 0 ? (row?.[iCity] ?? null) : null };
        });
        const { data, error } = await supabase.from("prospect_companies").insert(chunk).select("id, name");
        if (error) throw error;
        (data ?? []).forEach((c) => existing.set(c.name.toLowerCase(), c.id));
      }

      const contactRows = rows
        .map((r) => {
          const companyName = r[iCompany]?.trim();
          const email = iEmail >= 0 ? r[iEmail]?.trim() || null : null;
          const phone = iPhone >= 0 ? r[iPhone]?.trim() || null : null;
          // Lignes sans nom de collaborateur : on conserve quand même l'email/téléphone de la société.
          const fullName = r[iName]?.trim() || (email || phone ? "Contact général" : "");
          if (!companyName || !fullName) return null;
          const companyId = existing.get(companyName.toLowerCase());
          if (!companyId) return null;
          return {
            company_id: companyId,
            full_name: fullName,
            first_name: fullName.split(" ")[0] ?? null,
            job_title: iTitle >= 0 ? r[iTitle] || null : null,
            email,
            phone,
          };
        })
        .filter(Boolean) as Array<{
          company_id: string;
          full_name: string;
          first_name: string | null;
          job_title: string | null;
          email: string | null;
          phone: string | null;
        }>;

      let inserted = 0;
      for (let i = 0; i < contactRows.length; i += 300) {
        const chunk = contactRows.slice(i, i + 300);
        const { error } = await supabase
          .from("prospect_contacts")
          .upsert(chunk, { onConflict: "company_id,full_name", ignoreDuplicates: true });
        if (error) {
          const { error: insertError } = await supabase.from("prospect_contacts").insert(chunk);
          if (insertError) throw insertError;
        }
        inserted += chunk.length;
      }

      toast.success(`${companyNames.length} société(s) et ${inserted} collaborateur(s) importés.`);
      await companies.refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Échec de l'import");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-8 pb-40">
      <div>
        <p className="eyebrow">Prospection</p>
        <h1 className="mt-1 text-3xl">Prospects</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Recherchez une société ou un collaborateur, cochez les destinataires, puis envoyez-leur un
          actif avec le même process que pour les investisseurs.
        </p>
      </div>

      <CfnewsPanel />

      <div className="panel grid gap-4 p-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="q-company">Rechercher une société</Label>
          <Input
            id="q-company"
            value={companyQuery}
            placeholder="Nom de la société"
            onChange={(e) => setCompanyQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="q-name">Rechercher un collaborateur</Label>
          <Input
            id="q-name"
            value={nameQuery}
            placeholder="Nom du collaborateur"
            onChange={(e) => setNameQuery(e.target.value)}
          />
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="import-csv">
            Importer une base (CSV ou Excel : Société, Nom, Titre, Email, Téléphone)
          </Label>
          <div className="flex items-center gap-3">
            <Input
              id="import-csv"
              type="file"
              accept=".csv,text/csv,.xlsx,.xlsm,.xlsb,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              disabled={importing}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void importFile(f);
                e.target.value = "";
              }}
            />
            {importing && (
              <span className="inline-flex items-center gap-2 whitespace-nowrap text-sm text-muted-foreground">
                <Upload className="size-4" /> Import en cours…
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="panel divide-y divide-border/60">
        {companies.isLoading && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Chargement…</p>
        )}
        {!companies.isLoading && (companies.data ?? []).length === 0 && (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">
            Aucune société. Importez un fichier CSV pour alimenter la base.
          </p>
        )}
        {(companies.data ?? []).map((company) => {
          const isOpen = open === company.id;
          return (
            <div key={company.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-muted/40"
                onClick={() => setOpen(isOpen ? null : company.id)}
              >
                {isOpen ? (
                  <ChevronDown className="size-4 shrink-0" />
                ) : (
                  <ChevronRight className="size-4 shrink-0" />
                )}
                <Building2 className="size-4 shrink-0 text-muted-foreground" />
                <span className="font-medium">{company.name}</span>
                <span className="text-sm text-muted-foreground">
                  {[company.city, company.sector].filter(Boolean).join(" · ")}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border/60 bg-muted/20 px-4 py-2">
                  {contacts.isLoading && (
                    <p className="py-3 text-sm text-muted-foreground">Chargement…</p>
                  )}
                  {!contacts.isLoading && (contacts.data ?? []).length === 0 && (
                    <p className="py-3 text-sm text-muted-foreground">
                      Aucun collaborateur enregistré pour cette société.
                    </p>
                  )}
                  {(contacts.data ?? []).map((c) => (
                    <div
                      key={c.id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-border/40 py-2 last:border-0"
                    >
                      <div className="min-w-52 flex-1">
                        <p className="font-medium">{c.full_name}</p>
                        <p className="text-xs text-muted-foreground">{c.job_title ?? "—"}</p>
                      </div>
                      <div className="min-w-52 text-sm">
                        {c.email ? <CopyEmail email={c.email} /> : <span className="text-muted-foreground">—</span>}
                      </div>
                      <div className="min-w-32 text-sm text-muted-foreground">{c.phone ?? "—"}</div>
                      <label className="ml-auto flex cursor-pointer items-center gap-2 text-sm">
                        <Checkbox
                          checked={Boolean(selected[c.id])}
                          disabled={!c.email}
                          onCheckedChange={() => toggle(c, company.name)}
                        />
                        Envoi
                      </label>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end gap-4 px-5 py-4">
          <div className="min-w-64 flex-1 space-y-2">
            <Label>Actif à envoyer</Label>
            <Select value={assetId} onValueChange={setAssetId}>
              <SelectTrigger>
                <SelectValue placeholder="Choisir un dossier" />
              </SelectTrigger>
              <SelectContent>
                {(assets.data ?? []).map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title}
                    {a.city ? ` — ${a.city}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">
              {recipients.length} destinataire{recipients.length > 1 ? "s" : ""} sélectionné
              {recipients.length > 1 ? "s" : ""}
            </span>
            {recipients.length > 0 && (
              <Button variant="ghost" size="sm" onClick={() => setSelected({})}>
                <X className="size-4" /> Vider
              </Button>
            )}
            <CampaignDialog
              asset={asset}
              recipients={recipients}
              recipientKind="prospect"
              onLaunched={() => setSelected({})}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
