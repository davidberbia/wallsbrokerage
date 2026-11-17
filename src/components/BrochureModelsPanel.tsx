import { FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import commerciaux from "@/assets/brochures/brochure_modele_commerciaux.pdf.asset.json";

const MODELS = [
  { label: "Actifs commerciaux", scope: "Tous les actifs sauf habitation et appartements", url: commerciaux.url as string | null, note: "Référence : Hôtel B&B Dammarie-les-Lys, sans les chiffres en page de garde." },
  { label: "Habitation / Appartements", scope: "Appartements et habitation", url: null, note: "Modèle à fournir." },
];

export function BrochureModelsPanel() {
  return (
    <div className="panel p-5">
      <h2 className="text-lg">Brochures modèles</h2>
      <div className="mt-4 grid gap-3">
        {MODELS.map((m) => (
          <div key={m.label} className="rounded-md border border-border p-3">
            <p className="font-medium">{m.label}</p>
            <p className="text-sm text-muted-foreground">{m.scope}</p>
            <p className="mt-1 text-xs text-muted-foreground">{m.note}</p>
            {m.url && (
              <Button asChild variant="outline" className="mt-3 min-h-11 w-full sm:w-auto">
                <a href={m.url} target="_blank" rel="noreferrer"><FileText className="size-4" /> Voir le modèle</a>
              </Button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
