import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/Brand";
import { RegisterForm } from "@/components/RegisterForm";
import s from "@/components/auth.module.css";

export const metadata: Metadata = {
  title: "Free P&L analysis",
  description:
    "Upload twelve months of P&L and get your margin bridge, cost gaps and revenue split back in minutes.",
};

function Tick() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 8.5 6.2 11.7 13 4.9" />
    </svg>
  );
}

export default function RegisterPage() {
  return (
    <>
      {/* Minimal nav: nothing here competes with the form. */}
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
            <h1>Get your free P&amp;L analysis</h1>
            <p className="sub">
              One upload. Your margin bridge, cost gaps and revenue split, back in minutes.
            </p>
            <RegisterForm />
            <p className={s.foot}>
              Already have an account? <Link href="/login">Log in</Link>
            </p>
          </div>
        </section>

        <aside className={s.aside}>
          <div className={s.asideInner}>
            <h2>What you get back, in minutes.</h2>

            <div className={s.proof}>
              <div>
                <div className="v">4.2pp</div>
                <div className="k">Median net margin gain in year one</div>
              </div>
              <div>
                <div className="v">RM 6M</div>
                <div className="k">Typical client revenue band</div>
              </div>
              <div>
                <div className="v">2 min</div>
                <div className="k">From upload to emailed analysis</div>
              </div>
            </div>

            <ul className={s.steps}>
              <li>
                <Tick />
                <span>
                  <b>Margin bridge</b> — where every ringgit of revenue goes before it reaches
                  profit.
                </span>
              </li>
              <li>
                <Tick />
                <span>
                  <b>Cost gaps</b> — each operating expense line against revenue, ranked by size.
                </span>
              </li>
              <li>
                <Tick />
                <span>
                  <b>Revenue split</b> — how much of your growth came from price rather than
                  volume.
                </span>
              </li>
              <li>
                <Tick />
                <span>
                  <b>Your history</b> — every analysis stays on your dashboard to compare against.
                </span>
              </li>
            </ul>

            <blockquote className={s.quote}>
              <p>
                We had been reading the same P&amp;L for four years. The mix split took twenty
                minutes and changed how we price every retail SKU.
              </p>
              <div className="who">
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
