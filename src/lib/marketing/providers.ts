import { renderTemplate, type SegmentLead } from "./segment";

/**
 * Outbound message channels.
 *
 * Two channels, no live provider between them: WhatsApp is undecided (Twilio vs
 * Meta Cloud API) and email has none wired. Both render the message per lead
 * and log it, so the composer, the personalisation and the campaign audit trail
 * are exercised on every send. Wiring a provider means replacing one function
 * body — nothing above this file changes.
 */

export type SendOutcome = {
  sent: number;
  failed: number;
  /** Set when the channel could not send at all. */
  blocked?: string;
};

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

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

  // ponytail: when a provider is chosen, send per lead here and count the
  // failures. Kept sequential-friendly on purpose — a blast of 500 wants a
  // queue, not a Promise.all against a rate limit.
  throw new Error("An email provider is configured but no send implementation is wired yet.");
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
