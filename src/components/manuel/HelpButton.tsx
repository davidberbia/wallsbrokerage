import { useState } from "react";
import { Link, useRouterState } from "@tanstack/react-router";
import { BookOpen, LifeBuoy } from "lucide-react";
import { MANUAL_TABS } from "@/lib/manuel/content";
import { tabForPath } from "@/lib/manuel/search";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AskBox } from "./AskBox";

export function HelpButton({ className, compact }: { className?: string; compact?: boolean }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const tab = tabForPath(MANUAL_TABS, path === "/" ? "/dossiers" : path);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant={compact ? "ghost" : "outline"} size={compact ? "icon" : "sm"} className={className} aria-label="Besoin d'aide">
          <LifeBuoy className="size-4" />
          {!compact && "Besoin d'aide"}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{tab ? `Aide — ${tab.label}` : "Besoin d'aide"}</DialogTitle>
          <DialogDescription>{tab?.intro ?? "Posez votre question, la réponse vient du Manuel du CRM."}</DialogDescription>
        </DialogHeader>
        {tab && (
          <ul className="space-y-1 text-sm">
            {tab.sections.slice(0, 6).map((s) => (
              <li key={s.id}>
                <Link to="/manuel/$slug" params={{ slug: tab.slug }} hash={s.id} onClick={() => setOpen(false)} className="flex min-h-10 items-center gap-2 text-primary hover:underline">
                  <BookOpen className="size-3.5 shrink-0" /> {s.title}
                </Link>
              </li>
            ))}
          </ul>
        )}
        <AskBox tab={tab?.slug} onNavigate={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}
