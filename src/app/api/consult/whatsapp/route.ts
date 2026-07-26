import { NextResponse } from "next/server";
import {
  loadConsultContact,
  loadConsultRequest,
  renderConsultPdf,
  storeConsultPdf,
} from "@/lib/consult";
import { PDF_LINK_DAYS, renderConsultWhatsappText } from "@/lib/email/consult-request";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BUCKET } from "@/lib/uploads";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Who the header button messages. Read at call time, not module load, so it is
 * not baked into a build — same as CONSULT_EMAIL. Server-side rather than
 * NEXT_PUBLIC_ because the whole link is built here; the browser never needs it.
 */
const consultNumber = () => process.env.WHATSAPP_CONSULT_NUMBER || "60133454628";

const LINK_TTL_SECONDS = PDF_LINK_DAYS * 24 * 60 * 60;

/**
 * Opens WhatsApp with the consultation request already written.
 *
 * A GET that redirects, not a POST the client has to fetch: the header renders
 * a plain link, so the new tab opens on the user's own gesture and no popup
 * blocker gets involved.
 *
 * A wa.me link carries text and nothing else — WhatsApp has no way to attach a
 * file to one. So the analysis travels as a signed download link instead. It is
 * the derived summary PDF, the same document already emailed on a consultation
 * request, and it is a bearer URL: whoever holds it can read it until it
 * expires. That is the trade for a recipient who is not the account owner and
 * whom RLS would otherwise lock out entirely.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login?next=/dashboard", request.url));

  const found = await loadConsultRequest(supabase, user);
  const contact = found ? found.consult : await loadConsultContact(supabase, user);

  // Best-effort, exactly like the storage copy on the email route: a hiccup
  // here costs the link, not the conversation.
  let pdfUrl: string | null = null;
  if (found) {
    try {
      const admin = createAdminClient();
      const pdfPath = await storeConsultPdf(admin, user.id, renderConsultPdf(found.consult));

      const { data: signed, error: signError } = await admin.storage
        .from(BUCKET)
        .createSignedUrl(pdfPath, LINK_TTL_SECONDS);
      if (signError) throw signError;
      pdfUrl = signed?.signedUrl ?? null;

      const { error: rowError } = await admin
        .from("consult_requests")
        .insert({ lead_id: found.leadId, result_id: found.resultId, pdf_path: pdfPath });
      if (rowError) throw rowError;
    } catch (error) {
      console.error("[consult] whatsapp request could not attach the analysis", {
        userId: user.id,
        error: error instanceof Error ? error.message : error,
      });
    }
  }

  const text = renderConsultWhatsappText(contact, found?.consult.metrics ?? null, pdfUrl);
  return NextResponse.redirect(
    `https://wa.me/${consultNumber()}?text=${encodeURIComponent(text)}`,
  );
}
