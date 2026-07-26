"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import s from "./auth.module.css";

// Matches the API route's ceiling, which is set by Netlify's function payload
// limit. A twelve-month P&L is kilobytes, so this only catches a wrong file.
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT = [".csv", ".xlsx", ".xlsm", ".xls"];

type Errors = Partial<Record<string, string>>;

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

/** Uploads a P&L for an already-logged-in user. No profile questions — the
 *  account already has them, and pnl_type is derived from the file server-side. */
export function AnalysisForm() {
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [banner, setBanner] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    setBanner(null);
    if (!file) {
      setErrors({ file: "Attach your P&L file." });
      return;
    }

    const data = new FormData();
    data.set("file", file, file.name);

    setSubmitting(true);
    try {
      const res = await fetch("/api/analyses", { method: "POST", body: data });
      const body = (await res.json()) as { resultId?: string; error?: string; field?: string };

      if (!res.ok) {
        if (body.field) setErrors({ [body.field]: body.error ?? "That did not work." });
        else setBanner(body.error ?? "Something went wrong. Try again.");
        setSubmitting(false);
        return;
      }
      // Deliberately not clearing `submitting`: the button stays busy through
      // the navigation so a double-click cannot fire a second upload.
      router.push(`/results/${body.resultId}`);
    } catch {
      setBanner("We could not reach the server. Check your connection and try again.");
      setSubmitting(false);
    }
  }

  const fieldClass = errors.file ? "field field-error" : "field";

  return (
    <>
      {banner && (
        <div className="banner banner-error" role="alert">
          <ErrIcon />
          <span>{banner}</span>
        </div>
      )}

      <form onSubmit={onSubmit} noValidate>
        <div className={fieldClass}>
          <div className={s.labelRow}>
            <label htmlFor="anFile">P&amp;L file</label>
            <a href="/margin-lab-pnl-template.csv" download>
              Download template
            </a>
          </div>

          {!file ? (
            <label
              className={dragging ? `${s.drop} ${s.dropOver}` : s.drop}
              htmlFor="anFile"
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
                id="anFile"
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
            "Run this analysis"
          )}
        </button>
      </form>
    </>
  );
}
