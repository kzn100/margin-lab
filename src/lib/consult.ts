import { randomUUID } from "node:crypto";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import {
  consultPdfTitle,
  renderConsultRequestPdfLines,
  type ConsultContact,
  type ConsultRequest,
} from "@/lib/email/consult-request";
import { renderTextPdf } from "@/lib/pdf";
import type { PnlMetrics } from "@/lib/pnl/compute";
import { BUCKET } from "@/lib/uploads";

/**
 * What both consultation routes need: who is asking, what their numbers say,
 * and a PDF of it. Shared so the email route and the WhatsApp route cannot
 * drift apart on any of the three.
 */

type Client = SupabaseClient<Database>;

/** A lead as it comes back off the join — Supabase types it as array or object. */
type JoinedLead = {
  name: string;
  company: string;
  job_role: string;
  mobile: string;
  email: string;
} | null;

const unwrap = (leads: unknown): JoinedLead =>
  (Array.isArray(leads) ? leads[0] : leads) as JoinedLead;

/** The lead is the profile here — there is no profiles table. Auth metadata is the backstop. */
const contactFrom = (lead: JoinedLead, user: User): ConsultContact => ({
  name: lead?.name ?? ((user.user_metadata?.name as string | undefined) ?? "Unknown"),
  company: lead?.company ?? ((user.user_metadata?.company as string | undefined) ?? "Unknown"),
  jobRole: lead?.job_role ?? "",
  mobile: lead?.mobile ?? "",
  email: lead?.email ?? user.email ?? "",
  requestedAt: new Date().toISOString(),
});

/**
 * One saved analysis and the lead attached to it, or the newest one when no id
 * is given. Never filters on user_id: RLS scopes both tables to the caller, so
 * an id belonging to somebody else simply comes back empty.
 *
 * Returns null when there is nothing to load — for the WhatsApp route that is
 * an ordinary state, not an error.
 */
export async function loadConsultRequest(
  supabase: Client,
  user: User,
  resultId?: string,
): Promise<{ consult: ConsultRequest; leadId: string; resultId: string } | null> {
  const select = supabase
    .from("pnl_results")
    .select("id, lead_id, metrics, leads (name, company, job_role, mobile, email)");

  const { data } = resultId
    ? await select.eq("id", resultId).maybeSingle()
    : await select.order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!data) return null;

  return {
    consult: {
      ...contactFrom(unwrap(data.leads), user),
      metrics: data.metrics as unknown as PnlMetrics,
    },
    leadId: data.lead_id,
    resultId: data.id,
  };
}

/**
 * Contact details for somebody with no analysis yet. Their registration lead
 * still carries the mobile number, which is the field that matters most to
 * whoever picks the request up.
 */
export async function loadConsultContact(supabase: Client, user: User): Promise<ConsultContact> {
  const { data } = await supabase
    .from("leads")
    .select("name, company, job_role, mobile, email")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  return contactFrom(data, user);
}

/** The document that travels with a request, as an email attachment or a link. */
export const renderConsultPdf = (consult: ConsultRequest) =>
  renderTextPdf(consultPdfTitle(consult), renderConsultRequestPdfLines(consult));

/** Parks a copy in the private bucket. Throws — every caller treats that as recoverable. */
export async function storeConsultPdf(admin: Client, userId: string, pdf: Buffer) {
  const pdfPath = `${userId}/consult-${randomUUID()}.pdf`;
  const { error } = await admin.storage
    .from(BUCKET)
    .upload(pdfPath, pdf, { contentType: "application/pdf" });
  if (error) throw error;
  return pdfPath;
}
