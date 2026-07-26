"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

function ErrIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <circle cx="8" cy="8" r="6.5" />
      <path d="M8 4.7v3.8M8 10.9v.1" />
    </svg>
  );
}

export function ForgotPasswordForm({ expired }: { expired?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const email = String(new FormData(event.currentTarget).get("email") ?? "").trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError("Enter a valid email address.");
      return;
    }

    setError(null);
    setSubmitting(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/confirm?next=/reset-password`,
    });

    // Shown whether or not the address exists — saying "no such account" would
    // let anyone test which emails are registered here.
    if (sendError) console.error("[forgot-password]", sendError.message);
    setSent(true);
    setSubmitting(false);
  }

  if (sent) {
    return (
      <div className="banner" role="status" style={{ marginTop: 28 }}>
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
          <path d="M1.8 4.2h12.4v7.6H1.8z" />
          <path d="m2.2 4.6 5.8 4 5.8-4" />
        </svg>
        <span>
          If that address has an account, a reset link is on its way. The link expires in an hour.
        </span>
      </div>
    );
  }

  return (
    <>
      {expired && (
        <div className="banner banner-error" role="alert">
          <ErrIcon />
          <span>That reset link has expired or was already used. Request a new one.</span>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className={error ? "field field-error" : "field"}>
          <label htmlFor="fpEmail">Work email</label>
          <input
            className="input"
            id="fpEmail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com.my"
            aria-invalid={error ? true : undefined}
            disabled={submitting}
            autoFocus
          />
          {error && (
            <p className="err">
              <ErrIcon />
              {error}
            </p>
          )}
        </div>

        <button className="btn btn-primary btn-block" type="submit" aria-disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Sending the link
            </>
          ) : (
            "Email me a reset link"
          )}
        </button>
      </form>
    </>
  );
}
