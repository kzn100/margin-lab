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

export const emailConfigured = () => Boolean(process.env.SMTP_PASSWORD);

const user = () => process.env.SMTP_USER ?? "";
const from = () => process.env.EMAIL_FROM ?? `Margin Lab <${user()}>`;

/**
 * Pooled and built once per warm instance. A blast sends sequentially, and a
 * fresh TCP + TLS + AUTH handshake per message is the slow part of SMTP.
 */
let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;
  const port = Number(process.env.SMTP_PORT ?? 465);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST ?? "smtp.gmail.com",
    port,
    // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
    secure: port === 465,
    auth: { user: user(), pass: process.env.SMTP_PASSWORD },
    pool: true,
    maxConnections: 1,
  });
  return transporter;
}

export async function sendEmail(
  to: string,
  subject: string,
  text: string,
): Promise<SendResult> {
  if (!emailConfigured()) {
    console.info(`[email] would send to ${to}\nsubject: ${subject}\n${text}\n[email] end`);
    return { sent: false, error: "No SMTP_PASSWORD set — message logged, not sent." };
  }
  if (!user()) return { sent: false, error: "SMTP_PASSWORD is set but SMTP_USER is not." };

  try {
    await getTransporter().sendMail({ from: from(), to, subject, text });
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}
