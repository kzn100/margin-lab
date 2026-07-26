"use client";

import { useState } from "react";

/**
 * Asks for an RGM consultation on the analysis currently on screen.
 *
 * Sends nothing but the result id — the server reads the lead and the numbers
 * back out of the database itself, so the button holds no customer data.
 */
export function ConsultButton({ resultId }: { resultId: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function request() {
    if (state !== "idle") return;
    setState("sending");
    setError(null);
    try {
      const response = await fetch("/api/consult", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resultId }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error ?? "Something went wrong. Try again.");
      setState("sent");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong. Try again.");
      setState("idle");
    }
  }

  if (state === "sent")
    return (
      <p className="meta" role="status">
        Request sent. We will be in touch on the number you registered with.
      </p>
    );

  return (
    <>
      <button
        type="button"
        className="btn btn-primary"
        onClick={request}
        disabled={state === "sending"}
      >
        {state === "sending" ? "Sending…" : "RGM consultation request"}
      </button>
      {error && (
        <p className="meta" role="alert" style={{ color: "var(--critical)" }}>
          {error}
        </p>
      )}
    </>
  );
}
