import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, Square, Volume2, X } from "lucide-react";
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

function speechChunks(text: string, maxLength = 180) {
  const sentences = text.match(/[^.!?;:]+[.!?;:]?|[^.!?;:]+$/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const clean = sentence.trim();
    if (!clean) continue;
    if (`${current} ${clean}`.trim().length <= maxLength) {
      current = `${current} ${clean}`.trim();
      continue;
    }
    if (current) chunks.push(current);
    current = clean;
  }
  if (current) chunks.push(current);
  return chunks;
}

function SynthesePage() {
  const digest = Route.useLoaderData();
  const [state, setState] = useState<"idle" | "playing" | "paused">("idle");
  const [supported, setSupported] = useState(true);
  const [isPlayerOpen, setIsPlayerOpen] = useState(true);
  const [speechError, setSpeechError] = useState("");
  const utterances = useRef<SpeechSynthesisUtterance[]>([]);
  const sessionId = useRef(0);

  useEffect(() => {
    if (!("speechSynthesis" in window) || !("SpeechSynthesisUtterance" in window)) setSupported(false);
    else {
      window.speechSynthesis.getVoices();
      window.speechSynthesis.addEventListener("voiceschanged", pickVoice);
    }
    return () => {
      sessionId.current += 1;
      if ("speechSynthesis" in window) {
        window.speechSynthesis.removeEventListener("voiceschanged", pickVoice);
        window.speechSynthesis.cancel();
      }
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

  // Lecture fiable sur mobile : chaque phrase est lue l'une après l'autre ; la pause
  // mémorise la position (pause() natif est cassé sur Android) ; on n'appelle jamais
  // cancel() juste avant speak() quand rien ne parle (bug Chrome Android qui avale la voix).
  const position = useRef(0);
  const queueRef = useRef<string[]>([]);

  const speakFrom = (start: number) => {
    const synth = window.speechSynthesis;
    setSpeechError("");
    const currentSession = sessionId.current + 1;
    sessionId.current = currentSession;
    if (synth.speaking || synth.pending) synth.cancel();
    if (!queueRef.current.length) queueRef.current = speechChunks(digest.speech);
    const voice = pickVoice();
    const speakNext = (index: number) => {
      if (sessionId.current !== currentSession) return;
      const text = queueRef.current[index];
      if (!text) {
        position.current = 0;
        setState("idle");
        return;
      }
      position.current = index;
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = "fr-FR";
      utterance.rate = 1;
      utterance.pitch = 0.9;
      if (voice) utterance.voice = voice;
      utterances.current = [utterance]; // garde une référence (sinon le navigateur peut l'oublier)
      let started = false;
      utterance.onstart = () => { started = true; };
      utterance.onend = () => speakNext(index + 1);
      utterance.onerror = (event) => {
        if (event.error === "canceled" || event.error === "interrupted") return;
        if (sessionId.current === currentSession) {
          setSpeechError("La voix du téléphone n’a pas pu démarrer. Montez le volume (et désactivez le mode silencieux), puis touchez Play.");
          setState("idle");
        }
      };
      synth.speak(utterance);
      // Certains téléphones restent muets sans erreur : on le signale au lieu d'attendre.
      if (index === start) {
        window.setTimeout(() => {
          if (!started && sessionId.current === currentSession && !synth.speaking) {
            setSpeechError("Aucune voix française n’est installée ou active sur ce téléphone. Réglages → Synthèse vocale → installez « Français ».");
            setState("idle");
          }
        }, 4000);
      }
    };
    speakNext(start);
    setState("playing");
  };

  const play = () => speakFrom(state === "paused" ? position.current : 0);

  const pause = () => {
    sessionId.current += 1;
    window.speechSynthesis.cancel();
    setState("paused");
  };

  const stop = () => {
    sessionId.current += 1;
    window.speechSynthesis.cancel();
    utterances.current = [];
    position.current = 0;
    setState("idle");
  };

  const closePlayer = () => {
    stop();
    setIsPlayerOpen(false);
  };

  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <div className="sticky top-0 z-10 mb-4 flex items-center justify-between gap-3 border-b border-border bg-background/95 py-3 backdrop-blur">
        <span className="font-display text-lg">Synthèse du jour</span>
        <Button onClick={() => setIsPlayerOpen(true)}>
          <Volume2 /> Écouter
        </Button>
      </div>
      <div className="overflow-x-auto rounded-sm bg-card p-1">
        <div className="rounded-sm bg-background" dangerouslySetInnerHTML={{ __html: digest.html }} />
      </div>

      {isPlayerOpen && (
        <div className="jarvis-overlay" role="dialog" aria-modal="true" aria-labelledby="jarvis-title">
          <div className="jarvis-player">
            <div className="jarvis-glow" />
            <div className="jarvis-ring jarvis-ring-outer" />
            <div className="jarvis-ring jarvis-ring-dashed" />
            <div className="jarvis-ring jarvis-ring-segmented" />
            <div className="jarvis-core">
              <Button variant="ghost" size="icon" className="jarvis-close" onClick={closePlayer} aria-label="Fermer le lecteur">
                <X />
              </Button>
              <div className="jarvis-heading">
                <span id="jarvis-title">Synthèse audio</span>
                <i />
              </div>
              <div className="jarvis-wave" aria-hidden="true">
                {[0, 1, 2, 3, 4].map((bar) => <i key={bar} />)}
              </div>
              {supported ? (
                <div className="z-10 flex items-center gap-5">
                  {state === "playing" ? (
                    <Button variant="ghost" size="icon" className="jarvis-main-control" onClick={pause} aria-label="Mettre en pause">
                      <Pause />
                    </Button>
                  ) : (
                    <Button variant="ghost" size="icon" className="jarvis-main-control" onClick={play} aria-label={state === "paused" ? "Reprendre" : "Écouter"}>
                      <Play />
                    </Button>
                  )}
                  {state !== "idle" && (
                    <Button variant="ghost" size="icon" className="jarvis-stop" onClick={stop} aria-label="Arrêter">
                      <Square />
                    </Button>
                  )}
                </div>
              ) : (
                <p className="max-w-44 text-center text-xs text-jarvis-muted">La voix n’est pas disponible sur ce navigateur.</p>
              )}
              <div className="jarvis-status">
                <span>{state === "playing" ? "Lecture en cours" : state === "paused" ? "Lecture en pause" : "Touchez pour écouter"}</span>
                <small>Voix française · 1×</small>
              </div>
            </div>
          </div>
          {speechError && <p className="mt-6 max-w-xs text-center text-sm text-destructive-foreground">{speechError}</p>}
        </div>
      )}
    </main>
  );
}
