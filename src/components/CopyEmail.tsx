import { Check, Copy } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

/** Petit picto « copier » à côté d'une adresse mail. */
export function CopyEmail({ email }: { email: string | null | undefined }) {
  const [copied, setCopied] = useState(false);
  if (!email) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-6 text-muted-foreground hover:text-foreground"
      aria-label={`Copier ${email}`}
      title="Copier l'adresse mail"
      onClick={async (e) => {
        e.stopPropagation();
        await navigator.clipboard.writeText(email);
        setCopied(true);
        toast.success("Adresse copiée");
        setTimeout(() => setCopied(false), 1500);
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
    </Button>
  );
}
