import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/** Browser-side client. Anon or logged-in user identity — RLS applies. */
export function createClient() {
  return createBrowserClient<Database>(
    SUPABASE_URL(),
    SUPABASE_PUBLISHABLE_KEY(),
  );
}
