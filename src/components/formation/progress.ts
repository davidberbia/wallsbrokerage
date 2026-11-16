import { supabase } from "@/integrations/supabase/client";

export type Progress = { module_slug: string; step_index: number; best_score: number | null; attempts: number; passed_at: string | null };

export async function loadMyProgress(userId: string): Promise<Progress[]> {
  const { data, error } = await supabase.from("training_progress").select("module_slug,step_index,best_score,attempts,passed_at").eq("user_id", userId);
  if (error) throw error;
  return data ?? [];
}

export async function saveProgress(userId: string, slug: string, patch: Partial<Progress>) {
  const { error } = await supabase
    .from("training_progress")
    .upsert({ user_id: userId, module_slug: slug, ...patch, updated_at: new Date().toISOString() }, { onConflict: "user_id,module_slug" });
  if (error) throw error;
}
