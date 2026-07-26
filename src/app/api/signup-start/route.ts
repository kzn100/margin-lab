import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

/**
 * Records an email typed into the register form, before submit, so an abandoned
 * signup can be followed up an hour later.
 *
 * Always 204, whatever happens. It is fired from an onBlur and must never block
 * the form, and a different status for a known address would turn this into an
 * oracle for which emails are registered.
 */
export async function POST(request: Request) {
  const nothing = new NextResponse(null, { status: 204 });

  try {
    const { email } = (await request.json()) as { email?: unknown };
    const address = String(email ?? "").trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(address)) return nothing;

    // ignoreDuplicates: the first capture wins, so returning to the form does
    // not reset the clock on someone already waiting for their nudge.
    const { error } = await createAdminClient()
      .from("signup_starts")
      .upsert({ email: address }, { onConflict: "email", ignoreDuplicates: true });
    if (error) console.error("[signup-start] insert failed", error.message);
  } catch (error) {
    console.error("[signup-start] unexpected failure", error);
  }

  return nothing;
}
