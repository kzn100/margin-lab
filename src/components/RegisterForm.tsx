"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import s from "./auth.module.css";

// Matches the API route's ceiling, which is set by Netlify's function payload
// limit. A twelve-month P&L is kilobytes, so this only catches a wrong file.
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = [".csv", ".xlsx", ".xlsm", ".xls"];

const ROLES = [
  "Owner or founder",
  "Finance director or CFO",
  "Finance manager",
  "Commercial or sales lead",
  "Other",
];

type Errors = Partial<Record<string, string>>;

/** 0–3. Length carries most of the weight; character classes are the tiebreak. */
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

const fmtSize = (bytes: number) =>
  bytes < 1024 * 1024
    ? `${Math.round(bytes / 1024)} KB`
    : `${(bytes / 1024 / 1024).toFixed(1)} MB`;

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

export function RegisterForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const level = passwordLevel(password);

  function pickFile(f: File | null) {
    if (!f) return;
    const ext = "." + (f.name.toLowerCase().split(".").pop() ?? "");
    if (!ACCEPT.includes(ext)) {
      setErrors((e) => ({ ...e, file: `${ext} files are not supported. Upload a CSV or XLSX.` }));
      return;
    }
    if (f.size > MAX_BYTES) {
      setErrors((e) => ({ ...e, file: `That file is ${fmtSize(f.size)}. The limit is 5 MB.` }));
      return;
    }
    setErrors((e) => ({ ...e, file: undefined }));
    setFile(f);
  }

  function validate(data: FormData): Errors {
    const next: Errors = {};
    const req = (k: string, msg: string) => {
      if (!String(data.get(k) ?? "").trim()) next[k] = msg;
    };
    req("name", "Enter your name.");
    req("company", "Enter your company.");
    req("job_role", "Select your role.");
    req("mobile", "Enter a mobile number we can reach you on.");

    const email = String(data.get("email") ?? "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email address.";

    const pw = String(data.get("password") ?? "");
    if (pw.length < 8) next.password = "Use at least 8 characters.";

    if (!file) next.file = "Attach your P&L file.";
    return next;
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const data = new FormData(event.currentTarget);
    const found = validate(data);
    setErrors(found);
    setBanner(null);
    if (Object.keys(found).length) {
      formRef.current?.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    // The <input type="file"> is not inside the form's own data when the user
    // dropped it, so attach the tracked File explicitly.
    data.set("file", file!, file!.name);

    setSubmitting(true);
    try {
      const res = await fetch("/api/register", { method: "POST", body: data });
      const body = (await res.json()) as { resultId?: string; error?: string; field?: string };

      if (!res.ok) {
        if (body.field) setErrors({ [body.field]: body.error ?? "That did not work." });
        else setBanner(body.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      // Deliberately not clearing `submitting`: the button stays busy through
      // the navigation so a double-click cannot fire a second registration.
      router.push(`/results/${body.resultId}`);
    } catch {
      setBanner("We could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  const fieldClass = (key: string) => (errors[key] ? `field ${"field-error"}` : "field");
  const invalid = (key: string) => (errors[key] ? true : undefined);

  return (
    <>
      {banner && (
        <div className="banner banner-error" role="alert">
          <ErrIcon />
          <span>{banner}</span>
        </div>
      )}

      <form ref={formRef} onSubmit={onSubmit} noValidate>
        <div className={s.pair}>
          <div className={fieldClass("name")}>
            <label htmlFor="regName">Full name</label>
            <input
              className="input"
              id="regName"
              name="name"
              type="text"
              autoComplete="name"
              aria-invalid={invalid("name")}
              disabled={submitting}
            />
            {errors.name && (
              <p className="err">
                <ErrIcon />
                {errors.name}
              </p>
            )}
          </div>
          <div className={fieldClass("company")}>
            <label htmlFor="regCompany">Company</label>
            <input
              className="input"
              id="regCompany"
              name="company"
              type="text"
              autoComplete="organization"
              aria-invalid={invalid("company")}
              disabled={submitting}
            />
            {errors.company && (
              <p className="err">
                <ErrIcon />
                {errors.company}
              </p>
            )}
          </div>
        </div>

        <div className={s.pair}>
          <div className={fieldClass("job_role")}>
            <label htmlFor="regRole">Job role</label>
            <select
              className="input"
              id="regRole"
              name="job_role"
              defaultValue=""
              aria-invalid={invalid("job_role")}
              disabled={submitting}
            >
              <option value="">Select one</option>
              {ROLES.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            {errors.job_role && (
              <p className="err">
                <ErrIcon />
                {errors.job_role}
              </p>
            )}
          </div>
          <div className={fieldClass("mobile")}>
            <label htmlFor="regMobile">Mobile</label>
            <input
              className="input"
              id="regMobile"
              name="mobile"
              type="tel"
              autoComplete="tel"
              placeholder="+60 12 345 6789"
              aria-invalid={invalid("mobile")}
              disabled={submitting}
            />
            {errors.mobile && (
              <p className="err">
                <ErrIcon />
                {errors.mobile}
              </p>
            )}
          </div>
        </div>

        <div className={fieldClass("email")}>
          <label htmlFor="regEmail">Work email</label>
          <input
            className="input"
            id="regEmail"
            name="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com.my"
            aria-invalid={invalid("email")}
            disabled={submitting}
          />
          {errors.email && (
            <p className="err">
              <ErrIcon />
              {errors.email}
            </p>
          )}
        </div>

        <div className={fieldClass("password")}>
          <label htmlFor="regPw">Password</label>
          <span className="input-affix">
            <input
              className="input"
              id="regPw"
              name="password"
              type={showPw ? "text" : "password"}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              aria-invalid={invalid("password")}
              disabled={submitting}
            />
            <button
              type="button"
              onClick={() => setShowPw((v) => !v)}
              aria-label={showPw ? "Hide password" : "Show password"}
            >
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
            </button>
          </span>
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
          {errors.password && (
            <p className="err">
              <ErrIcon />
              {errors.password}
            </p>
          )}
        </div>

        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend>Which P&amp;L are you uploading?</legend>
          <div className="choice-row">
            <label className="choice">
              <input type="radio" name="pnl_type" value="full-year" defaultChecked />
              <span>
                <span className="t">Full year</span>
                <span className="d">One row per month, 12 months</span>
              </span>
            </label>
            <label className="choice">
              <input type="radio" name="pnl_type" value="monthly" />
              <span>
                <span className="t">Part year</span>
                <span className="d">Fewer than 12 months</span>
              </span>
            </label>
          </div>
        </fieldset>

        <div className={fieldClass("file")}>
          <div className={s.labelRow}>
            <label htmlFor="regFile">P&amp;L file</label>
            <a href="/margin-lab-pnl-template.csv" download>
              Download template
            </a>
          </div>

          {!file ? (
            <label
              className={dragging ? `${s.drop} ${s.dropOver}` : s.drop}
              htmlFor="regFile"
              onDragOver={(e) => {
                e.preventDefault();
                setDragging(true);
              }}
              onDragLeave={() => setDragging(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragging(false);
                pickFile(e.dataTransfer.files[0] ?? null);
              }}
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M12 15.5V4M8 7.6 12 3.6l4 4" />
                <path d="M3.5 15v3.5a2 2 0 0 0 2 2h13a2 2 0 0 0 2-2V15" />
              </svg>
              <span className={s.t}>Drop your file here, or browse</span>
              <span className={s.d}>CSV or XLSX, up to 5 MB, using our template</span>
              <input
                ref={fileInput}
                id="regFile"
                name="file"
                type="file"
                accept=".csv,.xlsx,.xlsm,.xls"
                className="vh"
                onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
                disabled={submitting}
              />
            </label>
          ) : (
            <div className={s.filePill}>
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
                <path d="M9 1.5H4.5a1.5 1.5 0 0 0-1.5 1.5v10a1.5 1.5 0 0 0 1.5 1.5h7a1.5 1.5 0 0 0 1.5-1.5V5.5Z" />
                <path d="M9 1.5v4h4" />
              </svg>
              <span className={s.n}>{file.name}</span>
              <span className={s.size}>{fmtSize(file.size)}</span>
              <button
                type="button"
                aria-label="Remove file"
                disabled={submitting}
                onClick={() => {
                  setFile(null);
                  if (fileInput.current) fileInput.current.value = "";
                }}
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 4l8 8M12 4l-8 8" />
                </svg>
              </button>
            </div>
          )}

          {errors.file && (
            <p className="err">
              <ErrIcon />
              {errors.file}
            </p>
          )}
        </div>

        <button className="btn btn-primary btn-block" type="submit" disabled={submitting}>
          {submitting ? (
            <>
              <span className="spinner" aria-hidden="true" />
              Analysing your P&amp;L…
            </>
          ) : (
            "Get my free analysis"
          )}
        </button>

        <p className={s.legal}>
          By continuing you agree to our <a href="/terms">Terms</a> and{" "}
          <a href="/privacy">Privacy Policy</a>. Your P&amp;L file is stored privately and is never
          shared.
        </p>
      </form>
    </>
  );
}
