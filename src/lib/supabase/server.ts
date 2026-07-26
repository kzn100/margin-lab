import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from "./env";

/**
 * Server-side client carrying the caller's session from cookies — RLS applies.
 * Use for anything that must be scoped to the logged-in user.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    SUPABASE_URL(),
    SUPABASE_PUBLISHABLE_KEY(),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (cookiesToSet) => {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. Token refresh is handled by
            // middleware instead, so swallowing this is the documented pattern.
          }
        },
      },
    },
  );
}
