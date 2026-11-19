import { CompactRow, RecordDialog, RecordFacts } from "@/components/CompactRow";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Download, PenLine, RefreshCw } from "lucide-react";
import { useMandateTemplates, downloadWord, printPdf } from "@/components/MandateTemplatesPanel";
import { addOneYear, fillTemplate, templateFields, feeText, feeChargeText, templateToHtml, withSignatures, templateKind } from "@/lib/mandate-template";
import { mandantText, type OwnerDetails } from "@/lib/siren";
import { assetKindLabel } from "@/lib/taxonomy";
import { RESIDENTIAL_LABELS } from "@/components/ResidentialFields";
import type { PortfolioLot } from "@/lib/types";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { refreshMandateSignatures, prepareMandateSignature, sendPreparedMandate } from "@/lib/docusign.functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/mandats")({
  validateSearch: (s: Record<string, unknown>): { sign?: string } => (typeof s["sign"] === "string" ? { sign: s["sign"] } : {}),
  head: () => ({
    meta: [
      { title: "Registre des mandats — Wallsbrokerage CRM" },
      { name: "description", content: "Registre numéroté des mandats de vente et de location." },
      { property: "og:title", content: "Registre des mandats — Wallsbrokerage CRM" },
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
          "id, asset_id, number, number_suffix, status, asset_title, signature_status, agent_id, address, signed_at, expires_at, start_date, assets(title, city, address, postal_code, owner_name, owner_email, owner_kind, owner_details, mandate_exclusive, mandate_type, transaction_type, fee_mode, fee_value, fee_payer, mandate_start, mandate_end, asset_class, asset_subclass, surface, weighted_surface, outdoor_surface, parking_count, is_portfolio, portfolio_lots, price, rent, residential_details)",
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
    const place = splitPlace(m.address ?? a?.address ?? m.asset_title ?? "", a?.city ?? "", a?.postal_code ?? "");
    const expired =
      a?.mandate_end && new Date(a.mandate_end).getTime() < Date.now() && m.status !== "signé";
    return {
      id: m.id,
      number: m.number,
      label: `${m.number}${m.number_suffix ? ` ${m.number_suffix}` : ""}`,
      title: a?.title ?? m.asset_title ?? "—",
      city: a?.city ?? "",
      owner: a?.owner_name ?? "—",
      ownerEmail: a?.owner_email ?? "",
      tplType: a?.mandate_type ?? a?.transaction_type ?? "",
      tplExclusive: a?.mandate_exclusive ?? null,
      mandant: a?.owner_name ? mandantText(a.owner_kind, a.owner_name, (a.owner_details ?? {}) as OwnerDetails) : "",
      mandantAddress: String((a?.owner_details as OwnerDetails | null)?.address ?? ""),
      exclusive:
        a?.mandate_exclusive == null ? "—" : a.mandate_exclusive ? "Exclusif" : "Non exclusif",
      type: a?.mandate_type ?? a?.transaction_type ?? "—",
      street: place.street,
      town: place.town,
      begin: fmt(m.start_date ?? a?.mandate_start ?? null),
      start: fmt(m.signed_at),
      end: fmt(m.expires_at ?? a?.mandate_end ?? null),
      address: m.address ?? "",
      agentId: m.agent_id,
      status: expired ? "expiré" : m.status,
      sig: m.signature_status,
      designation: designationText(a),
      etat: a?.is_portfolio ? etatLocatif((a.portfolio_lots ?? []) as PortfolioLot[]) : "",
      situation: a?.is_portfolio ? "voir l'état locatif ci-dessus" : a?.rent ? `loué, loyer annuel ${Number(a.rent).toLocaleString("fr-FR")} € HT HC` : String(((a?.residential_details ?? {}) as Record<string, unknown>)["occupancy"] ?? "") || "libre de toute occupation",
      price: a?.price ? `${Number(a.price).toLocaleString("fr-FR")} €` : "",
      fees: feeText(a?.fee_mode, a?.fee_value),
      feeCharge: feeChargeText(a?.fee_payer),
      assetId: a ? (m as { asset_id?: string }).asset_id ?? null : null,
      raw: {
        address: m.address ?? [a?.address, a?.postal_code, a?.city].filter(Boolean).join(" ") ?? "",
        owner: a?.owner_name ?? "",
        exclusive: a?.mandate_exclusive ?? null,
        type: a?.mandate_type ?? "",
        begin: (m.start_date ?? a?.mandate_start ?? "")?.slice(0, 10) ?? "",
        signed: m.signed_at?.slice(0, 10) ?? "",
        end: (m.expires_at ?? a?.mandate_end ?? "")?.slice(0, 10) ?? "",
        feeMode: a?.fee_mode ?? "pct",
        feeValue: a?.fee_value != null ? String(a.fee_value) : "",
        feePayer: a?.fee_payer ?? "",
      },
    };
  });

  const setStatus = async (id: string, status: string) => {
    const { error } = await supabase
      .from("mandates")
      .update({ status })
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    await qc.invalidateQueries({ queryKey: ["mandates"] });
  };

  const [detailId, setDetailId] = useState<string | null>(null);
  const detail = rows.find((r) => r.id === detailId);
  const [target, setTarget] = useState<(typeof rows)[number] | null>(null);
  const [renewing, setRenewing] = useState(false);
  const refresh = useServerFn(refreshMandateSignatures);
  const [syncing, setSyncing] = useState(false);
  const sync = async (quiet = false) => {
    setSyncing(true);
    try {
      const r = await refresh();
      if (!quiet || r.updated) toast.success(`${r.updated} mandat(s) mis à jour`);
      await qc.invalidateQueries({ queryKey: ["mandates"] });
    } catch (e) {
      if (!quiet) toast.error((e as Error).message);
    }
    setSyncing(false);
  };
  // Statuts DocuSign relus à l'ouverture puis toutes les 2 minutes.
  useEffect(() => {
    void sync(true);
    const t = setInterval(() => void sync(true), 120_000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const { sign } = Route.useSearch();
  const navigate = Route.useNavigate();
  useEffect(() => {
    if (!sign) return;
    const r = rows.find((x) => x.assetId === sign);
    if (r) { setDetailId(r.id); void navigate({ search: {}, replace: true }); }
  }, [sign, rows, navigate]);

  const exportXlsx = async () => {
    const XLSX = await import("xlsx");
    const ws = XLSX.utils.json_to_sheet(
      rows.map((r) => ({
        "N°": r.label,
        Adresse: r.street,
        Ville: r.town,
        Agent: agentName(r.agentId),
        Propriétaire: r.owner,
        Exclusivité: r.exclusive,
        Type: r.type,
        "Début mandat": r.begin,
        "Signature mandat": r.start,
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
            title={`N° ${r.label} · ${r.street}${r.town ? `, ${r.town}` : ""}`}
            subtitle={[
              `Début ${r.begin}`,
              `Signature ${r.start}`,
              `Fin ${r.end}`,
              agentName(r.agentId),
            ].join(" · ")}
            summary={`Début ${r.begin} · Signature ${r.start}`}
            onOpen={() => setDetailId(r.id)}
            onEdit={() => setDetailId(r.id)}
            tone={r.sig === "completed" || r.start !== "—" ? "success" : "danger"}
          />
        ))}
      </div>
      <RecordDialog
        title={detail ? `Mandat n° ${detail.label}` : "Mandat"}
        open={!!detail}
        onClose={() => setDetailId(null)}
      >
        {detail && (
          <>
            <MandateEditor key={detail.id} row={detail} onSaved={() => { void qc.invalidateQueries({ queryKey: ["mandates"] }); setDetailId(null); }} />
            {detail.sig && <p className="text-sm text-muted-foreground">Signature : {SIG[detail.sig] ?? detail.sig}</p>}
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
              disabled={renewing}
              onClick={() => {
                if (detail.assetId && (!detail.fees || !detail.feeCharge)) {
                  toast.error("Renseignez les honoraires et qui les paie avant l'envoi en signature.");
                  return;
                }
                // Mandat signé : on crée un nouveau mandat (nouveau numéro), l'ancien reste intact au registre.
                if (detail.sig === "completed") {
                  if (!confirm("Ce mandat est déjà signé. Un nouveau mandat avec un nouveau numéro sera créé, l'ancien restera au registre. Continuer ?")) return;
                  void (async () => {
                    setRenewing(true);
                    try {
                      const { data: created, error } = await supabase.from("mandates")
                        .insert({ asset_id: detail.assetId, asset_title: detail.title, agent_id: detail.agentId })
                        .select("id, number, number_suffix").single();
                      if (error) throw error;
                      setTarget({ ...detail, id: created.id, number: created.number, label: `${created.number}${created.number_suffix ? ` ${created.number_suffix}` : ""}`, sig: null, status: "brouillon", start: "—" });
                      setDetailId(null);
                      void qc.invalidateQueries({ queryKey: ["mandates"] });
                    } catch (e) {
                      toast.error((e as Error).message);
                    }
                    setRenewing(false);
                  })();
                  return;
                }
                // Mandat non signé : même numéro conservé, l'enveloppe en cours sera annulée chez DocuSign.
                if (detail.sig && detail.sig !== "prêt à envoyer" && !confirm("Le mandat en cours de signature sera annulé et remplacé (même numéro). Continuer ?")) return;
                setTarget(detail);
                setDetailId(null);
              }}
            >
              <PenLine className="size-4" /> {renewing ? "Création…" : detail.sig === "completed" ? "Nouveau mandat (nouveau numéro)" : detail.sig && detail.sig !== "prêt à envoyer" ? "Renvoyer un nouveau mandat" : "Envoyer en signature"}
            </Button>
          </>
        )}
      </RecordDialog>
      <SignDialog
        target={target}
        agent={target ? agentName(target.agentId) : ""}
        onClose={() => setTarget(null)}
        onSent={() => void qc.invalidateQueries({ queryKey: ["mandates"] })}
      />
    </div>
  );
}

function splitPlace(raw: string, city: string, cp: string) {
  const m = raw.match(/^(.*?)[\s,-]*\b(\d{5})\s+(.+)$/);
  if (m) return { street: (m[1] ?? "").trim() || raw, town: `${m[2]} ${m[3]}`.trim() };
  if (city && raw.toLowerCase().endsWith(city.toLowerCase()))
    return { street: raw.slice(0, -city.length).replace(/[\s,-]+$/, ""), town: `${cp} ${city}`.trim() };
  const w = raw.match(/^(.*\d.*?)\s+(Paris|Lyon|Marseille)$/i);
  if (w) return { street: w[1] ?? raw, town: w[2] ?? "" };
  return { street: raw || "—", town: city ? `${cp} ${city}`.trim() : "" };
}

const toIso = (fr: string) => {
  const m = fr.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  return m ? `${m[3]}-${m[2]}-${m[1]}` : "";
};
const frDate = (iso: string) => (iso ? new Date(iso).toLocaleDateString("fr-FR") : "");

const m2 = (n: unknown) => `${Number(n).toLocaleString("fr-FR")} m²`;
type DesigAsset = { asset_class?: string | null; asset_subclass?: string | null; title?: string | null; surface?: number | null; weighted_surface?: number | null; outdoor_surface?: number | null; parking_count?: number | null; is_portfolio?: boolean | null; portfolio_lots?: unknown; residential_details?: unknown } | null;
/** Désignation complète reprise de l'actif. */
function designationText(a: DesigAsset): string {
  if (!a) return "";
  const lots = (a.portfolio_lots ?? []) as PortfolioLot[];
  const kind = a.is_portfolio
    ? `Un portefeuille de ${lots.length} bien${lots.length > 1 ? "s" : ""} (${assetKindLabel(a.asset_class, a.asset_subclass) || "actifs"})`
    : assetKindLabel(a.asset_class, a.asset_subclass) || a.title || "";
  const parts = [
    a.surface ? `d'une surface ${a.is_portfolio ? "totale " : ""}d'environ ${m2(a.surface)}` : "",
    a.weighted_surface ? `soit ${m2(a.weighted_surface)} pondérés` : "",
    a.outdoor_surface ? `avec ${m2(a.outdoor_surface)} de surface extérieure` : "",
    a.parking_count ? `${a.parking_count} place${a.parking_count > 1 ? "s" : ""} de parking` : "",
    ...Object.entries((a.residential_details ?? {}) as Record<string, unknown>)
      .filter(([k, v]) => k !== "occupancy" && v != null && v !== "" && v !== false)
      .map(([k, v]) => `${(RESIDENTIAL_LABELS[k] || k).toLowerCase()} : ${v === true ? "oui" : String(v)}`),
  ].filter(Boolean);
  return [kind.charAt(0).toUpperCase() + kind.slice(1), ...parts].join(", ");
}
/** Tableau de l'état locatif d'un portefeuille. */
function etatLocatif(lots: PortfolioLot[]): string {
  if (!lots.length) return "";
  const eur = (n?: number | null) => (n ? `${n.toLocaleString("fr-FR")} €` : "—");
  const rows = lots.map((l) => `| ${[l.address, l.postal_code, l.city].filter(Boolean).join(" ") || "—"} | ${l.asset_class || "—"} | ${l.surface ? m2(l.surface) : "—"} | ${l.tenant || "Libre"} | ${eur(l.rent)} |`);
  const ts = lots.reduce((t, l) => t + (Number(l.surface) || 0), 0);
  const tr = lots.reduce((t, l) => t + (Number(l.rent) || 0), 0);
  return ["| Adresse | Type | Surface | Locataire | Loyer annuel HT HC |", ...rows, `| Total | | ${ts ? m2(ts) : "—"} | | ${eur(tr)} |`].join("\n");
}

type AutoRow = { etat?: string; number: number; street: string; town: string; owner: string; mandant?: string; mandantAddress?: string; fees?: string; feeCharge?: string; designation?: string; situation?: string; price?: string };
function autoValues(row: AutoRow, agent: string, begin: string, signDate?: string): Record<string, string> {
  return {
    numero: String(row.number),
    mandant: row.mandant || (row.owner === "—" ? "" : row.owner),
    mandant_adresse: row.mandantAddress ?? "",
    adresse_bien: row.etat ? "aux adresses détaillées dans l'état locatif ci-dessous" : [row.street, row.town].filter(Boolean).join(", "),
    etat_locatif: row.etat ?? "",
    agent: agent && agent !== "—" ? agent : "David BERBIA PEREZ, Président",
    date_debut: frDate(begin),
    date_fin: frDate(addOneYear(begin)),
    lieu: "Paris",
    date_signature: frDate(signDate || begin),
    delai_suite: "12",
    honoraires: row.fees ?? "",
    charge_honoraires: row.feeCharge ?? "",
    designation: row.designation ?? "",
    situation_locative: row.situation ?? "",
    prix: row.price ?? "",
    actions_commerciales: "diffusion auprès de la base d'investisseurs Wallsbrokerage, envoi de brochures et campagnes emailing, publication sur le site wallsbrokerage.com, visites et négociation",
  };
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
  agent,
  onClose,
  onSent,
}: {
  target: (AutoRow & { id: string; begin: string; ownerEmail: string; tplType: string; tplExclusive: boolean | null }) | null;
  agent: string;
  onClose: () => void;
  onSent: () => void;
}) {
  const prepare = useServerFn(prepareMandateSignature);
  const send = useServerFn(sendPreparedMandate);
  const { data: templates } = useMandateTemplates();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [tplId, setTplId] = useState("");
  const [start, setStart] = useState("");
  const [signDate, setSignDate] = useState("");
  const [vals, setVals] = useState<Record<string, string>>({});
  const [showAll, setShowAll] = useState(false);
  const [pdf, setPdf] = useState<string | null>(null);
  const [pages, setPages] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);
  const [lastId, setLastId] = useState<string | null>(null);
  if (target && lastId !== target.id) {
    setLastId(target.id);
    setName(target.owner === "—" ? "" : target.owner);
    setEmail(target.ownerEmail);
    setVals({});
    setStart("");
    setSignDate("");
    setShowAll(false);
    setPdf(null);
    setTplId("");
  }
  const kind = templateKind(target?.tplType);
  const tpl =
    templates?.find((t) => t.id === tplId) ??
    templates?.find((t) => t.kind === kind && t.exclusive === !!target?.tplExclusive);
  const begin = start || (target ? toIso(target.begin) : "") || new Date().toISOString().slice(0, 10);
  const auto: Record<string, string> = target ? autoValues(target, agent, begin, signDate || begin) : {};
  const all: Record<string, string> = { ...auto, ...vals, mandant: vals["mandant"] ?? (auto["mandant"] || name || "") };
  const fields = tpl
    ? templateFields(tpl.body).filter((f) => !["date_debut", "date_fin", "mandant", "date_signature", "mediateur"].includes(f))
    : [];
  const missing = fields.filter((f) => !all[f]);
  const filled = fields.filter((f) => !!all[f]);
  const text = tpl ? fillTemplate(withSignatures(tpl.body), all) : "";
  const close = () => {
    if (pdf) URL.revokeObjectURL(pdf);
    onClose();
  };
  const generate = async () => {
    if (!target || !tpl) return;
    setBusy(true);
    try {
      const html = templateToHtml(withSignatures(fillTemplate(tpl.body, all)), `Mandat ${target.number}`);
      const r = await prepare({ data: { mandateId: target.id, mandantName: name, mandantEmail: email, html } });
      const bytes = Uint8Array.from(atob(r.pdfBase64), (c) => c.charCodeAt(0));
      if (pdf) URL.revokeObjectURL(pdf);
      setPdf(URL.createObjectURL(new Blob([bytes], { type: "application/pdf" })));
      const { pdfToImages } = await import("@/lib/pdf-to-images");
      setPages(await pdfToImages(bytes.buffer, 1.5));
      onSent();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };
  const submit = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await send({ data: { mandateId: target.id } });
      toast.success("Mandat envoyé aux parties");
      onSent();
      close();
    } catch (e) {
      toast.error((e as Error).message);
    }
    setBusy(false);
  };
  const fieldInput = (f: string) => (
    <div key={f} className="space-y-1">
      <Label>{f.replace(/_/g, " ")}</Label>
      <Input
        className="min-h-11"
        value={vals[f] ?? all[f] ?? ""}
        onChange={(e) => setVals((v) => ({ ...v, [f]: e.target.value }))}
      />
    </div>
  );
  return (
    <Dialog open={!!target} onOpenChange={(o) => !o && close()}>
      <DialogContent className={pdf ? "flex h-[100dvh] max-h-[100dvh] w-screen max-w-none flex-col gap-2 rounded-none p-2 sm:p-4" : "max-h-[90vh] max-w-[calc(100vw-2rem)] overflow-y-auto sm:max-w-2xl"}>
        <DialogHeader>
          <DialogTitle>Mandat n° {target?.number} — signature</DialogTitle>
        </DialogHeader>
        {!pdf ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Modèle</Label>
              <Select value={tpl?.id ?? ""} onValueChange={setTplId}>
                <SelectTrigger className="min-h-11">
                  <SelectValue placeholder="Choisir un modèle" />
                </SelectTrigger>
                <SelectContent>
                  {(templates ?? []).map((t) => (
                    <SelectItem key={t.id} value={t.id}>{t.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Début du mandat (fin = + 1 an)</Label>
              <Input type="date" className="min-h-11" value={begin} onChange={(e) => setStart(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Date de signature</Label>
              <Input type="date" className="min-h-11" value={signDate || begin} onChange={(e) => setSignDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Mandant (vendeur ou bailleur)</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Email du Mandant</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {missing.length > 0 && <p className="text-sm text-muted-foreground">À compléter :</p>}
            {missing.map(fieldInput)}
            {filled.length > 0 && (
              <div className="space-y-2">
                <Button
                  type="button"
                  variant="ghost"
                  className="h-auto px-0 text-sm text-muted-foreground"
                  onClick={() => setShowAll((s) => !s)}
                >
                  {showAll ? "Masquer les champs renseignés" : `Modifier un champ renseigné (${filled.length})`}
                </Button>
                {showAll && filled.map(fieldInput)}
              </div>
            )}
            <Button className="min-h-11 w-full" disabled={busy || !tpl || !name || !email} onClick={() => void generate()}>
              {busy ? "Préparation…" : "Générer le PDF pour vérification"}
            </Button>
            {tpl && (
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="min-h-11" onClick={() => downloadWord(text, `Mandat ${target?.number} ${tpl.title}`)}>
                  Export Word
                </Button>
                <Button variant="outline" className="min-h-11" onClick={() => printPdf(text, `Mandat ${target?.number}`)}>
                  Export PDF
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-2">
            <div className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded border bg-muted p-1">
              {pages.length ? pages.map((src, i) => <img key={i} src={src} alt={`Page ${i + 1}`} className="w-full bg-background shadow" />)
                : <iframe src={pdf} title="Mandat" className="h-full w-full" />}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" className="min-h-11" disabled={busy} onClick={() => { setPdf(null); setPages([]); }}>
                Corriger
              </Button>
              <Button className="min-h-11" disabled={busy} onClick={() => void submit()}>
                {busy ? "Envoi…" : "Envoi aux parties"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function MandateEditor({
  row,
  onSaved,
}: {
  row: { id: string; assetId: string | null; raw: { address: string; owner: string; exclusive: boolean | null; type: string; begin: string; signed: string; end: string; feeMode: string; feeValue: string; feePayer: string } };
  onSaved: () => void;
}) {
  const [f, setF] = useState(row.raw);
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f, v: string | boolean | null) => setF({ ...f, [k]: v });
  const save = async () => {
    setBusy(true);
    const { error } = await supabase
      .from("mandates")
      .update({
        address: f.address || null,
        start_date: f.begin || null,
        signed_at: f.signed || null,
        expires_at: f.end || null,
      })
      .eq("id", row.id);
    let err = error;
    if (!err && row.assetId) {
      const r = await supabase
        .from("assets")
        .update({
          owner_name: f.owner || null,
          mandate_exclusive: f.exclusive,
          mandate_type: f.type || null,
          mandate_start: f.begin || null,
          mandate_end: f.end || null,
          fee_mode: f.feeValue ? f.feeMode : null,
          fee_value: f.feeValue ? Number(f.feeValue.replace(",", ".")) : null,
          fee_payer: f.feePayer || null,
        })
        .eq("id", row.assetId);
      err = r.error;
    }
    setBusy(false);
    if (err) return void toast.error(err.message);
    toast.success("Mandat mis à jour");
    onSaved();
  };
  return (
    <div className="grid gap-3">
      <Label>Adresse</Label>
      <Input className="min-h-11" value={f.address} onChange={(e) => set("address", e.target.value)} />
      {row.assetId && (
        <>
          <Label>Propriétaire</Label>
          <Input className="min-h-11" value={f.owner} onChange={(e) => set("owner", e.target.value)} />
          <Label>Exclusivité</Label>
          <Select value={f.exclusive == null ? "none" : f.exclusive ? "oui" : "non"} onValueChange={(v) => set("exclusive", v === "none" ? null : v === "oui")}>
            <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="oui">Exclusif</SelectItem>
              <SelectItem value="non">Non exclusif</SelectItem>
            </SelectContent>
          </Select>
          <Label>Type de mandat</Label>
          <Select value={f.type || "none"} onValueChange={(v) => set("type", v === "none" ? "" : v)}>
            <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              <SelectItem value="Mandat de vente">Mandat de vente</SelectItem>
              <SelectItem value="Mandat de location">Mandat de location</SelectItem>
            </SelectContent>
          </Select>
          <Label>Honoraires</Label>
          <div className="flex gap-2">
            <Input className="min-h-11" inputMode="decimal" value={f.feeValue} onChange={(e) => set("feeValue", e.target.value)} />
            <Select value={f.feeMode} onValueChange={(v) => set("feeMode", v)}>
              <SelectTrigger className="min-h-11 w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="pct">% HT</SelectItem>
                <SelectItem value="ht">€ HT</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Label>Honoraires à la charge de</Label>
          <Select value={f.feePayer || "none"} onValueChange={(v) => set("feePayer", v === "none" ? "" : v)}>
            <SelectTrigger className="min-h-11"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">—</SelectItem>
              {["Mandant", "Acquéreur", "Preneur"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
            </SelectContent>
          </Select>
        </>
      )}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="grid gap-1"><Label>Début mandat</Label><Input type="date" className="min-h-11" value={f.begin} onChange={(e) => set("begin", e.target.value)} /></div>
        <div className="grid gap-1"><Label>Signature mandat</Label><Input type="date" className="min-h-11" value={f.signed} onChange={(e) => set("signed", e.target.value)} /></div>
        <div className="grid gap-1"><Label>Fin</Label><Input type="date" className="min-h-11" value={f.end} onChange={(e) => set("end", e.target.value)} /></div>
      </div>
      <Button className="min-h-11" disabled={busy} onClick={() => void save()}>Enregistrer</Button>
    </div>
  );
}
