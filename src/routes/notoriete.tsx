import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Briefcase, Check, Download, ExternalLink, ImagePlus, Plus, RefreshCw, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { completeLinkedinConnect, disconnectLinkedin, generateLinkedinPost, linkedinStatus, regenerateLinkedinImage, planLinkedinMonth, startLinkedinConnect } from "@/lib/linkedin.functions";
import { anonymizeAsset, canInviteNow, inviteQueue, inviteWaitMinutes, INVITES_MAX_PER_DAY, kindForDate, KIND_LABEL, type PostKind } from "@/lib/linkedin";

export const Route = createFileRoute("/notoriete")({
  head: () => ({
    meta: [
      { title: "LinkedIn — Wallsbrokerage CRM" },
      { name: "description", content: "Posts LinkedIn préparés par l'IA et invitations quotidiennes." },
      { property: "og:title", content: "LinkedIn — Wallsbrokerage CRM" },
      { property: "og:description", content: "Actifs anonymisés, articles et point marché mensuel." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <AppLayout requireBroker>
      <NotorietePage />
    </AppLayout>
  ),
});

type Chart = { title: string; unit: string; points: { label: string; value: number }[] };

function ChartSvg({ chart, svgRef }: { chart: Chart; svgRef?: React.Ref<SVGSVGElement> }) {
  const W = 600, H = 320, pad = 40;
  const max = Math.max(...chart.points.map((p) => p.value), 1);
  const bw = (W - pad * 2) / chart.points.length;
  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="w-full rounded-md border border-border bg-card text-foreground" xmlns="http://www.w3.org/2000/svg">
      <rect width={W} height={H} fill="hsl(var(--card))" />
      <text x={W / 2} y={24} textAnchor="middle" fontSize="16" fontWeight="600" fill="currentColor">{chart.title}</text>
      {chart.points.map((p, i) => {
        const h = ((H - pad * 2 - 20) * p.value) / max;
        const x = pad + i * bw + bw * 0.15;
        return (
          <g key={i}>
            <rect x={x} y={H - pad - h} width={bw * 0.7} height={h} rx="3" className="fill-primary" />
            <text x={x + bw * 0.35} y={H - pad - h - 6} textAnchor="middle" fontSize="12" fill="currentColor">{p.value.toLocaleString("fr-FR")}{chart.unit ? ` ${chart.unit}` : ""}</text>
            <text x={x + bw * 0.35} y={H - pad + 16} textAnchor="middle" fontSize="11" fill="currentColor">{p.label.slice(0, 14)}</text>
          </g>
        );
      })}
    </svg>
  );
}


function PostImage({ p, onChange }: { p: Post; onChange: () => void }) {
  const regen = useServerFn(regenerateLinkedinImage);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const url = useQuery({
    queryKey: ["li-img", p.image_path],
    enabled: !!p.image_path,
    queryFn: async () => (await supabase.storage.from("linkedin-images").createSignedUrl(p.image_path!, 3600)).data?.signedUrl ?? null,
  });
  const redo = async () => {
    setBusy(true);
    const r = await regen({ data: { postId: p.id } }).catch((e) => ({ error: String(e) }));
    setBusy(false);
    if ("error" in r) toast.error(r.error); else onChange();
  };
  const upload = async (f: File) => {
    setBusy(true);
    const path = `${p.user_id}/${p.id}-${Date.now()}-${f.name.replace(/[^\w.-]/g, "_")}`;
    const { error } = await supabase.storage.from("linkedin-images").upload(path, f, { contentType: f.type });
    if (!error) await supabase.from("linkedin_posts").update({ image_path: path }).eq("id", p.id);
    setBusy(false);
    if (error) toast.error(error.message); else onChange();
  };
  const editable = p.status !== "publie" && p.status !== "valide";
  return (
    <div className="space-y-1">
      {url.data ? <img src={url.data} alt="Image du post" className="w-full rounded-md border border-border" /> : p.body && <p className="text-xs text-muted-foreground">{busy ? "Création de l'image…" : "Pas encore d'image."}</p>}
      <div className="flex flex-wrap gap-2">
        {editable && p.body && <Button size="sm" variant="outline" disabled={busy} onClick={redo}><RefreshCw className="mr-1 size-4" />{busy ? "Image…" : p.image_path ? "Nouvelle image" : "Créer l'image"}</Button>}
        {editable && <Button size="sm" variant="outline" disabled={busy} onClick={() => fileRef.current?.click()}><ImagePlus className="mr-1 size-4" />Importer</Button>}
        {url.data && <Button size="sm" variant="outline" asChild><a href={url.data} download target="_blank" rel="noopener"><Download className="mr-1 size-4" />Télécharger</a></Button>}
      </div>
      <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); e.target.value = ""; }} />
    </div>
  );
}

type PickAsset = { id: string; title: string; city: string | null; asset_class: string | null; asset_subclass: string | null; surface: number | null; postal_code: string | null; price: number | null };

/** Choix de 1 à 3 actifs du portefeuille du collaborateur. */
function AssetPicker({ open, initial, onClose, onPick }: { open: boolean; initial: string[]; onClose: () => void; onPick: (ids: string[]) => void }) {
  const { user } = useAuth();
  const [sel, setSel] = useState<string[]>(initial);
  const [q, setQ] = useState("");
  useEffect(() => { if (open) { setSel(initial); setQ(""); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  const list = useQuery({
    queryKey: ["li-portfolio", user?.id], enabled: open && !!user,
    queryFn: async () => ((await supabase.from("assets").select("id, title, city, asset_class, asset_subclass, surface, postal_code, price").eq("owner_id", user!.id).eq("status", "disponible").order("updated_at", { ascending: false }).limit(300)).data ?? []) as PickAsset[],
  });
  const needle = q.trim().toLowerCase();
  const rows = (list.data ?? []).filter((a) => !needle || `${a.title} ${a.city ?? ""}`.toLowerCase().includes(needle));
  const toggle = (id: string) => setSel((s) => (s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id]));
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] overflow-hidden">
        <DialogHeader><DialogTitle>Choisir 1 à 3 actifs ({sel.length}/3)</DialogTitle></DialogHeader>
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Rechercher un nom ou une ville" />
        <div className="max-h-[50dvh] space-y-1 overflow-y-auto">
          {list.isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}
          {!list.isLoading && rows.length === 0 && <p className="text-sm text-muted-foreground">Aucun actif disponible.</p>}
          {rows.map((a) => {
            const line = anonymizeAsset(a);
            const on = sel.includes(a.id);
            return (
              <label key={a.id} className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-md border p-2 ${on ? "border-primary" : "border-border"} ${!line ? "opacity-50" : ""}`}>
                <Checkbox checked={on} disabled={!line || (!on && sel.length >= 3)} onCheckedChange={() => toggle(a.id)} />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{a.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{line ?? "Type ou prix manquant"}</div>
                </div>
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <Button disabled={sel.length === 0} onClick={() => onPick(sel)}>Rédiger avec ces actifs</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

type Post = { id: string; user_id: string; asset_ids: string[]; image_path: string | null; kind: string; body: string; chart: unknown; status: string; created_at: string; scheduled_for: string; error: string | null };

function PostCard({ p, onChange, onWrite, onPick, writing }: { p: Post; onChange: () => void; onWrite?: () => void; onPick?: () => void; writing?: boolean }) {
  const [text, setText] = useState(p.body);
  useEffect(() => setText(p.body), [p.body]);
  const ref = useRef<SVGSVGElement>(null);
  const chart = p.chart as Chart | null;
  const save = async (patch: { body?: string; status?: string; published_at?: string; error?: null }) => {
    const { error } = await supabase.from("linkedin_posts").update(patch).eq("id", p.id);
    if (error) toast.error(error.message); else onChange();
  };
  const publishByHand = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`, "_blank", "noopener");
    await save({ body: text, status: "publie", published_at: new Date().toISOString() });
    toast.success(p.image_path ? "Texte copié, LinkedIn ouvert — ajoutez l'image téléchargée." : "Texte copié, LinkedIn ouvert.");
  };
  const when = new Date(`${p.scheduled_for}T09:00:00`).toLocaleDateString("fr-FR", { weekday: "long", day: "numeric", month: "long" });
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>{KIND_LABEL[p.kind as PostKind]}</span>
        <span className="capitalize">{when}</span>
      </div>
      {p.status === "valide" && <p className="text-xs font-medium text-primary">Validé — part seul ce jour-là à 9 h</p>}
      {p.status === "echec" && p.error && <p className="text-xs text-destructive">{p.error}</p>}
      <PostImage p={p} onChange={onChange} />
      {chart && !p.image_path && <ChartSvg chart={chart} svgRef={ref} />}
      {p.status === "publie" ? (
        <p className="whitespace-pre-wrap text-sm">{p.body}</p>
      ) : !p.body ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{p.kind === "actifs" ? (p.asset_ids?.length ? "Actifs choisis, rédaction automatique prévue." : "Choisissez les actifs à mettre en avant.") : p.error ?? "Rédaction automatique prévue."}</span>
          {p.kind === "actifs" && onPick && <Button size="sm" disabled={writing} onClick={onPick}><Briefcase className="mr-1 size-4" />{writing ? "Rédaction…" : "Choisir dans le portefeuille"}</Button>}
          {onWrite && (p.kind !== "actifs" || !!p.asset_ids?.length) && <Button size="sm" variant="outline" disabled={writing} onClick={onWrite}><Sparkles className="mr-1 size-4" />{writing ? "Rédaction…" : "Rédiger maintenant"}</Button>}
        </div>
      ) : (
        <>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} disabled={p.status === "valide"} />
          <div className="flex flex-wrap gap-2">
            {p.status === "valide" ? (
              <Button size="sm" variant="outline" onClick={() => save({ status: "brouillon" })}><X className="mr-1 size-4" />Retirer la validation</Button>
            ) : (
              <>
                <Button size="sm" onClick={() => save({ body: text, status: "valide", error: null })}><Check className="mr-1 size-4" />Valider</Button>
                <Button size="sm" variant="outline" onClick={() => save({ body: text })}>Enregistrer</Button>
                {p.kind === "actifs" && onPick && <Button size="sm" variant="outline" disabled={writing} onClick={onPick}><Briefcase className="mr-1 size-4" />Changer les actifs</Button>}
                <Button size="sm" variant="outline" onClick={publishByHand}><ExternalLink className="mr-1 size-4" />Publier moi-même</Button>
                <Button size="sm" variant="ghost" onClick={() => save({ status: "ignore" })}><X className="mr-1 size-4" />Ignorer</Button>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function useCountdown(target: string | null) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 30_000); return () => clearInterval(t); }, []);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (ms <= 0) return null;
  const m = Math.ceil(ms / 60000);
  return m >= 60 ? `${Math.floor(m / 60)} h ${String(m % 60).padStart(2, "0")}` : `${m} min`;
}

function LinkedinConnect() {
  const qc = useQueryClient();
  const status = useServerFn(linkedinStatus), start = useServerFn(startLinkedinConnect), complete = useServerFn(completeLinkedinConnect), disc = useServerFn(disconnectLinkedin);
  const st = useQuery({ queryKey: ["li-status"], queryFn: () => status() });
  const [busy, setBusy] = useState(false);
  const connect = async () => {
    const popup = window.open("", "lovable-oauth", "width=600,height=720");
    if (!popup) { toast.error("Autorisez les fenêtres surgissantes."); return; }
    setBusy(true);
    try {
      const { authorizationUrl } = await start();
      const done = new Promise<string | null>((resolve, reject) => {
        const onMsg = (e: MessageEvent) => {
          if (e.origin !== window.location.origin || e.source !== popup || e.data?.connectorId !== "linkedin") return;
          cleanup();
          if (e.data?.type === "appUserConnectorOAuthComplete") resolve(typeof e.data.code === "string" ? e.data.code : null);
          else reject(new Error("Connexion LinkedIn refusée."));
        };
        const poll = window.setInterval(() => { if (popup.closed) { cleanup(); reject(new Error("Fenêtre fermée avant la fin.")); } }, 500);
        const cleanup = () => { window.removeEventListener("message", onMsg); window.clearInterval(poll); };
        window.addEventListener("message", onMsg);
      });
      popup.location.href = authorizationUrl;
      const code = await done;
      if (code) await complete({ data: { code } });
      await qc.invalidateQueries({ queryKey: ["li-status"] });
      toast.success("LinkedIn connecté");
    } catch (e) {
      popup.close();
      toast.error(e instanceof Error ? e.message : "Connexion impossible");
    } finally { setBusy(false); }
  };
  if (!st.data) return null;
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
      <div>
        <div className="text-sm font-medium">Mon compte LinkedIn</div>
        <div className="text-xs text-muted-foreground">{!st.data.configured ? "En attente de l'application LinkedIn de l'entreprise." : st.data.connected ? "Connecté" : "Non connecté"}</div>
      </div>
      {st.data.connected ? (
        <Button size="sm" variant="outline" onClick={async () => { await disc(); qc.invalidateQueries({ queryKey: ["li-status"] }); }}>Déconnecter</Button>
      ) : (
        <Button size="sm" disabled={!st.data.configured || busy} onClick={connect}>{busy ? "Connexion…" : "Connecter"}</Button>
      )}
    </div>
  );
}

function NotorietePage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const gen = useServerFn(generateLinkedinPost);
  const plan = useServerFn(planLinkedinMonth);
  const [writing, setWriting] = useState<string | null>(null);
  const [busy, setBusy] = useState<PostKind | null>(null);
  const [newUrl, setNewUrl] = useState("");

  const settings = useQuery({
    queryKey: ["li-settings", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("linkedin_settings").select("*").eq("user_id", uid).maybeSingle()).data,
  });
  const sources = useQuery({
    queryKey: ["li-sources", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("linkedin_sources").select("*").eq("user_id", uid).order("created_at")).data ?? [],
  });
  const posts = useQuery({
    queryKey: ["li-posts", uid], enabled: !!uid,
    queryFn: async () => (await supabase.from("linkedin_posts").select("*").eq("user_id", uid).neq("status", "ignore").order("scheduled_for", { ascending: true }).limit(80)).data ?? [],
  });
  const invites = useQuery({
    queryKey: ["li-invites", uid], enabled: !!uid,
    queryFn: async () => {
      const today = new Date(); today.setHours(0, 0, 0, 0);
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from("directory_contacts").select("id, full_name, company, job_title, created_at").eq("owner_id", uid).not("full_name", "is", null).order("created_at", { ascending: false }).limit(500),
        supabase.from("linkedin_invites").select("contact_id, done_at").eq("user_id", uid),
      ]);
      const doneToday = (d ?? []).filter((r) => new Date(r.done_at) >= today).length;
      return { next: inviteQueue(c ?? [], new Set((d ?? []).map((r) => r.contact_id)), 1)[0] ?? null, doneToday };
    },
  });
  const wait = useCountdown(settings.data?.next_invite_at ?? null);
  const markInvited = async (contactId: string) => {
    const next = new Date(Date.now() + inviteWaitMinutes() * 60000).toISOString();
    const { error } = await supabase.from("linkedin_invites").insert({ user_id: uid, contact_id: contactId });
    if (error) { toast.error(error.message); return; }
    await supabase.from("linkedin_settings").upsert({ user_id: uid, specialty, market_day: day, next_invite_at: next, updated_at: new Date().toISOString() });
    qc.invalidateQueries({ queryKey: ["li-invites"] }); qc.invalidateQueries({ queryKey: ["li-settings"] });
  };

  const [specialty, setSpecialty] = useState("");
  const [day, setDay] = useState(1);
  useEffect(() => {
    if (settings.data) { setSpecialty(settings.data.specialty); setDay(settings.data.market_day); }
  }, [settings.data]);

  const saveSettings = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("linkedin_settings").upsert({ user_id: uid, specialty, market_day: day, auto_publish: settings.data?.auto_publish ?? false, invites_per_day: INVITES_MAX_PER_DAY, ...patch, updated_at: new Date().toISOString() });
    if (error) { toast.error(error.message); return; }
    await plan().catch(() => null);
    toast.success("Enregistré"); qc.invalidateQueries({ queryKey: ["li-settings"] }); qc.invalidateQueries({ queryKey: ["li-posts"] });
  };
  const addSource = async () => {
    const url = newUrl.trim();
    if (!/^https?:\/\//.test(url)) { toast.error("Adresse de site invalide (https://…)"); return; }
    await supabase.from("linkedin_sources").insert({ user_id: uid, url });
    setNewUrl(""); qc.invalidateQueries({ queryKey: ["li-sources"] });
  };
  const [pick, setPick] = useState<{ post: Post | null } | null>(null);
  const onPicked = async (ids: string[]) => {
    const target = pick?.post ?? null;
    setPick(null);
    if (target) setWriting(target.id); else setBusy("actifs");
    try {
      const r = await gen({ data: target ? { kind: "actifs", postId: target.id, assetIds: ids } : { kind: "actifs", assetIds: ids } });
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Brouillon prêt — lancez l'image quand vous voulez");
      qc.invalidateQueries({ queryKey: ["li-posts"] }); qc.invalidateQueries({ queryKey: ["li-pipeline"] });
    } finally { setWriting(null); setBusy(null); }
  };
  const run = async (kind: PostKind) => {
    if (kind === "actifs") { setPick({ post: null }); return; }
    setBusy(kind);
    try {
      const r = await gen({ data: { kind } });
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Brouillon prêt");
      qc.invalidateQueries({ queryKey: ["li-posts"] });
    } finally { setBusy(null); }
  };
  const today = kindForDate(new Date(), day);
  const writeNow = async (p: Post) => {
    setWriting(p.id);
    try {
      const r = await gen({ data: { kind: p.kind as PostKind, postId: p.id } });
      if ("error" in r && r.error) toast.error(r.error); else toast.success("Brouillon prêt");
      qc.invalidateQueries({ queryKey: ["li-posts"] });
    } finally { setWriting(null); }
  };
  const drafts = (posts.data ?? []).filter((p) => p.status !== "publie") as Post[];
  const history = (posts.data ?? []).filter((p) => p.status === "publie");

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="font-display text-2xl font-semibold">LinkedIn</h1>
      {today && <p className="text-sm text-muted-foreground">Aujourd'hui : {KIND_LABEL[today]}</p>}
      <Tabs defaultValue="posts">
        <TabsList className="w-full">
          <TabsTrigger value="posts" className="flex-1">Posts</TabsTrigger>
          <TabsTrigger value="invites" className="flex-1">Invitations</TabsTrigger>
          <TabsTrigger value="reglages" className="flex-1">Réglages</TabsTrigger>
        </TabsList>

        <TabsContent value="posts" className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-3">
            {(["actifs", "specialite", "marche"] as PostKind[]).map((k) => (
              <Button key={k} variant={today === k ? "default" : "outline"} disabled={!!busy} onClick={() => run(k)} className="h-auto whitespace-normal py-2">
                <Sparkles className="mr-1 size-4 shrink-0" />{busy === k ? "Rédaction…" : k === "actifs" ? `${KIND_LABEL[k]} — choisir` : KIND_LABEL[k]}
              </Button>
            ))}
          </div>
          <Button variant="outline" className="w-full" onClick={async () => { const r = await plan(); toast.success(r.added ? `${r.added} posts prévus ce mois-ci` : "Mois déjà préparé"); qc.invalidateQueries({ queryKey: ["li-posts"] }); }}>Préparer le mois</Button>
          {drafts.length === 0 && <p className="text-sm text-muted-foreground">Aucun post prévu.</p>}
          {drafts.map((p) => <PostCard key={p.id} p={p} writing={writing === p.id} onWrite={() => writeNow(p)} onPick={() => setPick({ post: p })} onChange={() => { qc.invalidateQueries({ queryKey: ["li-posts"] }); qc.invalidateQueries({ queryKey: ["li-pipeline"] }); }} />)}
          <AssetPicker open={!!pick} initial={pick?.post?.asset_ids ?? []} onClose={() => setPick(null)} onPick={onPicked} />
          {history.length > 0 && <h2 className="pt-2 text-sm font-semibold">Publiés</h2>}
          {(history as Post[]).map((p) => <PostCard key={p.id} p={p} onChange={() => {}} />)}
        </TabsContent>

        <TabsContent value="invites" className="space-y-2">
          <p className="text-sm text-muted-foreground">Du plus récent au plus ancien, {INVITES_MAX_PER_DAY} par jour maximum, sans message. Rien le week-end.</p>
          <p className="text-sm">Aujourd'hui : {invites.data?.doneToday ?? 0} / {INVITES_MAX_PER_DAY}</p>
          {[0, 6].includes(new Date().getDay()) ? <p className="text-sm">Pause le week-end.</p>
            : (invites.data?.doneToday ?? 0) >= INVITES_MAX_PER_DAY ? <p className="text-sm">Quota du jour atteint, reprise demain.</p>
            : wait ? <p className="text-sm">Prochaine invitation dans {wait}.</p>
            : !invites.data?.next ? <p className="text-sm text-muted-foreground">Plus aucun contact à inviter.</p>
            : canInviteNow(invites.data.doneToday, settings.data?.next_invite_at ?? null, new Date()) && (() => { const c = invites.data.next!; return (
            <div className="flex items-center gap-2 rounded-md border border-border p-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.full_name}</div>
                <div className="truncate text-xs text-muted-foreground">{[c.job_title, c.company].filter(Boolean).join(" · ")}</div>
              </div>
              <Button size="sm" variant="outline" aria-label="Ouvrir sur LinkedIn" onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${c.full_name} ${c.company ?? ""}`.trim())}`, "_blank", "noopener")}>
                <ExternalLink className="size-4" />
              </Button>
              <Button size="sm" aria-label="Invitation envoyée" onClick={() => markInvited(c.id)}><Check className="size-4" /></Button>
            </div>); })()}
          <p className="text-xs text-muted-foreground">Sur LinkedIn : « Se connecter » puis « Envoyer sans note ».</p>
        </TabsContent>

        <TabsContent value="reglages" className="space-y-4">
          <LinkedinConnect />
          <div className="space-y-1">
            <Label>Ma spécialité</Label>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ex. habitation à Paris" />
          </div>
          <div className="space-y-1">
            <Label>Jour du mois pour le point marché</Label>
            <Input type="number" min={1} max={28} value={day} onChange={(e) => setDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Publication automatique</div>
              <div className="text-xs text-muted-foreground">Les posts partent à leur date sans validation.</div>
            </div>
            <Switch checked={settings.data?.auto_publish ?? false} onCheckedChange={(v) => saveSettings({ auto_publish: v })} />
          </div>
          <Button onClick={() => saveSettings({})}>Enregistrer</Button>
          <div className="space-y-2">
            <Label>Sites sources du point marché</Label>
            {(sources.data ?? []).map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-sm">{s.url}</span>
                <Button size="sm" variant="ghost" onClick={async () => { await supabase.from("linkedin_sources").delete().eq("id", s.id); qc.invalidateQueries({ queryKey: ["li-sources"] }); }}><Trash2 className="size-4" /></Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input value={newUrl} onChange={(e) => setNewUrl(e.target.value)} placeholder="https://…" />
              <Button variant="outline" onClick={addSource}><Plus className="size-4" /></Button>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
