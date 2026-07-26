"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

/**
 * Clears the session cookies and returns to the landing page.
 *
 * Local scope on purpose. signOut() defaults to global, which revokes every
 * refresh token the account has — pressing Log out on a laptop would also sign
 * the user out on their phone, which nobody expects from that button.
 */
export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/");
}
