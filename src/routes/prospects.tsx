import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Copy,
  MapPin,
  SlidersHorizontal,
  Upload,
  X,
} from "lucide-react";
import type { BandsByAsset } from "@/components/AssetClassBands";
import {
  StrategyMatrixDialog,
  type StrategiesByAsset,
} from "@/components/StrategyMatrixDialog";
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
import { useLists } from "@/lib/lists";
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
  address: string | null;
  asset_classes: string[] | null;
  regions: string[] | null;
  bands: BandsByAsset | null;
  strategies_by_asset: StrategiesByAsset | null;
  investor_profile: string | null;
  converted_investor_id: string | null;
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

/**
 * Correspondance entre les « types d'actifs » génériques importés (CFNews, Excel)
 * et les classes d'actifs de la taxonomie, pour pré-cocher la matrice de stratégie.
 */
const ASSET_CLASS_ALIASES: Record<string, string> = {
  bureaux: "Immeubles de bureaux",
  commerce: "Murs de commerces de pied d'immeuble",
  commerces: "Murs de commerces de pied d'immeuble",
  retail: "Murs de commerces de pied d'immeuble",
  hotellerie: "City Hôtel (sans fonds)",
  hotel: "City Hôtel (sans fonds)",
  hotels: "City Hôtel (sans fonds)",
  logement: "Immeubles de logements ou mixtes",
  residentiel: "Immeubles de logements ou mixtes",
  logistiqueindustriel: "Logistique",
  industriel: "Logistique",
  sante: "Santé",
  activite: "Activité",
};

/** Traduit les types d'actifs stockés en classes de la taxonomie (dédupliquées). */
function toTaxonomyClasses(stored: string[], taxonomy: readonly string[]): string[] {
  const out: string[] = [];
  for (const value of stored) {
    const exact = taxonomy.find((t) => t === value);
    const aliased = ASSET_CLASS_ALIASES[norm(value)];
    const fuzzy = taxonomy.find((t) => {
      const n = norm(t);
      const v = norm(value);
      return v.length >= 4 && (n.includes(v) || v.includes(n));
    });
    const match = exact ?? aliased ?? fuzzy ?? null;
    if (match && !out.includes(match)) out.push(match);
  }
  return out;
}

function ProspectsPage() {
  const [companyQuery, setCompanyQuery] = useState("");
  const [nameQuery, setNameQuery] = useState("");
  const [cityQuery, setCityQuery] = useState("");
  const [emailFilter, setEmailFilter] = useState<"tous" | "avec" | "sans">("tous");
  const [profileFilter, setProfileFilter] = useState<string>("tous");
  const [sort, setSort] = useState<"name" | "city">("name");
  const [open, setOpen] = useState<string | null>(null);
  const [selected, setSelected] = useState<Record<string, Selected>>({});
  const [assetId, setAssetId] = useState<string>("");
  const [importing, setImporting] = useState(false);
  const qc = useQueryClient();
  const [address, setAddress] = useState("");
  const [profile, setProfile] = useState("");
  const [strategyOpen, setStrategyOpen] = useState(false);
  const [matrix, setMatrix] = useState<{
    assetClasses: string[];
    bands: BandsByAsset;
    strategiesByAsset: StrategiesByAsset;
    regions: string[];
  }>({ assetClasses: [], bands: {}, strategiesByAsset: {}, regions: [] });

  const { investorProfiles, assetClasses: taxonomyClasses } = useLists();

  const companies = useQuery({
    queryKey: ["prospect-companies", companyQuery, nameQuery, cityQuery, emailFilter, profileFilter, sort],
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

      // Sociétés ayant au moins un collaborateur avec une adresse email.
      let withEmailIds: string[] = [];
      if (emailFilter !== "tous") {
        const { data, error } = await supabase
          .from("prospect_contacts")
          .select("company_id")
          .not("email", "is", null)
          .limit(10000);
        if (error) throw error;
        withEmailIds = [...new Set((data ?? []).map((r) => r.company_id))];
        if (emailFilter === "avec" && withEmailIds.length === 0) return [] as Company[];
      }

      let q = supabase
        .from("prospect_companies")
        .select(
          "id, name, city, sector, address, asset_classes, regions, bands, strategies_by_asset, investor_profile, converted_investor_id",
        )
        .is("converted_investor_id", null)
        .limit(1000);
      if (companyQuery.trim()) q = q.ilike("name", `%${companyQuery.trim()}%`);
      if (cityQuery.trim()) {
        // Les virgules cassent le filtre combiné : on les remplace par des espaces.
        const v = `%${cityQuery.trim().replace(/,/g, " ")}%`;
        q = q.or(`city.ilike.${v},address.ilike.${v}`);
      }
      if (ids) q = q.in("id", ids);
      if (profileFilter === "sans_profil") q = q.is("investor_profile", null);
      else if (profileFilter !== "tous") q = q.eq("investor_profile", profileFilter);
      if (sort === "city") q = q.order("city", { ascending: true, nullsFirst: false }).order("name");
      else q = q.order("name");
      const { data, error } = await q;
      if (error) throw error;
      let rows = (data ?? []) as Company[];
      if (emailFilter === "avec") rows = rows.filter((c) => withEmailIds.includes(c.id));
      else if (emailFilter === "sans" && withEmailIds.length > 0)
        rows = rows.filter((c) => !withEmailIds.includes(c.id));
      return rows;
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

  const openCompany = useMemo(
    () => (companies.data ?? []).find((c) => c.id === open) ?? null,
    [companies.data, open],
  );

  // Charge l'adresse et la stratégie de la société dépliée.
  // Les « types d'actifs » génériques sont pré-cochés dans la matrice via leur
  // correspondance taxonomie ; les classes déjà enregistrées dans la stratégie
  // (clés de bands / strategies_by_asset) sont conservées.
  useEffect(() => {
    if (!openCompany) return;
    setAddress(openCompany.address ?? "");
    setProfile(openCompany.investor_profile ?? "");
    const bands = openCompany.bands ?? {};
    const strategiesByAsset = openCompany.strategies_by_asset ?? {};
    const known = [
      ...toTaxonomyClasses(openCompany.asset_classes ?? [], taxonomyClasses),
      ...Object.keys(bands),
      ...Object.keys(strategiesByAsset),
    ];
    setMatrix({
      assetClasses: [...new Set(known)],
      bands,
      strategiesByAsset,
      regions: openCompany.regions ?? [],
    });
  }, [openCompany, taxonomyClasses]);

  const companyEmails = useMemo(
    () => (contacts.data ?? []).map((c) => c.email).filter(Boolean) as string[],
    [contacts.data],
  );

  const hasStrategy =
    matrix.assetClasses.length > 0 &&
    Object.values(matrix.strategiesByAsset).some((s) => (s ?? []).length > 0);

  /** Enregistre adresse + stratégie, puis bascule le prospect en investisseur si possible. */
  const saveCompany = useMutation({
    mutationFn: async () => {
      const company = openCompany;
      if (!company) throw new Error("Société introuvable");
      const list = contacts.data ?? [];
      const withEmail = list.filter((c) => c.email);
      const strategies = [...new Set(Object.values(matrix.strategiesByAsset).flat())];

      const { error: upError } = await supabase
        .from("prospect_companies")
        .update({
          address: address.trim() || null,
          investor_profile: profile || null,
          asset_classes: matrix.assetClasses,
          regions: matrix.regions,
          bands: matrix.bands,
          strategies_by_asset: matrix.strategiesByAsset,
        })
        .eq("id", company.id);
      if (upError) throw upError;

      const ready =
        matrix.assetClasses.length > 0 &&
        Object.values(matrix.strategiesByAsset).some((s) => (s ?? []).length > 0) &&
        withEmail.length > 0;
      if (!ready) return { converted: false as const };

      const primary = withEmail[0]!;
      const notes = list
        .map((c) =>
          [c.full_name, c.job_title, c.email, c.phone].filter(Boolean).join(" — "),
        )
        .join("\n");

      const { data: investor, error: invError } = await supabase
        .from("investors")
        .insert({
          full_name: primary.full_name,
          first_name: primary.first_name,
          job_title: primary.job_title,
          company: company.name,
          email: primary.email,
          phone: primary.phone,
          address: address.trim() || null,
          city: company.city,
          investor_profile: profile || null,
          asset_classes: matrix.assetClasses,
          strategies,
          regions: matrix.regions,
          status: "à qualifier",
          notes,
        })
        .select("id")
        .single();
      if (invError) throw invError;

      if (matrix.assetClasses.length > 0) {
        const rows = matrix.assetClasses.map((assetClass) => ({
          investor_id: investor.id,
          asset_class: assetClass,
          strategies: matrix.strategiesByAsset[assetClass] ?? [],
          amount_bands: matrix.bands[assetClass] ?? [],
          regions: matrix.regions,
        }));
        const { error: critError } = await supabase.from("investor_criteria").insert(rows);
        if (critError) throw critError;
      }

      const { error: markError } = await supabase
        .from("prospect_companies")
        .update({ converted_investor_id: investor.id, converted_at: new Date().toISOString() })
        .eq("id", company.id);
      if (markError) throw markError;

      return { converted: true as const };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["prospect-companies"] });
      qc.invalidateQueries({ queryKey: ["investors"] });
      qc.invalidateQueries({ queryKey: ["investor-criteria"] });
      if (res.converted) {
        setOpen(null);
        toast.success("Prospect basculé dans l'onglet Investisseurs");
      } else {
        toast.success("Fiche enregistrée");
      }
    },
    onError: (e: Error) => toast.error(e.message),
  });

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
    <div className="space-y-8 pb-10">
      <div>
        <p className="eyebrow">Prospection</p>
        <h1 className="mt-1 text-3xl">Prospects</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Recherchez une société ou un collaborateur, cochez les destinataires, puis envoyez-leur un
          actif avec le même process que pour les investisseurs.
        </p>
      </div>

      <CfnewsPanel />

      <div className="panel space-y-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="q-company">Société</Label>
            <Input
              id="q-company"
              value={companyQuery}
              placeholder="Nom de la société"
              onChange={(e) => setCompanyQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-name">Collaborateur</Label>
            <Input
              id="q-name"
              value={nameQuery}
              placeholder="Nom du collaborateur"
              onChange={(e) => setNameQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="q-city">Ville</Label>
            <Input
              id="q-city"
              value={cityQuery}
              placeholder="Ville ou adresse"
              onChange={(e) => setCityQuery(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Select
              value={emailFilter}
              onValueChange={(v) => setEmailFilter(v as "tous" | "avec" | "sans")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Tous les prospects</SelectItem>
                <SelectItem value="avec">Avec email</SelectItem>
                <SelectItem value="sans">Sans email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Catégorie d'investisseur</Label>
            <Select value={profileFilter} onValueChange={setProfileFilter}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="tous">Toutes les catégories</SelectItem>
                <SelectItem value="sans_profil">Sans catégorie</SelectItem>
                {investorProfiles.map((p) => (
                  <SelectItem key={p} value={p}>
                    {p}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Trier par</Label>
            <Select value={sort} onValueChange={(v) => setSort(v as "name" | "city")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Nom</SelectItem>
                <SelectItem value="city">Ville</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex flex-wrap items-end gap-4 border-t border-border/60 pt-4">
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

        <div className="space-y-2">
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
                <span className="truncate text-sm text-muted-foreground">
                  {[company.address ?? company.city, company.investor_profile, company.sector]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </button>

              {isOpen && (
                <div className="border-t border-border/60 bg-muted/20 px-4 py-2">
                  <div className="grid gap-3 border-b border-border/40 py-3 sm:grid-cols-[1fr_auto] sm:items-end">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor={`address-${company.id}`} className="flex items-center gap-2">
                          <MapPin className="size-4 text-muted-foreground" /> Adresse
                        </Label>
                        <Input
                          id={`address-${company.id}`}
                          value={address}
                          placeholder="Adresse de la société"
                          onChange={(e) => setAddress(e.target.value)}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Catégorie d'investisseur</Label>
                        <Select
                          value={profile || "none"}
                          onValueChange={(v) => setProfile(v === "none" ? "" : v)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="—" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">—</SelectItem>
                            {investorProfiles.map((p) => (
                              <SelectItem key={p} value={p}>
                                {p}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button type="button" variant="outline" onClick={() => setStrategyOpen(true)}>
                        <SlidersHorizontal className="size-4" /> Stratégie
                      </Button>
                      <Button
                        type="button"
                        disabled={saveCompany.isPending}
                        onClick={() => saveCompany.mutate()}
                      >
                        {saveCompany.isPending ? "Enregistrement…" : "Enregistrer"}
                      </Button>
                      {companyEmails.length > 0 && (
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={async () => {
                            await navigator.clipboard.writeText(companyEmails.join("; "));
                            toast.success(`${companyEmails.length} adresse(s) copiée(s)`);
                          }}
                        >
                          <Copy className="size-4" /> Copier les emails
                        </Button>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground sm:col-span-2">
                      {hasStrategy
                        ? companyEmails.length > 0
                          ? "Stratégie renseignée et email disponible : à l'enregistrement, ce prospect passe dans l'onglet Investisseurs."
                          : "Stratégie renseignée, mais aucun email sur la fiche : le prospect reste ici."
                        : "Complétez la stratégie et ajoutez au moins un email pour basculer ce prospect dans les investisseurs."}
                    </p>
                  </div>
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
                      <div className="flex min-w-64 items-center gap-1 text-sm">
                        {c.email ? (
                          <>
                            <span className="truncate" title={c.email}>
                              {c.email}
                            </span>
                            <CopyEmail email={c.email} />
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
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

      <StrategyMatrixDialog
        open={strategyOpen}
        onOpenChange={setStrategyOpen}
        value={matrix}
        onChange={setMatrix}
      />
    </div>
  );
}
