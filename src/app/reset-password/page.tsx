import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";
import s from "@/components/auth.module.css";

export const metadata: Metadata = { title: "Set a new password" };

/**
 * Reached from the emailed link via /auth/confirm, which has already exchanged
 * the token for a recovery session. Not in the middleware matcher: the session
 * that authorises the update is the one just created, and bouncing an
 * unauthenticated visitor to /login would strand anyone whose link is stale —
 * updateUser fails with a clear message instead.
 */
export default function ResetPasswordPage() {
  return (
    <>
      <header className="hdr">
        <div className="wrap">
          <Brand />
          <nav>
            <Link href="/login">Log in</Link>
          </nav>
        </div>
      </header>

      <main className={s.auth}>
        <section className={s.form}>
          <div className={s.inner}>
            <h1>Set a new password</h1>
            <p className="sub">Pick something you have not used here before.</p>
            <ResetPasswordForm />
            <p className={s.foot}>
              Link stopped working? <Link href="/forgot-password">Request a new one</Link>
            </p>
          </div>
        </section>

        <aside className={s.aside}>
          <div className={s.asideInner}>
            <h2>One more step and you are back in.</h2>
          </div>
        </aside>
      </main>
    </>
  );
}
