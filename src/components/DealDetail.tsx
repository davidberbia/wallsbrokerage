import { Completion } from "@/components/Completion";
import { useCompletion } from "@/hooks/useCompletion";
import { useServerFn } from "@tanstack/react-start";
import { investigateLead } from "@/lib/leads.functions";
import { useRef, useState } from "react";
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
import { correspondents, byDomain } from "@/lib/correspondents";
import { useSelfEmails } from "@/hooks/useSelfEmails";
import { CopyEmail } from "@/components/CopyEmail";
import { ASSET_CLASS_GROUPS } from "@/lib/taxonomy";
import { LeadActions } from "@/components/LeadActions";
import { LeadDocumentRequest } from "@/components/LeadDocumentRequest";
import { PigeHistory } from "@/components/Pige";
import { canChangeLeadStage, leadResearchSchema } from "@/lib/lead-policy";

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

export function DealDetail({ id, onClose, onWaiting }: { id: string; onClose: () => void; onWaiting?: (() => void) | undefined }) {
  const qc = useQueryClient();
  const fill = useCompletion();
  const selfEmails = useSelfEmails();
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

  const dossier = useQuery({
    queryKey: ["deal-dossier", deal.data?.asset_id],
    enabled: !!deal.data?.asset_id,
    queryFn: async () => {
      const aid = deal.data?.asset_id;
      if (!aid) return { asset: null, docs: [] };
      const [a, docs] = await Promise.all([
        supabase.from("assets").select("city,address,postal_code,surface,price,rent,yield_pct,keys_count,revenue,revenue_n1,revenue_n2,ebe,ebe_n1,ebe_n2,hotel_category,asset_class,occupant,autofill_sources").eq("id", aid).single(),
        supabase.from("asset_documents").select("id,name,path").eq("asset_id", aid).order("sort_order"),
      ]);
      return { asset: a.data, docs: docs.data ?? [] };
    },
  });
  const openDoc = async (path: string) => {
    const { data } = await supabase.storage.from("brochures").createSignedUrl(path, 600);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  };
  const research=useServerFn(investigateLead);
  const jobs = useQuery({
    queryKey: ["lead-jobs", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("extraction_jobs").select("status,error").eq("target_id", id).eq("kind", "research").maybeSingle();
      if (error) throw error;
      return data;
    },
    refetchInterval: (query) => ["pending", "running"].includes(query.state.data?.status ?? "") ? 15000 : false,
  });
  const [researchBusy,setResearchBusy]=useState(false);
  const [form, setForm] = useState<(Partial<Deal> & { address?: string | null }) | null>(null);
  const current = form ?? deal.data ?? null;
  const [assetClass, setAssetClass] = useState<string | null>(null);
  const [hotel, setHotel] = useState<Record<string, string | number | null>>({});
  const [email, setEmail] = useState("");
  const [search, setSearch] = useState("");

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["record-completion"] });
    qc.invalidateQueries({ queryKey: ["deal", id] });
    qc.invalidateQueries({ queryKey: ["deals"] });
    qc.invalidateQueries({ queryKey: ["deal-contacts", id] });
    qc.invalidateQueries({ queryKey: ["deal-mails", id] });
  };

  const saving = useRef(false);
  const save = async (close = true) => {
    if (saving.current) return;
    const dirtyAsset = assetClass !== null || Object.keys(hotel).length > 0;
    if (!form && !dirtyAsset) { if (close) onClose(); return; }
    saving.current = true;
    try {
    if (deal.data?.stage === "Prospection" && current?.stage === "Disponible" && (!fill.loaded || !fill.get(current.asset_id, undefined, current).ready)) {
      toast.error("Complétez les éléments minimum pour la brochure");
      return;
    }
    if (!canChangeLeadStage(deal.data?.stage ?? "", current?.stage ?? "", assetClass ?? dossier.data?.asset?.asset_class)) {
      toast.error("Choisissez une classe d’actif avant de changer le statut");
      return;
    }
    let assetId = current?.asset_id ?? null;
    const assetPatch: Record<string, unknown> = { ...hotel, ...(assetClass !== null ? { asset_class: assetClass || null } : {}) };
    if (dirtyAsset) {
      if (assetId) {
        const { error: e1 } = await supabase.from("assets").update(assetPatch as never).eq("id", assetId);
        if (e1) { toast.error(e1.message); return; }
      } else {
        const { data: na, error: e2 } = await supabase.from("assets")
          .insert({ ...assetPatch, title: current?.name ?? "", address: current?.address ?? null, surface: current?.surface ?? null, price: current?.amount ?? null, rent: current?.rent ?? null, owner_id: deal.data?.owner_id ?? null, status: "prospection" } as never)
          .select("id").single();
        if (e2) { toast.error(e2.message); return; }
        assetId = na.id;
      }
    }
    const { error } = await supabase
      .from("deals")
      .update({
        name: current?.name ?? "",
        stage: current?.stage ?? "Prospection",
        company: current?.company ?? null,
        contact_name: current?.contact_name ?? null,
        amount: current?.amount ?? null,
        address: current?.address ?? null,
        contact_email: current?.contact_email ?? null,
        contact_phone: current?.contact_phone ?? null,
        owner_siren: current?.owner_siren ?? null,
        fee_amount: current?.fee_amount ?? null,
        fee_pct: current?.fee_pct ?? null,
        surface: current?.surface ?? null,
        rent: current?.rent ?? null,
        vintage: current?.vintage ?? new Date().getFullYear(),
        expected_payment_at: current?.expected_payment_at ?? null,
        paid_at: current?.paid_at ?? null,
        notes: current?.notes ?? null,
        nego1: current?.nego1 ?? null,
        nego2: current?.nego2 ?? null,
        seller: current?.seller ?? null,
        buyer: current?.buyer ?? null,
        operation_nature: current?.operation_nature ?? null,
        asset_id: assetId,
      } as never)
      .eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    if (close) { setForm(null); setAssetClass(null); setHotel({}); }
    qc.invalidateQueries({ queryKey: ["deal-assets"] });
    qc.invalidateQueries({ queryKey: ["deal-dossier"] });
    if (close) toast.success("Dossier enregistré");
    refresh();
    if (close) onClose();
    } finally { saving.current = false; }
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
      {fill.loaded && <Completion detail value={fill.get(current.asset_id, undefined, current)} />}
      {current.stage === "Prospection" && fill.loaded && !fill.get(current.asset_id, undefined, current).ready && <p className="text-xs text-muted-foreground">Pour la brochure : {fill.get(current.asset_id, undefined, current).missing.join(" · ")}</p>}
      {current.stage === "Prospection" && <div className="flex flex-wrap items-center justify-between gap-2">
        <LeadActions full id={id} name={current.name ?? "Lead"} owner={current.owner_id} email={current.contact_email} phone={current.contact_phone} archived={current.lead_status === "archived"} onArchived={onClose} onPromote={() => {
          if (!canChangeLeadStage("Prospection", "Disponible", dossier.data?.asset?.asset_class)) { toast.error("Enregistrez d’abord la classe d’actif"); document.getElementById("lead-class")?.focus(); return; }
          void (async () => {
            const { error } = await supabase.from("deals").update({ stage: "Disponible", last_activity_at: new Date().toISOString() }).eq("id", id).eq("stage", "Prospection");
            if (error) { toast.error(error.message); return; }
            for (const key of ["assets", "deal-assets", "lead-document-requests"]) void qc.invalidateQueries({ queryKey: [key] });
            refresh(); toast.success("Transformé en Actif dispo"); onClose();
          })();
        }} />

      </div>}
      {current.stage === "Prospection" && current.lead_status !== "archived" && <LeadDocumentRequest id={id} onWaiting={onWaiting} />}
      {current.stage === "Prospection" && <PigeHistory id={id} />}
      {(() => {
        // Interlocuteur principal : l'expéditeur du premier mail reçu (celui qui a envoyé le dossier).
        const ordered = [...(mails.data ?? [])].sort((x, y) => (x.received_at ?? "").localeCompare(y.received_at ?? ""));
        const fromSender = correspondents(ordered.map((m) => m.from_email), selfEmails)[0];
        const sender = fromSender ?? correspondents(ordered.map((m) => m.to_display), selfEmails)[0];
        const firstMail = sender ? ordered.find((m) => m.from_email?.toLowerCase() === sender) : null;
        const all = correspondents([...(sender ? [sender] : []), ...ordered.flatMap((m) => [m.from_email, m.to_display])], selfEmails);
        const groups = byDomain(all);
        if (sender) {
          const i = groups.findIndex(([, l]) => l.includes(sender));
          if (i > 0) groups.unshift(...groups.splice(i, 1));
        }
        if (!groups.length) return null;
        return (
          <section className="max-h-44 space-y-1 overflow-y-auto border-y border-border py-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Interlocuteur</h3>
            {sender && (
              <div className="text-sm font-semibold">
                {firstMail?.from_name && firstMail.from_name.toLowerCase() !== sender ? `${firstMail.from_name} · ` : ""}{fromSender ? "Expéditeur du dossier" : "Destinataire"}
              </div>
            )}
            {groups.map(([d, list], gi) => (
              <div key={d} className={gi ? "text-xs text-muted-foreground" : "text-sm font-medium"}>
                {list.map((e) => <div key={e} className="flex items-center gap-1 break-all"><a href={`mailto:${e}`} className="underline-offset-2 hover:underline">{e}</a><CopyEmail email={e} /></div>)}
              </div>
            ))}
          </section>
        );
      })()}


      <div className="grid gap-3 sm:grid-cols-2" onBlur={(e) => { if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) void save(false); }} onKeyDown={(e) => { if (e.key === "Enter" && e.target instanceof HTMLInputElement) { e.preventDefault(); e.target.blur(); } }}>
        <div className="sm:col-span-2">
          <Label>Nom</Label>
          <Input value={current.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Classe d'actif</Label>
          <Select value={(assetClass ?? dossier.data?.asset?.asset_class) || "none"} onValueChange={(v) => setAssetClass(v === "none" ? "" : v)}>
            <SelectTrigger id="lead-class"><SelectValue placeholder="À préciser" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="none">À préciser</SelectItem>
              {ASSET_CLASS_GROUPS.map(([g, list]) => list.map((c) => <SelectItem key={c} value={c}>{g === c ? c : `${g} — ${c}`}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
        <div className="sm:col-span-2">
          <Label>Occupant</Label>
          <Input placeholder="Nom de l'hôtel, enseigne, locataire…" value={String(("occupant" in hotel ? hotel["occupant"] : (dossier.data?.asset as Record<string, unknown> | undefined)?.["occupant"]) ?? "")} onChange={(e) => setHotel({ ...hotel, occupant: e.target.value.trim() ? e.target.value : null })} />
        </div>
        <div className="sm:col-span-2">
          <Label>Adresse de l'actif</Label>
          <Input value={current.address ?? ""} onChange={(e) => set({ address: e.target.value })} />
        </div>
        <div>
          <Label>Étape</Label>
          <Select value={current.stage ?? "Prospection"} onValueChange={(v) => {
            if (!canChangeLeadStage(deal.data?.stage ?? "", v, assetClass ?? dossier.data?.asset?.asset_class)) { toast.error("Choisissez d’abord la classe d’actif"); document.getElementById("lead-class")?.focus(); return; }
            set({ stage: v });
          }}>
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
        {current.stage !== "Prospection" && ([
          ["nego1", "Négo 1"],
          ["nego2", "Négo 2"],
          ["seller", "Vendeur"],
          ["buyer", "Acquéreur"],
          ["operation_nature", "Nature de l'opération"],
        ] as const).map(([k, label]) => (
          <div key={k}>
            <Label>{label}</Label>
            <Input value={current[k] ?? ""} onChange={(e) => set({ [k]: e.target.value || null })} />
          </div>
        ))}
        <div>
          <Label>Société / propriétaire</Label>
          <Input value={current.company ?? ""} onChange={(e) => set({ company: e.target.value })} />
        </div>
        <div>
          <Label>SIREN du propriétaire</Label>
          <Input inputMode="numeric" value={current.owner_siren ?? ""} onChange={(e) => set({ owner_siren: e.target.value || null })} />
        </div>
        <div>
          <Label>Contact</Label>
          <Input value={current.contact_name ?? ""} onChange={(e) => set({ contact_name: e.target.value })} />
        </div>
        <div>
          <Label>E-mail du contact</Label>
          <Input type="email" value={current.contact_email ?? ""} onChange={(e) => set({ contact_email: e.target.value || null })} />
        </div>
        <div>
          <Label>Téléphone du contact</Label>
          <Input type="tel" value={current.contact_phone ?? ""} onChange={(e) => set({ contact_phone: e.target.value || null })} />
        </div>
        {/Hôtel/.test((assetClass ?? dossier.data?.asset?.asset_class) || "") && (() => {
          const a = (dossier.data?.asset ?? {}) as Record<string, unknown>;
          const val = (k: string) => (k in hotel ? hotel[k] : a[k]) ?? "";
          const num = (k: string, label: string) => (
            <div key={k}>
              <Label>{label}</Label>
              <Input type="number" value={String(val(k))} onChange={(e) => setHotel({ ...hotel, [k]: e.target.value === "" ? null : Number(e.target.value) })} />
            </div>
          );
          const trio = (title: string, cols: readonly (readonly [string, string])[]) => (
            <div className="sm:col-span-2">
              <Label>{title}</Label>
              <div className="grid grid-cols-3 gap-2">
                {cols.map(([k, l]) => (
                  <div key={k} className="space-y-1">
                    <span className="block text-xs text-muted-foreground">{l}</span>
                    <Input type="number" value={String(val(k))} onChange={(e) => setHotel({ ...hotel, [k]: e.target.value === "" ? null : Number(e.target.value) })} />
                  </div>
                ))}
              </div>
            </div>
          );
          return (
            <>
              {num("keys_count", "Nombre de clés / chambres")}
              <div>
                <Label>Catégorie</Label>
                <Select value={String(val("hotel_category")) || "none"} onValueChange={(v) => setHotel({ ...hotel, hotel_category: v === "none" ? null : v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Non renseignée</SelectItem>
                    {["1 étoile", "2 étoiles", "3 étoiles", "4 étoiles", "5 étoiles", "Palace"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {trio("Chiffre d'affaires (€)", [["revenue", "N"], ["revenue_n1", "N-1"], ["revenue_n2", "N-2"]])}
              {trio("EBE (€)", [["ebe", "N"], ["ebe_n1", "N-1"], ["ebe_n2", "N-2"]])}
            </>
          );
        })()}
        <div>
          <Label>Prix (€)</Label>
          <Input
            type="number"
            value={current.amount ?? ""}
            onChange={(e) => set({ amount: e.target.value === "" ? null : Number(e.target.value) })}
          />
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
          <Label>Surface (m²)</Label>
          <Input
            type="number"
            value={current.surface ?? ""}
            onChange={(e) => set({ surface: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Loyer annuel (€)</Label>
          <Input
            type="number"
            value={current.rent ?? ""}
            onChange={(e) => set({ rent: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </div>
        <div>
          <Label>Année</Label>
          <Input
            type="number"
            value={current.vintage ?? ""}
            onChange={(e) => set({ vintage: e.target.value === "" ? new Date().getFullYear() : Number(e.target.value) })}
          />
        </div>
        {current.stage !== "Prospection" && <div>
          <Label>Encaissement prévu le</Label>
          <Input
            type="date"
            value={current.expected_payment_at ?? ""}
            onChange={(e) => set({ expected_payment_at: e.target.value || null })}
          />
        </div>}
        {current.stage !== "Prospection" && <div>
          <Label>Encaissé le</Label>
          <Input
            type="date"
            value={current.paid_at ?? ""}
            onChange={(e) => set({ paid_at: e.target.value || null })}
          />
        </div>}
        <div className="sm:col-span-2">
          <Label>Description</Label>
          <Textarea rows={6} value={current.notes ?? ""} onChange={(e) => set({ notes: e.target.value })} />
        </div>
      </div>
      {current.stage === "Prospection" && <section className="space-y-2 border-t border-border pt-4">
        <h3 className="text-sm font-semibold">Enquête</h3>
        {jobs.data && <p className="text-sm text-muted-foreground">{({ pending: "En attente", running: "Enquête en cours", done: "Enquête terminée", failed: "Enquête interrompue", paused: "Enquête en pause" } as Record<string,string>)[jobs.data.status] ?? jobs.data.status}</p>}
        {jobs.data?.error && <p className="break-words text-sm text-destructive">{jobs.data.error}</p>}
        {(() => { const failedAt = (deal.data as { research_failed_at?: string | null } | null | undefined)?.research_failed_at; const run = async()=>{setResearchBusy(true);try{await research({data:{id:id}});refresh();void qc.invalidateQueries({queryKey:["lead-jobs",id]});void qc.invalidateQueries({queryKey:["deal-dossier"]});toast.success("Enquête terminée");}catch(e){refresh();toast.error(e instanceof Error ? e.message : "Échec de la recherche");}finally{setResearchBusy(false);}}; return failedAt && !researchBusy ? <div className="flex flex-wrap items-center gap-3"><Button variant="outline" disabled>Enquête infructueuse {new Date(failedAt).toLocaleDateString("fr-FR")}</Button><button type="button" className="min-h-11 text-sm underline text-muted-foreground" disabled={jobs.data?.status === "running"} onClick={run}>Relancer quand même</button></div> : <Button variant="outline" disabled={researchBusy || jobs.data?.status === "running"} onClick={run}>{researchBusy ? "Enquête en cours…" : "Compléter les informations via IA"}</Button>; })()}
        {(() => {
          const parsed = leadResearchSchema.safeParse(current.lead_research);
          if (!parsed.success) return null;
          const labels: Record<string,string> = { identified:"Bien identifié",address:"Adresse",city:"Ville",postal_code:"Code postal",keys_count:"Nombre de clés",hotel_category:"Catégorie",owner_company:"Propriétaire",owner_siren:"SIREN",contact_email:"E-mail public",contact_phone:"Téléphone public",contact_name:"Contact",asset_class:"Classe d’actif",price:"Prix",rent:"Loyer",surface:"Surface" };
          return <div className="space-y-3">{parsed.data.facts.map((f,i) => <div key={i} className="border-b border-border pb-2 text-sm"><span className="font-medium">{labels[f.field] || f.field} : </span><span className="break-words">{f.value === null ? "Non identifié" : String(f.value)}</span><a className="mt-1 block text-xs text-primary underline" href={f.source} target="_blank" rel="noreferrer">{f.certainty} · Source</a></div>)}{parsed.data.related_companies.length > 0 && <h4 className="text-sm font-semibold">Sociétés et liens identifiés</h4>}{parsed.data.related_companies.map((c,i) => <p key={i} className="text-sm"><a className="text-primary underline" href={c.source} target="_blank" rel="noreferrer">{c.name}</a>{c.role ? ` · ${c.role}` : ""}</p>)}</div>;
        })()}
      </section>}
      {(current.suggestion || current.enrichment) && (
        <section className="space-y-1 rounded-sm border border-border bg-muted/40 p-3 text-sm">
          {current.suggestion && (
            <p>
              <b>Action suggérée :</b> {current.suggestion}
            </p>
          )}
          {current.enrichment && <p className="whitespace-pre-line text-muted-foreground">{current.enrichment}</p>}
        </section>
      )}
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-between">
        <Button variant="outline" onClick={remove}>
          <Trash2 className="h-4 w-4" /> Supprimer
        </Button>
        <Button onClick={() => void save()} disabled={!form && assetClass === null && !Object.keys(hotel).length}>
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
                  {`De ${m.from_name || m.from_email}`} ·{" "}
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
      {dossier.data && (() => {
        const a = dossier.data.asset;
        const n = (v: number | null | undefined, u: string) => (v == null ? null : `${new Intl.NumberFormat("fr-FR").format(v)} ${u}`);
        const facts = a ? [
          [a.address, a.postal_code, a.city].filter(Boolean).join(" ") || null,
          a.asset_class, n(a.surface, "m²"), n(a.price, "€"), a.rent != null ? `Loyer ${n(a.rent, "€")}` : null,
          a.yield_pct != null ? `${a.yield_pct} %` : null, n(a.keys_count, "clés"), a.revenue != null ? `CA ${n(a.revenue, "€")}` : null,
        ].filter(Boolean) : [];
        if (!facts.length && !dossier.data.docs.length) return null;
        return (
          <section className="space-y-2 rounded-sm border border-border p-3">
            <h3 className="text-xs font-semibold uppercase text-muted-foreground">Dossier ({dossier.data.docs.length})</h3>
            {facts.length > 0 && <p className="text-sm">{facts.join(" · ")}</p>}
            <div className="max-h-64 overflow-y-auto">{dossier.data.docs.map((d) => (
              <Button key={d.id} variant="ghost" type="button" onClick={() => openDoc(d.path)} className="h-auto min-h-11 w-full justify-start whitespace-normal text-left text-sm">
                <ExternalLink className="h-4 w-4 shrink-0" /> <span className="break-all">{d.name}</span>
              </Button>
            ))}</div>
          </section>
        );
      })()}
    </div>
  );
}
