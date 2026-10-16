import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client: bypasses row level security. Only for the owner-gated
 * staff account actions. Never import this from a client component.
 */
export function createServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_SERVICE_ROLE_KEY is not set.");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}
