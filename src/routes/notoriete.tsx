import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Download, ExternalLink, Plus, Sparkles, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/hooks/useAuth";
import { completeLinkedinConnect, disconnectLinkedin, generateLinkedinPost, linkedinStatus, planLinkedinMonth, startLinkedinConnect } from "@/lib/linkedin.functions";
import { canInviteNow, inviteQueue, inviteWaitMinutes, INVITES_MAX_PER_DAY, kindForDate, KIND_LABEL, type PostKind } from "@/lib/linkedin";

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

function downloadPng(svg: SVGSVGElement | null) {
  if (!svg) return;
  const clone = svg.cloneNode(true) as SVGSVGElement;
  const cs = getComputedStyle(svg);
  clone.querySelectorAll("rect.fill-primary").forEach((r) => r.setAttribute("fill", getComputedStyle(svg.querySelector("rect.fill-primary")!).fill));
  clone.setAttribute("color", cs.color);
  clone.querySelector("rect")?.setAttribute("fill", cs.backgroundColor);
  const url = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)], { type: "image/svg+xml" }));
  const img = new Image();
  img.onload = () => {
    const c = document.createElement("canvas");
    c.width = 1200; c.height = 640;
    c.getContext("2d")!.drawImage(img, 0, 0, 1200, 640);
    const a = document.createElement("a");
    a.href = c.toDataURL("image/png"); a.download = "graphique-marche.png"; a.click();
    URL.revokeObjectURL(url);
  };
  img.src = url;
}

type Post = { id: string; kind: string; body: string; chart: unknown; status: string; created_at: string; scheduled_for: string; error: string | null };

function PostCard({ p, onChange, onWrite, writing }: { p: Post; onChange: () => void; onWrite?: () => void; writing?: boolean }) {
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
    toast.success("Texte copié, LinkedIn ouvert.");
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
      {chart && (
        <div className="space-y-1">
          <ChartSvg chart={chart} svgRef={ref} />
          <Button size="sm" variant="outline" onClick={() => downloadPng(ref.current)}><Download className="mr-1 size-4" />Image du graphique</Button>
        </div>
      )}
      {p.status === "publie" ? (
        <p className="whitespace-pre-wrap text-sm">{p.body}</p>
      ) : !p.body ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{p.error ?? "Rédaction automatique prévue."}</span>
          {onWrite && <Button size="sm" variant="outline" disabled={writing} onClick={onWrite}><Sparkles className="mr-1 size-4" />{writing ? "Rédaction…" : "Rédiger maintenant"}</Button>}
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
  const run = async (kind: PostKind) => {
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
                <Sparkles className="mr-1 size-4 shrink-0" />{busy === k ? "Rédaction…" : KIND_LABEL[k]}
              </Button>
            ))}
          </div>
          <Button variant="outline" className="w-full" onClick={async () => { const r = await plan(); toast.success(r.added ? `${r.added} posts prévus ce mois-ci` : "Mois déjà préparé"); qc.invalidateQueries({ queryKey: ["li-posts"] }); }}>Préparer le mois</Button>
          {drafts.length === 0 && <p className="text-sm text-muted-foreground">Aucun post prévu.</p>}
          {drafts.map((p) => <PostCard key={p.id} p={p} writing={writing === p.id} onWrite={() => writeNow(p)} onChange={() => qc.invalidateQueries({ queryKey: ["li-posts"] })} />)}
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
