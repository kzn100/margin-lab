import { type EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNext } from "@/lib/auth";

/**
 * Landing point for links in Supabase auth emails (password recovery, email
 * confirmation). Exchanges the one-time token for a session cookie, then sends
 * the user on.
 *
 * Handles both link formats: the PKCE `code` and the older `token_hash` + type.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const next = safeNext(params.get("next") ?? undefined, "/dashboard");
  const supabase = await createClient();

  const code = params.get("code");
  const tokenHash = params.get("token_hash");
  const type = params.get("type") as EmailOtpType | null;

  const { error } = code
    ? await supabase.auth.exchangeCodeForSession(code)
    : tokenHash && type
      ? await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      : { error: { message: "missing token" } };

  if (error) {
    const failed = new URL("/forgot-password", request.url);
    failed.searchParams.set("expired", "1");
    return NextResponse.redirect(failed);
  }

  return NextResponse.redirect(new URL(next, request.url));
}
