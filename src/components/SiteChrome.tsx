import Link from "next/link";
import { Brand } from "@/components/Brand";

/**
 * Public marketing chrome. `data-nav="marketing"` tells tokens.css to drop
 * every nav link except the primary CTA below 620px, so the header stays on
 * one line on a phone. Product headers keep their nav.
 */
export function SiteHeader({ current }: { current?: "articles" | "how" }) {
  return (
    <header className="hdr" data-nav="marketing">
      <div className="wrap">
        <Brand />
        <nav>
          <Link className="opt" href="/articles" aria-current={current === "articles" ? "page" : undefined}>
            Articles
          </Link>
          <Link className="opt" href="/#how-it-works" aria-current={current === "how" ? "page" : undefined}>
            How it works
          </Link>
          <Link href="/login">Log in</Link>
          <Link className="btn btn-primary" href="/register" style={{ marginLeft: 8 }}>
            Free P&amp;L analysis
          </Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer>
      <div className="wrap">
        <span>Margin Lab</span>
        <Link href="/articles">Articles</Link>
        <Link href="/login">Log in</Link>
        <Link href="/register">Free analysis</Link>
        <span style={{ marginLeft: "auto" }}>Sample figures shown for illustration.</span>
      </div>
    </footer>
  );
}
