import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { publicProject } from "./public-project";

const url = import.meta.env["VITE_SUPABASE_URL"] || publicProject.url;
const key =
  import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] ||
  import.meta.env["VITE_SUPABASE_ANON_KEY"] ||
  publicProject.publishableKey;
export const cloudConfigured = Boolean(import.meta.env["VITE_DEMO_ONLY"] !== "true" && url && key);
let client: SupabaseClient | null = null;

/** No sessions or private data are read during server rendering. RLS authorizes every request. */
export function getCloudClient(): SupabaseClient | null {
  if (typeof window === "undefined" || !cloudConfigured) return null;
  return (client ??= createClient(url, key, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  }));
}
