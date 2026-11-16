import { createServerFn } from "@tanstack/react-start";
import { requireStaffAuth } from "@/lib/staff-middleware";
import { legalForm, pickRepresentative } from "@/lib/siren";

// Annuaire public des entreprises (gratuit, sans clé).
export const lookupSiren = createServerFn({ method: "POST" })
  .middleware([requireStaffAuth])
  .inputValidator((d: { siren: string }) => {
    const siren = String(d?.siren ?? "").replace(/\s/g, "");
    if (!/^\d{9}$/.test(siren)) throw new Error("Le SIREN doit comporter 9 chiffres.");
    return { siren };
  })
  .handler(async ({ data }) => {
    const res = await fetch(`https://recherche-entreprises.api.gouv.fr/search?q=${data.siren}&per_page=1`);
    if (!res.ok) throw new Error("Annuaire des entreprises indisponible, réessayez.");
    const json = (await res.json()) as { results?: any[] };
    const r = json.results?.find((x) => x.siren === data.siren);
    if (!r) throw new Error("Aucune société trouvée pour ce SIREN.");
    const rep = pickRepresentative(r.dirigeants ?? []);
    const s = r.siege ?? {};
    return {
      company_name: String(r.nom_raison_sociale || r.nom_complet || ""),
      legal_form: legalForm(String(r.nature_juridique ?? "")),
      address: String(s.adresse ?? ""),
      rcs_city: String(s.libelle_commune ?? ""),
      representative: rep?.name ?? "",
      representative_role: rep?.role ?? "",
    };
  });
