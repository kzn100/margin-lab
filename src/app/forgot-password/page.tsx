import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";
import s from "@/components/auth.module.css";

export const metadata: Metadata = { title: "Reset your password" };

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ expired?: string }>;
}) {
  const { expired } = await searchParams;

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
            <h1>Reset your password</h1>
            <p className="sub">
              Enter the address you registered with and we will email you a link to set a new
              password.
            </p>

            <ForgotPasswordForm expired={expired === "1"} />

            <p className={s.foot}>
              Remembered it? <Link href="/login">Log in</Link>
            </p>
          </div>
        </section>

        <aside className={s.aside}>
          <div className={s.asideInner}>
            <h2>Your analyses are waiting.</h2>
            <p style={{ fontSize: 15, color: "var(--text-secondary)", lineHeight: 1.6 }}>
              Every P&amp;L you have uploaded stays on your dashboard, so you can watch the margin
              move from one upload to the next.
            </p>
          </div>
        </aside>
      </main>
    </>
  );
}
