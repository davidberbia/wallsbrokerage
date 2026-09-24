import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getDigestByToken } from "@/lib/digest.functions";

export const Route = createFileRoute("/synthese/$token")({
  loader: ({ params }) => getDigestByToken({ data: { token: params.token } }),
  head: () => ({
    meta: [
      { title: "Synthèse du jour — Walls Brokerage" },
      { name: "description", content: "Synthèse quotidienne des dossiers, relances et encaissements." },
      { property: "og:title", content: "Synthèse du jour — Walls Brokerage" },
      { property: "og:description", content: "Synthèse quotidienne des dossiers, relances et encaissements." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SynthesePage,
});

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith("fr"));
  const pref = ["Thomas", "Daniel", "Paul", "Henri", "Google français", "Microsoft Paul", "Microsoft Henri"];
  for (const p of pref) {
    const v = voices.find((x) => x.name.includes(p));
    if (v) return v;
  }
  return voices[0] ?? null;
}

function SynthesePage() {
  const digest = Route.useLoaderData();
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [supported, setSupported] = useState(true);
  const utter = useRef<SpeechSynthesisUtterance | null>(null);

  useEffect(() => {
    if (!("speechSynthesis" in window)) setSupported(false);
    else window.speechSynthesis.getVoices();
    return () => {
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
    };
  }, []);

  if (!digest) {
    return (
      <main className="mx-auto max-w-xl p-8 text-center">
        <h1 className="font-display text-2xl">Synthèse introuvable</h1>
        <p className="mt-2 text-muted-foreground">Ce lien a expiré ou n'existe pas.</p>
      </main>
    );
  }

  const play = () => {
    const synth = window.speechSynthesis;
    if (state === "paused") {
      synth.resume();
      setState("playing");
      return;
    }
    synth.cancel();
    const u = new SpeechSynthesisUtterance(digest.speech);
    u.lang = "fr-FR";
    u.rate = 0.98;
    u.pitch = 0.85;
    const v = pickVoice();
    if (v) u.voice = v;
    u.onend = () => setState("idle");
    utter.current = u;
    synth.speak(u);
    setState("playing");
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="sticky top-0 z-10 mb-4 flex flex-wrap items-center gap-2 border-b border-border bg-background/95 py-3 backdrop-blur">
        <span className="mr-auto font-display text-lg tracking-wide">Synthèse vocale</span>
        {supported ? (
          <>
            {state === "playing" ? (
              <Button variant="outline" onClick={() => { window.speechSynthesis.pause(); setState("paused"); }}>
                <Pause className="h-4 w-4" /> Pause
              </Button>
            ) : (
              <Button onClick={play}>
                <Play className="h-4 w-4" /> {state === "paused" ? "Reprendre" : "Écouter"}
              </Button>
            )}
            {state !== "idle" && (
              <Button variant="ghost" onClick={() => { window.speechSynthesis.cancel(); setState("idle"); }}>
                <Square className="h-4 w-4" /> Arrêter
              </Button>
            )}
          </>
        ) : (
          <span className="text-sm text-muted-foreground">La lecture vocale n'est pas disponible sur ce navigateur.</span>
        )}
      </div>
      <div className="overflow-x-auto rounded-sm bg-card p-1">
        <div className="rounded-sm bg-background" dangerouslySetInnerHTML={{ __html: digest.html }} />
      </div>
    </main>
  );
}
