import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { SUPABASE_SECRET_KEY, SUPABASE_URL } from "./env";

/**
 * Secret-key client. Bypasses RLS — server-only, never import from a Client
 * Component. Used by the write paths: registration, P&L parse/compute, storage
 * upload, admin queries, marketing sends.
 */
export function createAdminClient() {
  return createSupabaseClient<Database>(SUPABASE_URL(), SUPABASE_SECRET_KEY(), {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
