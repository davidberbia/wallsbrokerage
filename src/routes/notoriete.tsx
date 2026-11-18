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
import { generateLinkedinPost } from "@/lib/linkedin.functions";
import { inviteQueue, kindForDate, KIND_LABEL, type PostKind } from "@/lib/linkedin";

export const Route = createFileRoute("/notoriete")({
  head: () => ({
    meta: [
      { title: "Notoriété LinkedIn — Wallsbrokerage CRM" },
      { name: "description", content: "Posts LinkedIn préparés par l'IA et invitations quotidiennes." },
      { property: "og:title", content: "Notoriété LinkedIn — Wallsbrokerage CRM" },
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

function PostCard({ p, onChange }: { p: { id: string; kind: string; body: string; chart: unknown; status: string; created_at: string }; onChange: () => void }) {
  const [text, setText] = useState(p.body);
  const ref = useRef<SVGSVGElement>(null);
  const chart = p.chart as Chart | null;
  const save = async (patch: { body?: string; status?: string; published_at?: string }) => {
    const { error } = await supabase.from("linkedin_posts").update(patch).eq("id", p.id);
    if (error) toast.error(error.message); else onChange();
  };
  const publish = async () => {
    await navigator.clipboard.writeText(text).catch(() => {});
    window.open(`https://www.linkedin.com/feed/?shareActive=true&text=${encodeURIComponent(text)}`, "_blank", "noopener");
    await save({ body: text, status: "publie", published_at: new Date().toISOString() });
    toast.success("Texte copié, LinkedIn ouvert.");
  };
  return (
    <div className="space-y-2 rounded-md border border-border p-3">
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>{KIND_LABEL[p.kind as PostKind]}</span>
        <span>{new Date(p.created_at).toLocaleDateString("fr-FR")}</span>
      </div>
      {chart && (
        <div className="space-y-1">
          <ChartSvg chart={chart} svgRef={ref} />
          <Button size="sm" variant="outline" onClick={() => downloadPng(ref.current)}><Download className="mr-1 size-4" />Image du graphique</Button>
        </div>
      )}
      {p.status === "brouillon" ? (
        <>
          <Textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={publish}><ExternalLink className="mr-1 size-4" />Publier sur LinkedIn</Button>
            <Button size="sm" variant="outline" onClick={() => save({ body: text })}><Check className="mr-1 size-4" />Enregistrer</Button>
            <Button size="sm" variant="ghost" onClick={() => save({ status: "ignore" })}><X className="mr-1 size-4" />Ignorer</Button>
          </div>
        </>
      ) : (
        <p className="whitespace-pre-wrap text-sm">{p.body}</p>
      )}
    </div>
  );
}

function NotorietePage() {
  const { user } = useAuth();
  const uid = user?.id ?? "";
  const qc = useQueryClient();
  const gen = useServerFn(generateLinkedinPost);
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
    queryFn: async () => (await supabase.from("linkedin_posts").select("*").eq("user_id", uid).order("created_at", { ascending: false }).limit(40)).data ?? [],
  });
  const invites = useQuery({
    queryKey: ["li-invites", uid, settings.data?.invites_per_day], enabled: !!uid,
    queryFn: async () => {
      const [{ data: c }, { data: d }] = await Promise.all([
        supabase.from("directory_contacts").select("id, full_name, company, job_title, created_at").eq("owner_id", uid).not("full_name", "is", null).order("created_at", { ascending: false }).limit(500),
        supabase.from("linkedin_invites").select("contact_id").eq("user_id", uid),
      ]);
      return inviteQueue(c ?? [], new Set((d ?? []).map((r) => r.contact_id)), settings.data?.invites_per_day ?? 10);
    },
  });

  const [specialty, setSpecialty] = useState("");
  const [day, setDay] = useState(1);
  useEffect(() => {
    if (settings.data) { setSpecialty(settings.data.specialty); setDay(settings.data.market_day); }
  }, [settings.data]);

  const saveSettings = async (patch: Record<string, unknown>) => {
    const { error } = await supabase.from("linkedin_settings").upsert({ user_id: uid, specialty, market_day: day, auto_publish: settings.data?.auto_publish ?? false, invites_per_day: settings.data?.invites_per_day ?? 10, ...patch, updated_at: new Date().toISOString() });
    if (error) toast.error(error.message); else { toast.success("Enregistré"); qc.invalidateQueries({ queryKey: ["li-settings"] }); }
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
  const drafts = (posts.data ?? []).filter((p) => p.status === "brouillon");
  const history = (posts.data ?? []).filter((p) => p.status === "publie");

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4">
      <h1 className="font-display text-2xl font-semibold">Notoriété LinkedIn</h1>
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
          {drafts.length === 0 && <p className="text-sm text-muted-foreground">Aucun brouillon.</p>}
          {drafts.map((p) => <PostCard key={p.id} p={p} onChange={() => qc.invalidateQueries({ queryKey: ["li-posts"] })} />)}
          {history.length > 0 && <h2 className="pt-2 text-sm font-semibold">Publiés</h2>}
          {history.map((p) => <PostCard key={p.id} p={p} onChange={() => {}} />)}
        </TabsContent>

        <TabsContent value="invites" className="space-y-2">
          <p className="text-sm text-muted-foreground">Du plus récent au plus ancien, {settings.data?.invites_per_day ?? 10} par jour. Rien le week-end.</p>
          {[0, 6].includes(new Date().getDay()) ? <p className="text-sm">Pause le week-end.</p> : (invites.data ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-md border border-border p-2">
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium">{c.full_name}</div>
                <div className="truncate text-xs text-muted-foreground">{[c.job_title, c.company].filter(Boolean).join(" · ")}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => window.open(`https://www.linkedin.com/search/results/people/?keywords=${encodeURIComponent(`${c.full_name} ${c.company ?? ""}`.trim())}`, "_blank", "noopener")}>
                <ExternalLink className="size-4" />
              </Button>
              <Button size="sm" onClick={async () => { await supabase.from("linkedin_invites").insert({ user_id: uid, contact_id: c.id }); qc.invalidateQueries({ queryKey: ["li-invites"] }); }}>
                <Check className="size-4" />
              </Button>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="reglages" className="space-y-4">
          <div className="space-y-1">
            <Label>Ma spécialité</Label>
            <Input value={specialty} onChange={(e) => setSpecialty(e.target.value)} placeholder="Ex. habitation à Paris" />
          </div>
          <div className="space-y-1">
            <Label>Jour du mois pour le point marché</Label>
            <Input type="number" min={1} max={28} value={day} onChange={(e) => setDay(Math.min(28, Math.max(1, Number(e.target.value) || 1)))} />
          </div>
          <div className="space-y-1">
            <Label>Invitations par jour</Label>
            <Input type="number" min={1} max={20} defaultValue={settings.data?.invites_per_day ?? 10} onBlur={(e) => saveSettings({ invites_per_day: Math.min(20, Math.max(1, Number(e.target.value) || 10)) })} />
          </div>
          <div className="flex items-center justify-between gap-3 rounded-md border border-border p-3">
            <div>
              <div className="text-sm font-medium">Publication automatique</div>
              <div className="text-xs text-muted-foreground">Effective une fois votre LinkedIn connecté.</div>
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
