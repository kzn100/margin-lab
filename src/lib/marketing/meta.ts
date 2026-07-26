import { createHash } from "node:crypto";
import type { SegmentLead } from "./segment";

/**
 * Meta Custom Audience push.
 *
 * Meta requires identifiers to be SHA-256 hashed and normalised first. The
 * hashing happens here, server-side — the raw addresses never leave this
 * process, and the token never reaches the browser.
 */

const GRAPH_VERSION = "v21.0";

export const metaConfigured = () =>
  Boolean(process.env.META_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);

const sha256 = (value: string) => createHash("sha256").update(value, "utf8").digest("hex");

/** Meta's rule: trim, lowercase, then hash. */
export const hashEmail = (email: string) => sha256(email.trim().toLowerCase());

/**
 * Meta's rule: digits only, including country code, no leading zeros or plus.
 * A Malaysian number written 012-345 6789 has an implied 60 country code, so a
 * local-format number gets one rather than being pushed as an 11-digit stub
 * that will never match.
 */
export function normalisePhone(mobile: string, defaultCountryCode = "60") {
  let digits = mobile.replace(/\D/g, "");
  if (mobile.trim().startsWith("+")) return digits;
  if (digits.startsWith("0")) digits = defaultCountryCode + digits.slice(1);
  return digits;
}

export const hashPhone = (mobile: string) => {
  const digits = normalisePhone(mobile);
  return digits ? sha256(digits) : "";
};

/** One row per lead, in the order named by `schema`. */
export function buildAudiencePayload(leads: SegmentLead[]) {
  return {
    schema: ["EMAIL", "PHONE"] as const,
    data: leads.map((lead) => [hashEmail(lead.email), hashPhone(lead.mobile)]),
  };
}

export type MetaPushResult =
  | { ok: true; received: number; audienceId: string }
  | { ok: false; error: string };

/**
 * Adds the segment to a Custom Audience. Returns a result rather than throwing:
 * the caller logs the attempt to marketing_campaigns either way, because a
 * failed push the admin cannot see is worse than one they can retry.
 */
export async function pushToCustomAudience(
  audienceId: string,
  leads: SegmentLead[],
): Promise<MetaPushResult> {
  const token = process.env.META_ACCESS_TOKEN;
  if (!token) return { ok: false, error: "No Meta access token configured on the server." };
  if (!leads.length) return { ok: false, error: "The segment is empty." };

  const payload = buildAudiencePayload(leads);

  try {
    const response = await fetch(
      `https://graph.facebook.com/${GRAPH_VERSION}/${encodeURIComponent(audienceId)}/users`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload, access_token: token }),
      },
    );

    const body = (await response.json()) as {
      num_received?: number;
      error?: { message?: string };
    };

    if (!response.ok) {
      return { ok: false, error: body.error?.message ?? `Meta returned ${response.status}.` };
    }
    return { ok: true, received: body.num_received ?? leads.length, audienceId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Could not reach the Meta API.",
    };
  }
}
