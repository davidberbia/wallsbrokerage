import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function CompactRow({
  title,
  subtitle,
  summary,
  leading,
  trailing,
  onOpen,
  onEdit,
  onDelete,
  tone,
}: {
  title: string;
  subtitle?: string | null;
  summary?: ReactNode;
  leading?: ReactNode;
  trailing?: ReactNode;
  onOpen: () => void;
  onEdit?: (() => void) | undefined;
  onDelete?: (() => void) | undefined;
  tone?: "success" | "danger";
}) {
  return (
    <div
      data-compact-row
      className={`flex h-14 min-w-0 items-center gap-1 border-b border-border ${tone === "success" ? "bg-success/15" : tone === "danger" ? "bg-destructive/15" : "bg-card"} px-1 last:border-b-0 sm:gap-2 sm:px-3`}
    >
      {leading && <div className="flex shrink-0 items-center justify-center">{leading}</div>}
      <Button
        variant="ghost"
        className="h-full min-w-0 flex-1 flex-col items-start justify-center sm:flex-row sm:items-center sm:justify-start overflow-hidden rounded-none px-2 text-left font-normal"
        onClick={onOpen}
        aria-label={`Ouvrir ${title}`}
      >
        <span
          className="min-w-0 flex-1 basis-0 truncate font-medium"
          title={[title, subtitle].filter(Boolean).join(" · ")}
        >
          {title}
        </span>
        {subtitle && (
          <span className="hidden min-w-0 flex-1 basis-0 truncate text-left text-xs text-muted-foreground md:block">
            {subtitle}
          </span>
        )}
        {summary && (
          <span className="max-w-full truncate text-xs text-muted-foreground lg:w-80 lg:shrink-0 lg:text-right">{summary}</span>
        )}
      </Button>
      {trailing && <div className="flex shrink-0 items-center gap-1">{trailing}</div>}
      {onEdit && (
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0"
          title="Modifier"
          aria-label={`Modifier ${title}`}
          onClick={onEdit}
        >
          <Pencil className="size-4" />
        </Button>
      )}
      {onDelete && (
        <Button
          variant="ghost"
          size="icon"
          className="size-11 shrink-0 text-destructive"
          title="Supprimer"
          aria-label={`Supprimer ${title}`}
          onClick={() => {
            if (window.confirm(`Supprimer définitivement « ${title} » ?`)) onDelete();
          }}
        >
          <Trash2 className="size-4" />
        </Button>
      )}
    </div>
  );
}

export function RecordDialog({
  title,
  open,
  onClose,
  children,
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}) {
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!value) onClose();
      }}
    >
      <DialogContent className="max-h-[92dvh] min-w-0 overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="break-words pr-6">{title}</DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-4">{children}</div>
      </DialogContent>
    </Dialog>
  );
}

export function RecordFacts({ facts }: { facts: [string, ReactNode][] }) {
  return (
    <dl className="grid min-w-0 gap-3 sm:grid-cols-2">
      {facts.map(([label, value]) => (
        <div key={label} className="min-w-0 border-b border-border pb-2">
          <dt className="text-xs text-muted-foreground">{label}</dt>
          <dd className="mt-1 break-words whitespace-pre-line text-sm">{value || "—"}</dd>
        </div>
      ))}
    </dl>
  );
}
