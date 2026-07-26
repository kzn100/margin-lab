import Link from "next/link";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { ArticleCard } from "@/components/ArticleCard";
import { MarginLadderChart, RevenueSplitChart } from "@/components/Charts";
import { HeroChart } from "@/components/HeroChart";
import { ARTICLES } from "@/lib/articles";
import styles from "./marketing.module.css";

export default function Home() {
  const [lead, ...rest] = ARTICLES;

  return (
    <>
      <SiteHeader />

      <main>
        {/* ---------- hero: copy left, a real chart right ---------- */}
        <section className="wrap">
          <div className={styles.hero}>
            <div className={styles.heroCopy}>
              <h1>Find the margin your P&amp;L is hiding.</h1>
              <p>
                Upload twelve months of P&amp;L. Get your margin bridge, cost gaps and revenue
                split back in two minutes.
              </p>
              <div className={styles.heroCtas}>
                <Link className="btn btn-primary" href="/register">
                  Get my free analysis
                </Link>
                <Link className="btn btn-ghost" href="/articles">
                  Read RGM 101
                </Link>
              </div>
            </div>

            <HeroChart />
          </div>

          <div className={styles.proof}>
            <div>
              <strong>4.2pp</strong>
              <span>Median net margin gain in year one</span>
            </div>
            <div>
              <strong>RM 6M</strong>
              <span>Typical client revenue band</span>
            </div>
            <div>
              <strong>2 min</strong>
              <span>From upload to emailed analysis</span>
            </div>
          </div>
        </section>

        {/* ---------- what you get ---------- */}
        <section className={`wrap ${styles.section}`}>
          <div className={styles.sectionHead}>
            <h2>This is what lands in your inbox.</h2>
            <p>
              Real charts from a real analysis, not a slide deck. No discovery call before you
              see anything.
            </p>
          </div>

          <div className={styles.samples}>
            <figure className={styles.sampleCard}>
              <h3>Margin ladder by month</h3>
              <p>Gross, operating and net margin. Percentages get their own chart.</p>
              <div className={styles.plot}>
                <MarginLadderChart />
              </div>
              <div className={styles.legend}>
                <span>
                  <i style={{ background: "var(--s1)" }} />
                  Gross margin
                </span>
                <span>
                  <i style={{ background: "var(--s2)" }} />
                  Operating margin
                </span>
                <span>
                  <i style={{ background: "var(--s3)" }} />
                  Net margin
                </span>
              </div>
            </figure>

            <figure className={styles.sampleCard}>
              <h3>Why revenue moved</h3>
              <p>The price, volume and mix split, on a true zero baseline.</p>
              <div className={styles.plot}>
                <RevenueSplitChart />
              </div>
              <div className={styles.legend}>
                <span>
                  <i className="dot" style={{ background: "var(--good)" }} />
                  Added
                </span>
                <span>
                  <i className="dot" style={{ background: "var(--critical)" }} />
                  Removed
                </span>
              </div>
            </figure>
          </div>
        </section>

        {/* ---------- how it works ---------- */}
        <section className={`wrap ${styles.section}`} id="how-it-works">
          <div className={styles.sectionHead}>
            <h2>Three steps, no meeting.</h2>
          </div>
          <div className={styles.steps}>
            <div className={styles.step}>
              <span className={styles.stepOrd}>01</span>
              <h3>Upload your P&amp;L</h3>
              <p>Our template, CSV or Excel. Twelve months, one row per month.</p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepOrd}>02</span>
              <h3>We run the decomposition</h3>
              <p>
                Margin bridge, operating expense against revenue, and the price, volume and mix
                split.
              </p>
            </div>
            <div className={styles.step}>
              <span className={styles.stepOrd}>03</span>
              <h3>You get the levers, ranked</h3>
              <p>Emailed in minutes, with the three moves worth the most ringgit.</p>
            </div>
          </div>
        </section>

        {/* ---------- featured writing ---------- */}
        <section className={`wrap ${styles.section}`}>
          <div className={styles.writingHead}>
            <h2>Read the thinking first.</h2>
            <Link href="/articles">All articles</Link>
          </div>
          <div className={styles.writing}>
            <ArticleCard article={lead} feature />
            <div>
              {rest.map((a) => (
                <ArticleCard key={a.slug} article={a} />
              ))}
            </div>
          </div>
        </section>

        {/* ---------- testimonial ---------- */}
        <section className={`wrap ${styles.sectionTight}`}>
          <div className={styles.quoteBand}>
            <blockquote>
              <p>
                We had been reading the same P&amp;L for four years. The mix split took twenty
                minutes and changed how we price every retail SKU.
              </p>
              <div className={styles.quoteWho}>
                <b>Faridah Ismail</b>
                Finance Director, Teratai Beverages
              </div>
            </blockquote>
          </div>
        </section>

        {/* ---------- closing CTA ---------- */}
        <section className={`wrap ${styles.sectionTight}`}>
          <div className="cta">
            <div>
              <h2>Your margin gap is probably four points wide.</h2>
              <p>
                Peers at RM 6M revenue run a 9.2 percent net margin. Closing half that gap is
                worth RM 310k a year. The analysis is free and takes one upload.
              </p>
            </div>
            <Link className="btn btn-primary" href="/register">
              Get my free analysis
            </Link>
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
