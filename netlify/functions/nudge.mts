import type { Config } from "@netlify/functions";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "../../src/lib/database.types.ts";
import {
  renderStage1Email,
  renderStage2Email,
  selectStage1,
  selectStage2,
} from "../../src/lib/email/nudge.ts";
import { sendEmail } from "../../src/lib/email/send.ts";

/**
 * Chases the two ways somebody ends up with no analysis: they typed an email
 * into the register form and left, or they made an account and never uploaded.
 * One email each, an hour after the fact.
 *
 * Spec: docs/superpowers/specs/2026-07-26-signup-nudge-emails-design.md
 */

/** Its own client rather than createAdminClient(): that module resolves "@/…" through
 *  Next's path aliases, which a Netlify function is not built with. */
function admin() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set.");
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

const siteUrl = () =>
  process.env.SITE_URL ?? process.env.URL ?? "https://margin-lab.netlify.app";

export default async function handler() {
  const db = admin();
  const now = new Date();
  const site = siteUrl().replace(/\/$/, "");
  let stage1Sent = 0;
  let stage2Sent = 0;

  // --- Stage 1: captured an email, never finished signing up. ---
  const { data: starts } = await db
    .from("signup_starts")
    .select("id, email, created_at, followed_up_at")
    .is("followed_up_at", null);

  if (starts?.length) {
    // Registering cancels the nudge, so check the addresses against leads.
    const { data: matched } = await db
      .from("leads")
      .select("email")
      .in("email", starts.map((s) => s.email));

    for (const start of selectStage1(starts, (matched ?? []).map((m) => m.email), now)) {
      const mail = renderStage1Email(`${site}/register`);
      const result = await sendEmail(start.email, mail.subject, mail.text);
      // Stamped only on success, so an SMTP outage retries next run instead of
      // burning the one nudge this person gets.
      if (!result.sent) {
        console.error("[nudge] stage 1 send failed", { to: start.email, error: result.error });
        continue;
      }
      await db
        .from("signup_starts")
        .update({ followed_up_at: now.toISOString() })
        .eq("id", start.id);
      stage1Sent++;
    }
  }

  // --- Stage 2: has an account, never uploaded a P&L. ---
  const { data: leads } = await db
    .from("leads")
    .select("id, name, company, email, created_at, upload_nudge_sent_at")
    .is("upload_nudge_sent_at", null);

  if (leads?.length) {
    const { data: uploads } = await db
      .from("pnl_uploads")
      .select("lead_id")
      .in("lead_id", leads.map((l) => l.id));

    for (const lead of selectStage2(leads, (uploads ?? []).map((u) => u.lead_id), now)) {
      const mail = renderStage2Email(lead.name, lead.company, `${site}/analyses/new`);
      const result = await sendEmail(lead.email, mail.subject, mail.text);
      if (!result.sent) {
        console.error("[nudge] stage 2 send failed", { to: lead.email, error: result.error });
        continue;
      }
      await db
        .from("leads")
        .update({ upload_nudge_sent_at: now.toISOString() })
        .eq("id", lead.id);
      stage2Sent++;
    }
  }

  console.info(`[nudge] sent ${stage1Sent} abandoned-signup, ${stage2Sent} no-upload`);
  return new Response(JSON.stringify({ stage1Sent, stage2Sent }), {
    headers: { "content-type": "application/json" },
  });
}

export const config: Config = { schedule: "*/30 * * * *" };
