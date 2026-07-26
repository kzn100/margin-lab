import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { computeMetrics } from "@/lib/pnl/compute";
import { parsePnl, PnlParseError } from "@/lib/pnl/parse";
import { sendResultsEmail } from "@/lib/email/results";
import { BUCKET, recordRejectedUpload, safeStoragePath } from "@/lib/uploads";

export const runtime = "nodejs";

// Same ceiling as /api/register — Netlify's function payload limit.
const MAX_BYTES = 5 * 1024 * 1024;

type Fail = { error: string; field?: string; status?: number };

const fail = ({ error, field, status = 400 }: Fail) =>
  NextResponse.json({ error, field }, { status });

/**
 * Adds another analysis for the already-authenticated caller. Sibling to
 * /api/register, minus account creation and minus re-asking the profile
 * questions: name/company/job_role/mobile come from the caller's most recent
 * lead row (RLS already scopes this read to their own), and pnl_type is
 * derived from the parsed file instead of asked, so this endpoint only needs
 * the file itself.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail({ error: "Log in to add an analysis.", status: 401 });

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return fail({ error: "Could not read the submitted form." });
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0)
    return fail({ error: "Attach your P&L file.", field: "file" });
  if (file.size > MAX_BYTES)
    return fail({ error: "That file is over 5 MB. Export just the P&L sheet.", field: "file" });

  const buffer = Buffer.from(await file.arrayBuffer());

  // leads/pnl_uploads/pnl_results have no INSERT policy — RLS only covers
  // read, so writes go through the service-role client, same as /api/register.
  const admin = createAdminClient();

  let metrics;
  try {
    metrics = computeMetrics(await parsePnl(buffer, file.name));
  } catch (error) {
    const shown =
      error instanceof PnlParseError
        ? error.message
        : "We could not read that file. Check it against the template.";
    if (!(error instanceof PnlParseError))
      console.error("[analyses] unexpected parse failure", error);
    // Kept even though it failed: what somebody tried to upload is worth seeing.
    await recordRejectedUpload(admin, {
      userId: user.id,
      email: user.email ?? "",
      fileName: file.name,
      buffer,
      contentType: file.type,
      reason: shown,
    });
    return fail({ error: shown, field: "file" });
  }
  const pnlType = metrics.period.months >= 12 ? "full-year" : "monthly";

  const { data: previousLead } = await supabase
    .from("leads")
    .select("name, company, job_role, mobile")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const name = previousLead?.name ?? (user.user_metadata?.name as string | undefined) ?? "";
  const company =
    previousLead?.company ?? (user.user_metadata?.company as string | undefined) ?? "";
  const jobRole = previousLead?.job_role ?? "";
  const mobile = previousLead?.mobile ?? "";

  const { data: lead, error: leadError } = await admin
    .from("leads")
    .insert({
      user_id: user.id,
      name,
      company,
      job_role: jobRole,
      mobile,
      email: user.email ?? "",
      pnl_type: pnlType,
    })
    .select("id")
    .single();
  if (leadError || !lead) {
    console.error("[analyses] lead insert failed", leadError);
    return fail({ error: "Something went wrong saving your analysis. Try again.", status: 500 });
  }

  const abort = async (where: string, detail: unknown) => {
    console.error(`[analyses] ${where}`, detail);
    await admin.from("leads").delete().eq("id", lead.id);
    return fail({ error: "Something went wrong saving your analysis. Try again.", status: 500 });
  };

  const path = `${user.id}/${lead.id}-${safeStoragePath(file.name)}`;
  const { error: uploadError } = await admin.storage
    .from(BUCKET)
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

  const origin = new URL(request.url).origin;
  await sendResultsEmail({
    to: user.email ?? "",
    name,
    company,
    resultUrl: `${origin}/results/${result.id}`,
    metrics,
  });

  return NextResponse.json({ resultId: result.id });
}
