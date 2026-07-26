import type { Metadata } from "next";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { ArticleCard } from "@/components/ArticleCard";
import { ARTICLES } from "@/lib/articles";
import styles from "../marketing.module.css";

export const metadata: Metadata = {
  title: "RGM 101 articles",
  description:
    "Revenue growth management, explained for owner-run businesses. Price, volume and mix, margin bridges, opex ratios and discount payback.",
};

export default function ArticlesIndex() {
  return (
    <>
      <SiteHeader current="articles" />

      <main className="wrap">
        <section className="pagehead">
          <h1>RGM 101</h1>
          <p className="meta">
            Revenue growth management, explained for owner-run businesses. No jargon, no
            gated PDFs.
          </p>
        </section>

        <section className={styles.sectionTight}>
          <div className={styles.indexGrid}>
            {ARTICLES.map((a) => (
              <ArticleCard key={a.slug} article={a} feature />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
