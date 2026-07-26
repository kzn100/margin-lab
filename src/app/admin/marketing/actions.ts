"use server";

import { revalidatePath } from "next/cache";
import { roleOf } from "@/lib/auth";
import type { Json } from "@/lib/database.types";
import { createClient } from "@/lib/supabase/server";
import { pushToCustomAudience } from "@/lib/marketing/meta";
import { sendEmailBlast, sendWhatsappBlast } from "@/lib/marketing/providers";
import {
  describeSegment,
  parseSegment,
  resolveSegment,
  type Segment,
  type SegmentLead,
} from "@/lib/marketing/segment";

export type CampaignState = {
  ok: boolean;
  message: string;
} | null;

/**
 * Every action re-checks the role. A server action is a public endpoint — the
 * page guard that hid the form does not protect it.
 */
async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || roleOf(user) !== "admin") throw new Error("Admins only.");
  return { supabase, user };
}

/** Rebuilds the segment from the submitted querystring and resolves its leads. */
async function loadSegment(formData: FormData) {
  const { supabase, user } = await requireAdmin();
  const query = String(formData.get("segment") ?? "");
  const params = Object.fromEntries(new URLSearchParams(query));
  const segment = parseSegment(params);
  const leads = await resolveSegment(supabase, segment, new Date());
  return { supabase, user, segment, leads, query };
}

async function logCampaign(
  supabase: Awaited<ReturnType<typeof requireAdmin>>["supabase"],
  input: {
    type: "fb" | "email" | "whatsapp";
    segment: Segment;
    leads: SegmentLead[];
    content: Json;
    sentBy: string;
    delivered: boolean;
  },
) {
  const { error } = await supabase.from("marketing_campaigns").insert({
    type: input.type,
    segment_filter: {
      ...input.segment,
      description: describeSegment(input.segment, input.leads.length),
      recipients: input.leads.length,
    },
    content: input.content,
    // Only stamped when something actually went out, so the history can tell a
    // real send from a logged attempt.
    sent_at: input.delivered ? new Date().toISOString() : null,
    sent_by: input.sentBy,
  });
  if (error) console.error("[marketing] failed to log campaign", error.message);
}

export async function pushAudience(
  _prev: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const { supabase, user, segment, leads } = await loadSegment(formData);
  const audienceId = String(formData.get("audience_id") ?? "").trim();

  if (!leads.length) return { ok: false, message: "That segment has no leads in it." };
  if (!audienceId) return { ok: false, message: "Enter the Custom Audience ID to push to." };

  const result = await pushToCustomAudience(audienceId, leads);

  await logCampaign(supabase, {
    type: "fb",
    segment,
    leads,
    content: {
      audienceId,
      received: result.ok ? result.received : 0,
      error: result.ok ? null : result.error,
    },
    sentBy: user.id,
    delivered: result.ok,
  });

  revalidatePath("/admin/marketing");
  return result.ok
    ? { ok: true, message: `Pushed ${result.received} of ${leads.length} leads to ${audienceId}.` }
    : { ok: false, message: result.error };
}

export async function sendEmail(_prev: CampaignState, formData: FormData): Promise<CampaignState> {
  const { supabase, user, segment, leads } = await loadSegment(formData);
  const subject = String(formData.get("subject") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!leads.length) return { ok: false, message: "That segment has no leads in it." };
  if (!subject) return { ok: false, message: "Give the email a subject." };
  if (!body) return { ok: false, message: "Write a message before sending." };

  const outcome = await sendEmailBlast(leads, subject, body);

  await logCampaign(supabase, {
    type: "email",
    segment,
    leads,
    content: { subject, body, sent: outcome.sent, failed: outcome.failed, blocked: outcome.blocked ?? null },
    sentBy: user.id,
    delivered: !outcome.blocked && outcome.sent > 0,
  });

  revalidatePath("/admin/marketing");
  return outcome.blocked
    ? { ok: false, message: outcome.blocked }
    : { ok: true, message: `Sent to ${outcome.sent} lead${outcome.sent === 1 ? "" : "s"}.` };
}

export async function sendWhatsapp(
  _prev: CampaignState,
  formData: FormData,
): Promise<CampaignState> {
  const { supabase, user, segment, leads } = await loadSegment(formData);
  const body = String(formData.get("body") ?? "").trim();

  if (!leads.length) return { ok: false, message: "That segment has no leads in it." };
  if (!body) return { ok: false, message: "Write a message first." };

  const outcome = await sendWhatsappBlast(leads, body);

  await logCampaign(supabase, {
    type: "whatsapp",
    segment,
    leads,
    content: { body, sent: outcome.sent, failed: outcome.failed, blocked: outcome.blocked ?? null },
    sentBy: user.id,
    delivered: !outcome.blocked && outcome.sent > 0,
  });

  revalidatePath("/admin/marketing");
  return outcome.blocked
    ? { ok: false, message: outcome.blocked }
    : { ok: true, message: `Sent to ${outcome.sent} lead${outcome.sent === 1 ? "" : "s"}.` };
}
