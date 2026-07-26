import { emailConfigured, sendViaResend } from "@/lib/email/send";
import { renderTemplate, type SegmentLead } from "./segment";

/**
 * Outbound message channels. Email goes through Resend; WhatsApp is still
 * undecided (Twilio vs Meta Cloud API) and renders to the log instead, so the
 * composer, the personalisation and the campaign audit trail are exercised
 * either way.
 */

export type SendOutcome = {
  sent: number;
  failed: number;
  /** Set when the channel could not send at all. */
  blocked?: string;
};

export { emailConfigured };

/** none | twilio | meta — only "none" is implemented. */
export const whatsappProvider = () => process.env.WHATSAPP_PROVIDER ?? "none";
export const whatsappConfigured = () => whatsappProvider() !== "none";

export async function sendEmailBlast(
  leads: SegmentLead[],
  subject: string,
  body: string,
): Promise<SendOutcome> {
  if (!emailConfigured()) {
    for (const lead of leads) {
      console.info(
        `[email-blast] would send to ${lead.email}\nsubject: ${renderTemplate(subject, lead)}\n${renderTemplate(body, lead)}\n[email-blast] end`,
      );
    }
    return {
      sent: 0,
      failed: 0,
      blocked: `No email provider configured. ${leads.length} message${
        leads.length === 1 ? "" : "s"
      } rendered and logged instead of sent.`,
    };
  }

  // Sequential on purpose: a blast of 500 against Resend's rate limit wants a
  // queue, not a Promise.all.
  // ponytail: fine to a few hundred leads; move to a queue past that.
  let sent = 0;
  let failed = 0;
  for (const lead of leads) {
    const result = await sendViaResend(
      lead.email,
      renderTemplate(subject, lead),
      renderTemplate(body, lead),
    );
    if (result.sent) sent++;
    else {
      failed++;
      console.error("[email-blast] send failed", { to: lead.email, error: result.error });
    }
  }
  return { sent, failed };
}

export async function sendWhatsappBlast(
  leads: SegmentLead[],
  body: string,
): Promise<SendOutcome> {
  if (!whatsappConfigured()) {
    for (const lead of leads) {
      console.info(`[whatsapp] would send to ${lead.mobile}: ${renderTemplate(body, lead)}`);
    }
    return {
      sent: 0,
      failed: 0,
      blocked:
        "No WhatsApp provider configured. The message was saved to the campaign log, not sent.",
    };
  }

  throw new Error(
    `WHATSAPP_PROVIDER is set to "${whatsappProvider()}" but no send implementation is wired yet.`,
  );
}
