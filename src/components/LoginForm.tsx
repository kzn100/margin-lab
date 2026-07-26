"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { homeFor, roleOf, safeNext } from "@/lib/auth";
import s from "./auth.module.css";

type Errors = Partial<Record<"email" | "password", string>>;

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

function EyeIcon() {
  return (
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
      <path d="M1 8s2.6-4.4 7-4.4S15 8 15 8s-2.6 4.4-7 4.4S1 8 1 8Z" />
      <circle cx="8" cy="8" r="1.9" />
    </svg>
  );
}

/** Only rejects what is definitely not an address. Supabase does the real check. */
const looksLikeEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();

  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBanner(null);

    const data = new FormData(event.currentTarget);
    const email = String(data.get("email") ?? "").trim();
    const password = String(data.get("password") ?? "");

    const next: Errors = {};
    if (!email) next.email = "Enter your email address.";
    else if (!looksLikeEmail(email)) next.email = "That does not look like an email address.";
    if (!password) next.password = "Enter your password.";
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const supabase = createClient();
      const { data: signed, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        // Never say which of the two was wrong: that turns the form into an
        // account-enumeration oracle.
        setBanner("That email and password do not match an account.");
        setSubmitting(false);
        return;
      }

      // Deliberately staying busy through the navigation so a double submit
      // cannot fire a second sign-in.
      // Role decides the landing page, but an explicit ?next= wins so somebody
      // sent here from a results link goes back to that result. safeNext keeps
      // the redirect on this origin.
      router.push(safeNext(params.get("next") ?? undefined, homeFor(roleOf(signed.user))));
      router.refresh();
    } catch {
      setBanner("We could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  const fieldClass = (key: keyof Errors) => (errors[key] ? "field field-error" : "field");
  const invalid = (key: keyof Errors) => (errors[key] ? true : undefined);

  return (
    <>
      {banner && (
        <div className="banner banner-error" role="alert">
          <ErrIcon />
          <span>
            {banner} Check both, or{" "}
            <Link href="/forgot-password">reset your password</Link>.
          </span>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className={fieldClass("email")}>
          <label htmlFor="loginEmail">Work email</label>
          <input
            className="input"
            id="loginEmail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com.my"
            aria-invalid={invalid("email")}
            disabled={submitting}
            autoFocus
          />
          {errors.email && (
            <p className="err">
              <ErrIcon />
              {errors.email}
            </p>
          )}
        </div>

        <div className={fieldClass("password")}>
          <div className={s.labelRow}>
            <label htmlFor="loginPw">Password</label>
            <Link href="/forgot-password">Forgot password?</Link>
          </div>
          <span className="input-affix">
            <input
              className="input"
              id="loginPw"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="current-password"
              aria-invalid={invalid("password")}
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
              disabled={submitting}
            >
              <EyeIcon />
            </button>
          </span>
          {errors.password && (
            <p className="err">
              <ErrIcon />
              {errors.password}
            </p>
          )}
        </div>

        <button className="btn btn-primary btn-block" type="submit" aria-disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Checking your details
            </>
          ) : (
            "Log in"
          )}
        </button>
      </form>
    </>
  );
}
