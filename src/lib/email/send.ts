/**
 * The one place email actually leaves the app.
 *
 * Resend's HTTP API rather than SMTP: one fetch, no SMTP client dependency, and
 * it works from a serverless function without holding a connection open. Note
 * this is separate from the SMTP settings configured in Supabase, which only
 * cover Supabase Auth's own mail (recovery, confirmation).
 *
 * With no RESEND_API_KEY set it renders and logs instead of sending, so local
 * development and CI work without credentials.
 */

export type SendResult = { sent: boolean; error?: string };

export const emailConfigured = () => Boolean(process.env.RESEND_API_KEY);

const from = () => process.env.RESEND_FROM ?? "Margin Lab <onboarding@resend.dev>";

export async function sendViaResend(
  to: string,
  subject: string,
  text: string,
): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;

  if (!key) {
    console.info(`[email] would send to ${to}\nsubject: ${subject}\n${text}\n[email] end`);
    return { sent: false, error: "No RESEND_API_KEY set — message logged, not sent." };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({ from: from(), to, subject, text }),
    });

    if (!res.ok) {
      // Resend puts the useful part in the body; the status alone is rarely
      // enough to tell a bad key from an unverified sender domain.
      const detail = await res.text().catch(() => "");
      return { sent: false, error: `Resend returned ${res.status}. ${detail}`.trim() };
    }
    return { sent: true };
  } catch (error) {
    return { sent: false, error: error instanceof Error ? error.message : String(error) };
  }
}
