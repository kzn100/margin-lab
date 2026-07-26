/**
 * The email sent when somebody creates an account without uploading a P&L.
 *
 * Sent inline at registration rather than chased later: that is the one moment
 * we already know the account has no analysis, so nothing has to go looking for
 * it afterwards.
 * Spec: docs/superpowers/specs/2026-07-26-signup-nudge-emails-design.md
 */

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function renderUploadReminderEmail(name: string, company: string, uploadUrl: string) {
  return {
    subject: `Ready when you are — your ${company} P&L analysis`,
    text: [
      `Hi ${firstName(name)},`,
      "",
      `Your Margin Lab account is set up, but there is no P&L for ${company} yet.`,
      "",
      "Upload twelve months in our template and you get your margin bridge, the",
      "cost lines ranked against revenue, and how much of your growth came from",
      "price rather than volume.",
      "",
      `Upload it here: ${uploadUrl}`,
      "",
      "— Margin Lab",
    ].join("\n"),
  };
}
