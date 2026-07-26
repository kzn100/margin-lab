"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { homeFor, roleOf } from "@/lib/auth";
import s from "./auth.module.css";

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

/** Same rule as registration, so a reset cannot weaken an account. */
function passwordLevel(pw: string) {
  if (pw.length < 8) return 0;
  let classes = 0;
  if (/[a-z]/.test(pw)) classes++;
  if (/[A-Z]/.test(pw)) classes++;
  if (/[0-9]/.test(pw)) classes++;
  if (/[^a-zA-Z0-9]/.test(pw)) classes++;
  if (pw.length >= 12 && classes >= 3) return 3;
  if (classes >= 2) return 2;
  return 1;
}

export function ResetPasswordForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const level = passwordLevel(password);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Both passwords have to match.");
      return;
    }

    setError(null);
    setBanner(null);
    setSubmitting(true);

    const supabase = createClient();
    const { data, error: updateError } = await supabase.auth.updateUser({ password });

    if (updateError) {
      setBanner(
        // The recovery session is what authorises this call, so the usual cause
        // is arriving here without one.
        "We could not set that password. Your reset link may have expired — request a new one.",
      );
      setSubmitting(false);
      return;
    }

    router.replace(homeFor(roleOf(data.user)));
    router.refresh();
  }

  return (
    <>
      {banner && (
        <div className="banner banner-error" role="alert">
          <ErrIcon />
          <span>{banner}</span>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className={error ? "field field-error" : "field"}>
          <label htmlFor="newPw">New password</label>
          <input
            className="input"
            id="newPw"
            name="password"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            autoFocus
          />
          <span className={s.meter} data-level={level} aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          <p className={s.meterNote}>
            {level === 0
              ? "At least 8 characters."
              : level === 1
                ? "Weak. Mix in numbers or capitals."
                : level === 2
                  ? "Reasonable. 12 characters would be stronger."
                  : "Strong."}
          </p>
        </div>

        <div className={error ? "field field-error" : "field"}>
          <label htmlFor="confirmPw">Confirm new password</label>
          <input
            className="input"
            id="confirmPw"
            name="confirm"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            disabled={submitting}
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
              Saving
            </>
          ) : (
            "Set new password"
          )}
        </button>
      </form>
    </>
  );
}
