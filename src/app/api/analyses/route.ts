import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { computeMetrics } from "@/lib/pnl/compute";
import { parsePnl, PnlParseError } from "@/lib/pnl/parse";
import { sendResultsEmail } from "@/lib/email/results";

export const runtime = "nodejs";

// Same ceiling as /api/register — Netlify's function payload limit.
const MAX_BYTES = 5 * 1024 * 1024;

const PNL_TYPES = new Set(["full-year", "monthly"]);

type Fail = { error: string; field?: string; status?: number };

const fail = ({ error, field, status = 400 }: Fail) =>
  NextResponse.json({ error, field }, { status });

/**
 * Adds another analysis for the already-authenticated caller. Sibling to
 * /api/register, minus account creation: the session already has a user, so
 * this only needs name/company/job_role/mobile/pnl_type/file, and reuses that
 * user_id and email on the new lead row instead of calling auth.admin.createUser.
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

  const str = (k: string) => String(form.get(k) ?? "").trim();
  const name = str("name");
  const company = str("company");
  const jobRole = str("job_role");
  const mobile = str("mobile");
  const pnlType = str("pnl_type");
  const file = form.get("file");

  if (!name) return fail({ error: "Enter your name.", field: "name" });
  if (!company) return fail({ error: "Enter your company.", field: "company" });
  if (!jobRole) return fail({ error: "Select your role.", field: "job_role" });
  if (!mobile) return fail({ error: "Enter a mobile number.", field: "mobile" });
  if (!PNL_TYPES.has(pnlType)) return fail({ error: "Choose which P&L you are uploading." });
  if (!(file instanceof File) || file.size === 0)
    return fail({ error: "Attach your P&L file.", field: "file" });
  if (file.size > MAX_BYTES)
    return fail({ error: "That file is over 5 MB. Export just the P&L sheet.", field: "file" });

  const buffer = Buffer.from(await file.arrayBuffer());

  let metrics;
  try {
    metrics = computeMetrics(await parsePnl(buffer, file.name));
  } catch (error) {
    if (error instanceof PnlParseError) return fail({ error: error.message, field: "file" });
    console.error("[analyses] unexpected parse failure", error);
    return fail({ error: "We could not read that file. Check it against the template.", field: "file" });
  }

  // leads/pnl_uploads/pnl_results have no INSERT policy — RLS only covers
  // read, so writes go through the service-role client, same as /api/register.
  const admin = createAdminClient();

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

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(-80);
  const path = `${user.id}/${lead.id}-${safeName}`;
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
