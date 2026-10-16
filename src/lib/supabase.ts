import { createClient } from "@supabase/supabase-js";

// Values come from .env.local (see .env.example). The anon key is safe to ship
// to the browser: row level security in supabase/schema.sql protects the data.
const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export const supabaseConfigured = Boolean(url && anonKey);

export const supabase = supabaseConfigured ? createClient(url!, anonKey!) : null;

export type Progress = { score: number; completed_tasks: string[]; household: string[] };

export async function loadProgress(userId: string): Promise<Progress | null> {
  if (!supabase) return null;
  const { data, error } = await supabase.from("readiness_progress").select("score, completed_tasks, household").eq("user_id", userId).maybeSingle();
  if (error) console.error("Could not load progress:", error.message);
  return data;
}

export async function saveProgress(userId: string, progress: Partial<Progress>) {
  if (!supabase) return;
  const { error } = await supabase.from("readiness_progress").upsert({ user_id: userId, ...progress, updated_at: new Date().toISOString() });
  if (error) console.error("Could not save progress:", error.message);
}
