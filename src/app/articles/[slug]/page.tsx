import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import { ArticleCard } from "@/components/ArticleCard";
import { ARTICLES, defaultCta, getArticle, squareImage, wideImage } from "@/lib/articles";
import styles from "./article.module.css";

/** Every article is known at build time, so prerender them all. */
export function generateStaticParams() {
  return ARTICLES.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: "Article not found" };
  return { title: article.title, description: article.dek };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();

  const more = ARTICLES.filter((a) => a.slug !== article.slug).slice(0, 3);
  const cta = article.cta ?? defaultCta;

  return (
    <>
      <SiteHeader current="articles" />

      <main className="wrap" style={{ maxWidth: 820 }}>
        <article>
          <header className={styles.head}>
            <span className={styles.kicker}>{article.kicker}</span>
            <h1>{article.title}</h1>
            <p className={styles.dek}>{article.dek}</p>

            <div className={styles.byline}>
              <span className="avatar avatar-lg" aria-hidden="true">
                {article.initials}
              </span>
              <span className={styles.who}>
                {article.author}
                <span>{article.authorRole}</span>
              </span>
              <span className={styles.when}>
                {article.date} · {article.readMinutes} min read
              </span>
            </div>

            {/*
              Art direction, not a CSS crop. A 16:9 hero letterboxed into a
              phone is ~200px tall and reads as a banner, so mobile gets a
              square tile of the same photograph. See design system 1.7.
            */}
            <figure className={styles.heroFig}>
              <picture>
                <source
                  media="(max-width: 620px)"
                  srcSet={squareImage(article)}
                  width={1200}
                  height={1200}
                />
                <Image
                  src={wideImage(article)}
                  alt={article.imageAlt}
                  width={1600}
                  height={900}
                  priority
                  sizes="(max-width: 620px) 100vw, 780px"
                />
              </picture>
            </figure>
          </header>

          <div className={styles.prose}>
            {article.body.map((block, i) => {
              switch (block.kind) {
                case "h2":
                  return (
                    <h2 key={i} id={block.id}>
                      {block.text}
                    </h2>
                  );
                case "ul":
                  return (
                    <ul key={i}>
                      {block.items.map((t, j) => (
                        <li key={j}>{t}</li>
                      ))}
                    </ul>
                  );
                case "ol":
                  return (
                    <ol key={i}>
                      {block.items.map((t, j) => (
                        <li key={j}>{t}</li>
                      ))}
                    </ol>
                  );
                case "quote":
                  return (
                    <blockquote key={i}>
                      {block.text}
                      <cite>{block.cite}</cite>
                    </blockquote>
                  );
                case "table":
                  return (
                    <div key={i} className={styles.tableWrap}>
                      <table>
                        {/* Some tables are label/value pairs with no real
                            column headings, so an all-empty head is dropped
                            rather than rendered as a blank strip. */}
                        {block.head.some(Boolean) && (
                          <thead>
                            <tr>
                              {block.head.map((h, j) => (
                                <th key={j}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                        )}
                        <tbody>
                          {block.rows.map((row, j) => (
                            <tr key={j}>
                              {row.map((cell, k) => (
                                <td key={k}>{cell}</td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  );
                case "callout":
                  return (
                    <aside key={i} className={styles.callout}>
                      <b>{block.title}</b>
                      {block.text}
                    </aside>
                  );
                default:
                  return (
                    <p key={i} className={block.lead ? styles.lead : undefined}>
                      {block.text}
                    </p>
                  );
              }
            })}
          </div>

          <div className={styles.inlineCta}>
            <p>
              <strong>{cta.title}</strong> {cta.text}
            </p>
            <Link className="btn btn-primary" href="/register">
              {cta.label}
            </Link>
          </div>
        </article>

        <section className={styles.more}>
          <h2>Keep reading</h2>
          <div>
            {more.map((a) => (
              <ArticleCard key={a.slug} article={a} />
            ))}
          </div>
        </section>
      </main>

      <SiteFooter />
    </>
  );
}
