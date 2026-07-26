import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { computeMetrics } from "@/lib/pnl/compute";
import { parsePnl, PnlParseError } from "@/lib/pnl/parse";
import { sendResultsEmail } from "@/lib/email/results";

export const runtime = "nodejs";

/**
 * Netlify's function payload ceiling is around 6 MB, so anything larger would
 * fail at the platform with an opaque error rather than a message the user can
 * act on. A twelve-month P&L is kilobytes; this only ever catches a wrong file.
 */
const MAX_BYTES = 5 * 1024 * 1024;

const PNL_TYPES = new Set(["full-year", "monthly"]);

type Fail = { error: string; field?: string; status?: number };

const fail = ({ error, field, status = 400 }: Fail) =>
  NextResponse.json({ error, field }, { status });

export async function POST(request: Request) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail({ error: "Could not read the submitted form." });
  }

  const str = (k: string) => String(form.get(k) ?? "").trim();
  const name = str("name");
  const company = str("company");
  const jobRole = str("job_role");
  const mobile = str("mobile");
  const email = str("email").toLowerCase();
  const password = String(form.get("password") ?? "");
  const pnlType = str("pnl_type");
  const file = form.get("file");

  // Re-validated server-side: the client checks are for feedback, this is the
  // trust boundary.
  if (!name) return fail({ error: "Enter your name.", field: "name" });
  if (!company) return fail({ error: "Enter your company.", field: "company" });
  if (!jobRole) return fail({ error: "Select your role.", field: "job_role" });
  if (!mobile) return fail({ error: "Enter a mobile number.", field: "mobile" });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return fail({ error: "Enter a valid email address.", field: "email" });
  if (password.length < 8)
    return fail({ error: "Use at least 8 characters.", field: "password" });
  if (!PNL_TYPES.has(pnlType)) return fail({ error: "Choose which P&L you are uploading." });

  // The file is optional: an account can be created now and the P&L uploaded
  // later from the dashboard. Everything downstream branches on this.
  const hasFile = file instanceof File && file.size > 0;
  if (hasFile && file.size > MAX_BYTES)
    return fail({ error: "That file is over 5 MB. Export just the P&L sheet.", field: "file" });

  const buffer = hasFile ? Buffer.from(await file.arrayBuffer()) : null;

  // Parse before creating anything. A rejected file should not leave an orphan
  // account behind that blocks the user from retrying with the same email.
  let metrics;
  if (hasFile && buffer) {
    try {
      metrics = computeMetrics(await parsePnl(buffer, file.name));
    } catch (error) {
      if (error instanceof PnlParseError) return fail({ error: error.message, field: "file" });
      console.error("[register] unexpected parse failure", error);
      return fail({ error: "We could not read that file. Check it against the template.", field: "file" });
    }
  }

  const admin = createAdminClient();

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password,
    // No verification gate before results: the user has to see the value now.
    // Supabase still records the address; a confirmation flow can run later.
    email_confirm: true,
    user_metadata: { name, company },
    app_metadata: { role: "user" },
  });

  if (createError || !created.user) {
    const message = createError?.message ?? "";
    if (/already|registered|exists/i.test(message)) {
      return fail({
        error: "That email already has an account. Log in and upload from your dashboard.",
        field: "email",
      });
    }
    console.error("[register] createUser failed", message);
    return fail({ error: "We could not create your account. Try again.", status: 500 });
  }

  const userId = created.user.id;

  /** Any failure past account creation rolls the account back so a retry works. */
  const abort = async (where: string, detail: unknown) => {
    console.error(`[register] ${where}`, detail);
    await admin.auth.admin.deleteUser(userId).catch(() => {});
    return fail({ error: "Something went wrong saving your analysis. Try again.", status: 500 });
  };

  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      user_id: userId,
      name,
      company,
      job_role: jobRole,
      mobile,
      email,
      pnl_type: pnlType,
    })
    .select("id")
    .single();
  if (leadError || !lead) return abort("lead insert failed", leadError);

  // Sign in so the cookie session exists either way. Shared by both branches;
  // uses the cookie-bound client, not the admin one.
  const signIn = async () => {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    // The account is saved either way — send them to log in rather than lose it.
    if (error) console.error("[register] post-signup sign-in failed", error.message);
  };

  if (!hasFile || !buffer || !metrics) {
    await signIn();
    return NextResponse.json({ redirect: "/dashboard" });
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
  const path = `${userId}/${lead.id}-${safeName}`;
  const { error: uploadError } = await admin.storage
    .from("pnl-uploads")
    .upload(path, buffer, { contentType: file.type || "text/csv", upsert: false });
  if (uploadError) return abort("storage upload failed", uploadError);

  const { data: upload, error: uploadRowError } = await admin
    .from("pnl_uploads")
    .insert({ lead_id: lead.id, file_path: path })
    .select("id")
    .single();
  if (uploadRowError || !upload) return abort("upload row insert failed", uploadRowError);

  const { data: result, error: resultError } = await admin
    .from("pnl_results")
    .insert({ lead_id: lead.id, upload_id: upload.id, metrics })
    .select("id")
    .single();
  if (resultError || !result) return abort("result insert failed", resultError);

  // RLS lets them read their own result on the next page once signed in.
  await signIn();

  const origin = new URL(request.url).origin;
  await sendResultsEmail({
    to: email,
    name,
    company,
    resultUrl: `${origin}/results/${result.id}`,
    metrics,
  });

  return NextResponse.json({ resultId: result.id });
}
