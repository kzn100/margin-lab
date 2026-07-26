import Image from "next/image";
import Link from "next/link";
import { type Article, squareImage, wideImage } from "@/lib/articles";
import styles from "./ArticleCard.module.css";

/**
 * `feature` is the large lead card. Everything else is a compact row so a
 * blog section reads as one lead plus supporting items, rather than the
 * three-identical-cards row that every template ships with.
 */
export function ArticleCard({ article, feature = false }: { article: Article; feature?: boolean }) {
  if (feature) {
    return (
      <Link href={`/articles/${article.slug}`} className={`${styles.card} ${styles.feature}`}>
        <Image
          className={styles.img}
          src={wideImage(article)}
          alt={article.imageAlt}
          width={1600}
          height={900}
          sizes="(max-width: 900px) 100vw, 620px"
        />
        <span className={styles.kicker}>{article.kicker}</span>
        <h3 className={styles.titleLg}>{article.title}</h3>
        <p className={styles.dek}>{article.dek}</p>
        <span className={styles.meta}>
          {article.date} · {article.readMinutes} min read
        </span>
      </Link>
    );
  }

  return (
    <Link href={`/articles/${article.slug}`} className={`${styles.card} ${styles.row}`}>
      <Image
        className={styles.thumb}
        src={squareImage(article)}
        alt={article.imageAlt}
        width={1200}
        height={1200}
        sizes="96px"
      />
      <span className={styles.rowBody}>
        <h3 className={styles.titleSm}>{article.title}</h3>
        <span className={styles.meta}>{article.readMinutes} min read</span>
      </span>
    </Link>
  );
}
