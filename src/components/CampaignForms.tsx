"use client";

import { useActionState, useState } from "react";
import { pushAudience, sendEmail, sendWhatsapp, type CampaignState } from "@/app/admin/marketing/actions";
import { renderTemplate, type SegmentLead } from "@/lib/marketing/segment";
import s from "./marketing.module.css";

function Result({ state }: { state: CampaignState }) {
  if (!state) return null;
  return (
    <div className={state.ok ? "banner" : "banner banner-error"} role="status">
      <svg
        width="16"
        height="16"
        viewBox="0 0 16 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <circle cx="8" cy="8" r="6.5" />
        {state.ok ? <path d="m5.2 8.2 2 2 3.6-4.2" /> : <path d="M8 4.7v3.8M8 10.9v.1" />}
      </svg>
      <span>{state.message}</span>
    </div>
  );
}

function Submit({ label, busy, disabled }: { label: string; busy: boolean; disabled?: boolean }) {
  return (
    <button className="btn btn-primary" type="submit" disabled={busy || disabled}>
      {busy ? (
        <>
          <span className="spinner" aria-hidden="true" />
          Working
        </>
      ) : (
        label
      )}
    </button>
  );
}

/* ---------------- Facebook ---------------- */

export function FacebookPanel({
  segmentQuery,
  leads,
  configured,
}: {
  segmentQuery: string;
  leads: SegmentLead[];
  configured: boolean;
}) {
  const [state, action, pending] = useActionState<CampaignState, FormData>(pushAudience, null);

  return (
    <div className={s.panel}>
      <div className={s.split}>
        <div>
          <h3 className={s.h3}>Who gets pushed</h3>
          <p className={s.note}>
            Email addresses and phone numbers are SHA-256 hashed on the server before they reach
            Meta. Raw contact details never leave this machine, and the access token never reaches
            the browser.
          </p>
          <div className={s.recipients}>
            {leads.map((lead) => (
              <div key={lead.id}>
                <span>{lead.name}</span>
                <span className="e">{lead.email}</span>
              </div>
            ))}
          </div>
        </div>

        <form action={action} className={s.stack}>
          <input type="hidden" name="segment" value={segmentQuery} />

          <div className={configured ? "banner" : "banner banner-error"}>
            <svg
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <circle cx="8" cy="8" r="6.5" />
              <path d="M8 7.4v4M8 4.9v.1" />
            </svg>
            <span>
              {configured ? (
                <>
                  Connected to Meta. The access token is stored server-side and is never sent to the
                  browser.
                </>
              ) : (
                <>
                  <strong>No Meta access token configured.</strong> Add{" "}
                  <code>META_ACCESS_TOKEN</code> and <code>META_AD_ACCOUNT_ID</code> to the server
                  environment to enable pushing.
                </>
              )}
            </span>
          </div>

          <div className="field">
            <label htmlFor="audienceId">Custom Audience ID</label>
            <p className="help">
              From Meta Ads Manager, Audiences. A numeric id such as 23847562910340123.
            </p>
            <input
              className="input"
              id="audienceId"
              name="audience_id"
              inputMode="numeric"
              placeholder="23847562910340123"
              disabled={!configured}
            />
          </div>

          <Result state={state} />

          <div className={s.actions}>
            <Submit
              label={`Push ${leads.length} lead${leads.length === 1 ? "" : "s"} to Meta`}
              busy={pending}
              disabled={!configured || leads.length === 0}
            />
          </div>
        </form>
      </div>
    </div>
  );
}

/* ---------------- Email ---------------- */

const DEFAULT_SUBJECT = "Your margin gap, in one chart";
const DEFAULT_BODY = `Hi {{first_name}},

You ran a P&L analysis for {{company}}. Peers in your revenue band run a 9.2 percent net margin.

We have 30 minutes free next week to walk through the three levers that close that gap.`;

export function EmailPanel({
  segmentQuery,
  leads,
  configured,
}: {
  segmentQuery: string;
  leads: SegmentLead[];
  configured: boolean;
}) {
  const [state, action, pending] = useActionState<CampaignState, FormData>(sendEmail, null);
  const [subject, setSubject] = useState(DEFAULT_SUBJECT);
  const [body, setBody] = useState(DEFAULT_BODY);

  // Preview against a real lead, so a placeholder typo is visible before send.
  const sample = leads[0] ?? { name: "Nurul Aziz", company: "Teratai Beverages" };

  return (
    <div className={s.panel}>
      <div className={s.split}>
        <form action={action} className={s.stack}>
          <input type="hidden" name="segment" value={segmentQuery} />

          <div className="field">
            <label htmlFor="emSubject">Subject</label>
            <input
              className="input"
              id="emSubject"
              name="subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="field">
            <label htmlFor="emBody">Message</label>
            <p className="help">
              Use {"{{first_name}}"} and {"{{company}}"} for personalisation.
            </p>
            <textarea
              className={`input ${s.textarea}`}
              id="emBody"
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className={s.counter}>{body.length} characters</p>
          </div>

          {!configured && (
            <div className="banner banner-error">
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="8" cy="8" r="6.5" />
                <path d="M8 4.7v3.8M8 10.9v.1" />
              </svg>
              <span>
                <strong>No email provider configured.</strong> Sending renders every message,
                records the campaign and logs the output instead of delivering it.
              </span>
            </div>
          )}

          <Result state={state} />

          <div className={s.actions}>
            <Submit
              label={`Send to ${leads.length} lead${leads.length === 1 ? "" : "s"}`}
              busy={pending}
              disabled={leads.length === 0}
            />
          </div>
        </form>

        <div>
          <h3 className={s.h3}>Preview</h3>
          <p className={s.note}>As {sample.name} would see it.</p>
          <div className={s.preview}>
            <p className="subject">{renderTemplate(subject, sample)}</p>
            <p className="from">Margin Lab to {sample.name}</p>
            <p className="bodycopy">{renderTemplate(body, sample)}</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- WhatsApp ---------------- */

export function WhatsappPanel({
  segmentQuery,
  leads,
  configured,
  provider,
}: {
  segmentQuery: string;
  leads: SegmentLead[];
  configured: boolean;
  provider: string;
}) {
  const [state, action, pending] = useActionState<CampaignState, FormData>(sendWhatsapp, null);
  const [body, setBody] = useState("");

  return (
    <div className={s.panel}>
      {!configured && (
        <div className="banner banner-error" style={{ marginBottom: 20 }}>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="8" cy="8" r="6.5" />
            <path d="M8 4.7v3.8M8 10.9v.1" />
          </svg>
          <span>
            <strong>No WhatsApp provider configured</strong> (WHATSAPP_PROVIDER is &ldquo;{provider}
            &rdquo;). You can draft the message and record the campaign now. Delivery turns on once
            Twilio or the Meta Cloud API is wired in.
          </span>
        </div>
      )}

      <div className={s.split}>
        <form action={action} className={s.stack}>
          <input type="hidden" name="segment" value={segmentQuery} />
          <div className="field">
            <label htmlFor="waBody">Message</label>
            <p className="help">
              Plain text only. WhatsApp templates need approval before the first send.
            </p>
            <textarea
              className={`input ${s.textarea}`}
              id="waBody"
              name="body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Hi {{first_name}}, your P&L analysis for {{company}} is ready to walk through."
            />
            <p className={s.counter}>{body.length} characters</p>
          </div>

          <Result state={state} />

          <div className={s.actions}>
            <Submit
              label={
                configured
                  ? `Send to ${leads.length} lead${leads.length === 1 ? "" : "s"}`
                  : "Record draft campaign"
              }
              busy={pending}
              disabled={leads.length === 0}
            />
          </div>
        </form>

        <div>
          <h3 className={s.h3}>Set up a provider</h3>
          <ul className={s.setup}>
            <li>
              <span className="badge badge-neutral">1</span>
              <span>Pick Twilio or the Meta Cloud API. Both fit the same provider interface.</span>
            </li>
            <li>
              <span className="badge badge-neutral">2</span>
              <span>Add the credentials as server-side environment variables.</span>
            </li>
            <li>
              <span className="badge badge-neutral">3</span>
              <span>
                Submit your first template for approval, then set WHATSAPP_PROVIDER and sending
                turns on here.
              </span>
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
