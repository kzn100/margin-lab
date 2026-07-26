import { NextResponse } from "next/server";
import { loadConsultRequest, renderConsultPdf, storeConsultPdf } from "@/lib/consult";
import { consultPdfFilename, renderConsultRequestEmail } from "@/lib/email/consult-request";
import { sendEmail } from "@/lib/email/send";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

/**
 * Where consultation requests land. Defaults to the sending mailbox, which is
 * the same inbox in every deployment so far — set CONSULT_EMAIL to split them.
 * Read at call time, not module load, so it is not baked into a build.
 */
const consultTo = () => process.env.CONSULT_EMAIL || process.env.SMTP_USER || "";

/**
 * Raises an RGM consultation request for one saved analysis.
 *
 * The body carries only the result id: everything in the email — who they are,
 * how to reach them, what their numbers say — is read back out of the database
 * under the caller's own session, so a client cannot dress up the lead it sends.
 * RLS scopes both pnl_results and leads to the owning user, so an id belonging
 * to somebody else comes back empty and 404s.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user)
    return NextResponse.json({ error: "Log in to request a consultation." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const resultId = typeof body?.resultId === "string" ? body.resultId : "";
  if (!resultId) return NextResponse.json({ error: "Missing analysis id." }, { status: 400 });

  const found = await loadConsultRequest(supabase, user, resultId);
  if (!found) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });
  const { consult } = found;

  const mail = renderConsultRequestEmail(consult);
  const pdf = renderConsultPdf(consult);

  const to = consultTo();
  const sent = await sendEmail(to, mail.subject, mail.text, [
    { filename: consultPdfFilename(consult), content: pdf, contentType: "application/pdf" },
  ]);
  if (!sent.sent) {
    // The user gets a real failure rather than a false "we'll be in touch".
    console.error("[consult] request email not sent", { resultId, error: sent.error });
    return NextResponse.json(
      {
        error: to
          ? `We could not send the request. Email ${to} directly.`
          : "We could not send the request. Please try again later.",
      },
      { status: 502 },
    );
  }

  // Kept after the send, not before: the email is the thing that matters, and
  // a storage hiccup must not cost somebody their request. Same reason it does
  // not fail the response — the copy is for reviewing and re-sending later.
  try {
    const admin = createAdminClient();
    const pdfPath = await storeConsultPdf(admin, user.id, pdf);

    const { error: rowError } = await admin
      .from("consult_requests")
      .insert({ lead_id: found.leadId, result_id: found.resultId, pdf_path: pdfPath });
    if (rowError) throw rowError;
  } catch (error) {
    console.error("[consult] request sent but not recorded", {
      resultId,
      error: error instanceof Error ? error.message : error,
    });
  }

  return NextResponse.json({ ok: true });
}
