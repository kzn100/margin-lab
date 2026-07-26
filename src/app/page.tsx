import Link from "next/link";
import { Brand } from "@/components/Brand";

export default function Home() {
  return (
    <>
      <header className="hdr">
        <div className="wrap">
          <Brand />
          <nav>
            <Link className="opt" href="/articles">
              Articles
            </Link>
            <Link href="/login">Login</Link>
            <Link className="btn btn-primary" href="/register">
              Free P&amp;L Analysis
            </Link>
          </nav>
        </div>
      </header>

      <main className="wrap" style={{ paddingBlock: "88px 120px" }}>
        <div className="pagehead">
          <h1>Know where your margin actually goes.</h1>
          <p className="meta">
            Upload one P&amp;L. Get revenue trend, gross margin, opex breakdown
            and a price/volume/mix decomposition back in minutes — free.
          </p>
        </div>
        <div style={{ marginTop: 28, display: "flex", gap: 12 }}>
          <Link className="btn btn-primary" href="/register">
            Get my free analysis
          </Link>
          <Link className="btn btn-ghost" href="/articles">
            Read RGM 101
          </Link>
        </div>
      </main>
    </>
  );
}
