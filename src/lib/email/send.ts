import nodemailer from "nodemailer";

/**
 * The one place email actually leaves the app.
 *
 * Plain SMTP against the Google Workspace mailbox that already owns the sending
 * address, so there is no domain to verify with a third party: Google publishes
 * SPF and DKIM for ikorek.com already. Auth is an App Password, not the account
 * password — Workspace rejects the latter for SMTP.
 *
 * Separate from the SMTP configured inside Supabase, which only covers Supabase
 * Auth's own mail (recovery, confirmation) and cannot send arbitrary messages.
 *
 * With no SMTP_PASSWORD set it renders and logs instead of sending, so local
 * development and CI work without credentials.
 */

export type SendResult = { sent: boolean; error?: string };

export const emailConfigured = () => Boolean(password());

const user = () => process.env.SMTP_USER ?? "";
const from = () => process.env.EMAIL_FROM ?? `Margin Lab <${user()}>`;

/**
 * Google shows an App Password as "abcd efgh ijkl mnop" and people paste it
 * exactly that way. Sent verbatim, SMTP AUTH fails with "535 Username and
 * Password not accepted" — which reads like the wrong password, not the right
 * one with spaces in it. Strip them here so that trap cannot be fallen into.
 */
const password = () => (process.env.SMTP_PASSWORD ?? "").replace(/\s+/g, "");

/**
 * Deliberately unpooled. A pooled transporter holds its socket and keepalive
 * timer open, which stops the event loop draining — in the scheduled function
 * that means hanging until the platform timeout on every run, long after the
 * mail has gone. One connection per message costs a handshake we can afford at
 * this volume.
 * ponytail: revisit if a blast ever gets big enough for the handshakes to hurt,
 * and close the pool explicitly when it does.
 */
function buildTransport() {
  const port = Number(process.env.SMTP_PORT ?? 465);
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
    secure: port === 465,
    auth: { user: user(), pass: password() },
  });
}

/** Nodemailer's own attachment shape, passed through rather than wrapped. */
export type Attachment = { filename: string; content: Buffer; contentType: string };

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
  attachments?: Attachment[],
): Promise<SendResult> {
  if (!emailConfigured()) {
    const files = (attachments ?? [])
      .map((a) => `\n[email] attachment: ${a.filename} (${a.content.length} bytes)`)
      .join("");
    console.info(`[email] would send to ${to}\nsubject: ${subject}\n${text}${files}\n[email] end`);
    return { sent: false, error: "No SMTP_PASSWORD set — message logged, not sent." };
  }
  if (!user()) return { sent: false, error: "SMTP_PASSWORD is set but SMTP_USER is not." };

  try {
    const transport = buildTransport();
    try {
      await transport.sendMail({ from: from(), to, subject, text, attachments });
    } finally {
      transport.close();
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}
