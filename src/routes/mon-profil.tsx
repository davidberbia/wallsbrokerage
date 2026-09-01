import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { InvestorForm, investorPayload, type InvestorDraft } from "@/components/InvestorForm";
import { useAuth } from "@/hooks/useAuth";
import type { Investor } from "@/lib/types";

export const Route = createFileRoute("/mon-profil")({
  head: () => ({
    meta: [
      { title: "Mon profil investisseur — Walls Brokerage" },
      {
        name: "description",
        content:
          "Renseignez vos critères d'investissement : budget, classe d'actif, stratégie, région et rendement attendu.",
      },
      { property: "og:title", content: "Mon profil investisseur — Walls Brokerage" },
      {
        property: "og:description",
        content: "Mettez à jour vos critères pour recevoir les actifs qui vous correspondent.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppLayout>
      <MyProfilePage />
    </AppLayout>
  ),
});

const EMPTY: InvestorDraft = {
  full_name: "",
  first_name: "",
  asset_classes: [],
  strategies: [],
  regions: [],
};

function MyProfilePage() {
  const { user } = useAuth();
  const [draft, setDraft] = useState<InvestorDraft>(EMPTY);
  const [saving, setSaving] = useState(false);

  const profile = useQuery({
    queryKey: ["my-investor", user?.id],
    enabled: Boolean(user),
    queryFn: async () => {
      const { data, error } = await supabase
        .from("investors")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Investor) ?? null;
    },
  });

  useEffect(() => {
    if (profile.data) setDraft(profile.data as unknown as InvestorDraft);
    else if (user?.email) setDraft((d) => ({ ...d, email: d.email ?? user.email ?? "" }));
  }, [profile.data, user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const payload = { ...investorPayload(draft), user_id: user.id };
    const { error } = profile.data
      ? await supabase.from("investors").update(payload).eq("id", profile.data.id)
      : await supabase.from("investors").insert(payload);
    setSaving(false);
    if (error) toast.error(error.message);
    else {
      toast.success("Profil enregistré");
      profile.refetch();
    }
  };

  const nextReview = profile.data?.next_review_at
    ? new Date(profile.data.next_review_at).toLocaleDateString("fr-FR")
    : null;

  return (
    <div className="space-y-8">
      <div>
        <p className="eyebrow">Espace investisseur</p>
        <h1 className="mt-1 text-3xl">Mon profil d'investissement</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Plus vos critères sont précis, plus les opportunités que nous vous adressons sont
          pertinentes.
          {nextReview && ` Prochaine mise à jour recommandée : ${nextReview}.`}
        </p>
      </div>

      <div className="panel p-6">
        {profile.isLoading ? (
          <p className="text-sm text-muted-foreground">Chargement…</p>
        ) : (
          <InvestorForm
            draft={draft}
            onChange={setDraft}
            onSubmit={save}
            saving={saving}
            showStatus={false}
            footer={
              <div className="flex justify-end">
                <Button type="submit" disabled={saving}>
                  {saving ? "Enregistrement…" : "Enregistrer mon profil"}
                </Button>
              </div>
            }
          />
        )}
      </div>
    </div>
  );
}
