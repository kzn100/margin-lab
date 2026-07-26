/**
 * Who is due a follow-up, and what it says.
 *
 * The selection rules are pure functions over rows rather than SQL so they can
 * be tested without a database — the scheduler does the fetching and stamping.
 * Spec: docs/superpowers/specs/2026-07-26-signup-nudge-emails-design.md
 */

/** How long someone gets to finish on their own before we chase them. */
export const NUDGE_AFTER_MS = 60 * 60 * 1000;

export type SignupStart = {
  id: string;
  email: string;
  created_at: string;
  followed_up_at: string | null;
};

export type NudgeLead = {
  id: string;
  name: string;
  company: string;
  email: string;
  created_at: string;
  upload_nudge_sent_at: string | null;
};

const isDue = (createdAt: string, now: Date) =>
  now.getTime() - new Date(createdAt).getTime() >= NUDGE_AFTER_MS;

/**
 * Captured an email, never finished signing up.
 *
 * Registering cancels the nudge: the address turns up in `leads`, and that is
 * checked here rather than by deleting the capture row, so signup_starts stays
 * an honest record of who started.
 */
export function selectStage1(
  starts: SignupStart[],
  registeredEmails: Iterable<string>,
  now: Date,
): SignupStart[] {
  const registered = new Set([...registeredEmails].map((e) => e.toLowerCase()));
  return starts.filter(
    (s) =>
      s.followed_up_at === null &&
      isDue(s.created_at, now) &&
      !registered.has(s.email.toLowerCase()),
  );
}

/** Has an account, never uploaded a P&L. */
export function selectStage2(
  leads: NudgeLead[],
  leadIdsWithUpload: Iterable<string>,
  now: Date,
): NudgeLead[] {
  const uploaded = new Set(leadIdsWithUpload);
  return leads.filter(
    (l) =>
      l.upload_nudge_sent_at === null && isDue(l.created_at, now) && !uploaded.has(l.id),
  );
}

const firstName = (name: string) => name.trim().split(/\s+/)[0] || "there";

export function renderStage1Email(registerUrl: string) {
  return {
    subject: "Your free P&L analysis is still waiting",
    text: [
      "Hi,",
      "",
      "You started a free P&L analysis with Margin Lab but did not finish.",
      "",
      "It takes one upload — twelve months of P&L in our template — and you get",
      "your margin bridge, cost gaps and revenue split back in minutes.",
      "",
      `Pick up where you left off: ${registerUrl}`,
      "",
      "— Margin Lab",
    ].join("\n"),
  };
}

export function renderStage2Email(name: string, company: string, uploadUrl: string) {
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
