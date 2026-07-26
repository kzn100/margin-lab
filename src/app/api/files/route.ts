import { NextResponse } from "next/server";
import { roleOf } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUCKET, canReadPath } from "@/lib/uploads";

export const runtime = "nodejs";

/**
 * Downloads one object from the private uploads bucket.
 *
 * The bucket has no read policy at all, so signing happens here with the
 * secret key and canReadPath is the only thing standing between a caller and
 * somebody else's P&L. Every refusal is a 404, including "you may not read
 * this one" — a 403 would confirm the path exists, which is the question an
 * attacker is asking.
 *
 * The signed URL lasts a minute: long enough to follow a redirect, and it is
 * never embedded in a page, so it cannot be shared out of one.
 */
export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path") ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const missing = NextResponse.json({ error: "Not found." }, { status: 404 });
  if (!user) return NextResponse.json({ error: "Log in first." }, { status: 401 });
  if (!canReadPath(path, user.id, roleOf(user) === "admin")) return missing;

  const filename = path.split("/").pop() || "download";
  const { data, error } = await createAdminClient()
    .storage.from(BUCKET)
    .createSignedUrl(path, 60, { download: filename });

  if (error || !data) {
    console.error("[files] could not sign", { path, error: error?.message });
    return missing;
  }

  return NextResponse.redirect(data.signedUrl);
}
