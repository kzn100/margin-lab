import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Brand } from "@/components/Brand";
import { LoginForm } from "@/components/LoginForm";
import s from "@/components/auth.module.css";

export const metadata: Metadata = {
  title: "Log in",
  description: "Sign in to see your P&L analyses and upload history.",
};

export default function LoginPage() {
  return (
    <>
      {/* Minimal nav: nothing here competes with the form. */}
      <header className="hdr">
        <div className="wrap">
          <Brand />
          <nav>
            <Link href="/register">Free P&amp;L analysis</Link>
          </nav>
        </div>
      </header>

      <main className={s.auth}>
        <section className={s.form}>
          <div className={s.inner}>
            <h1>Log in to Margin Lab</h1>
            <p className="sub">Your past analyses and uploads are on your dashboard.</p>

            {/*
              LoginForm reads ?next= to bounce the user back where they were
              sent from, and useSearchParams needs a Suspense boundary or the
              whole route opts out of static rendering.
            */}
            <Suspense fallback={null}>
              <LoginForm />
            </Suspense>

            <p className={s.foot}>
              No account yet? <Link href="/register">Get a free P&amp;L analysis</Link>
            </p>
          </div>
        </section>

        {/* Returning users do not need the full pitch, so this aside stays short. */}
        <aside className={s.aside}>
          <div className={s.asideInner}>
            <h2>Most P&amp;Ls hide the same three things.</h2>

            <div className={s.proof}>
              <div>
                <div className={s.v}>4.2pp</div>
                <div className={s.k}>Median net margin gain in year one</div>
              </div>
              <div>
                <div className={s.v}>RM 6M</div>
                <div className={s.k}>Typical client revenue band</div>
              </div>
              <div>
                <div className={s.v}>2 min</div>
                <div className={s.k}>From upload to emailed analysis</div>
              </div>
            </div>

            <blockquote className={s.quote}>
              <p>
                We had been reading the same P&amp;L for four years. The mix split took twenty
                minutes and changed how we price every retail SKU.
              </p>
              <div className={s.who}>
                <b>Faridah Ismail</b>
                Finance Director, Teratai Beverages
              </div>
            </blockquote>
          </div>
        </aside>
      </main>
    </>
  );
}
