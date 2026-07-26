import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import Script from "next/script";
import QRCode from "qrcode";
import { SiteHeader, SiteFooter } from "@/components/SiteChrome";
import styles from "./about.module.css";

export const metadata: Metadata = {
  title: "About",
  description:
    "Keng Zhing Ng, the RGM and pricing consultant behind Margin Lab — two decades in ecommerce, pricing strategy and margin recovery at Reckitt Benckiser, Mars Wrigley, KSK Land, CelcomDigi and OCR Group.",
};

const LINKEDIN_URL = "https://www.linkedin.com/in/kengzhing/";
const WHATSAPP_URL = "https://wa.me/60128174628";

/** Placeholder address — swap for the real Ara Damansara office details; the map follows it. */
const OFFICE_ADDRESS =
  "Unit 3-1, Level 3, Menara Ara Damansara, Jalan PJU 1A/7A, Ara Damansara, 47301 Petaling Jaya, Selangor, Malaysia";
const MAP_SRC = `https://maps.google.com/maps?q=${encodeURIComponent(OFFICE_ADDRESS)}&z=16&output=embed`;
const MAP_LINK = `https://maps.google.com/maps?q=${encodeURIComponent(OFFICE_ADDRESS)}`;

/** Inline SVG so there is no client JS and no runtime call to a third-party QR API. */
async function qr(url: string) {
  return QRCode.toString(url, {
    type: "svg",
    margin: 1,
    color: { dark: "#0b0b0b", light: "#ffffff" },
  });
}

export default async function AboutPage() {
  const [linkedinQr, whatsappQr] = await Promise.all([qr(LINKEDIN_URL), qr(WHATSAPP_URL)]);

  return (
    <>
      <SiteHeader current="about" />

      <main className="wrap" style={{ maxWidth: 820 }}>
        <article>
          <header className={styles.head}>
            <div className={styles.intro}>
              <div>
                <span className={styles.kicker}>About</span>
                <h1>Keng Zhing Ng</h1>
                <p className={styles.dek}>
                  The RGM and pricing consultant behind Margin Lab — two decades finding the
                  margin that revenue growth was hiding, in ecommerce, real estate and telco
                  P&amp;Ls across London, Jakarta and Kuala Lumpur.
                </p>
              </div>

              <Image
                className={styles.portrait}
                src="/about/keng-portrait.jpg"
                alt="Keng Zhing Ng"
                width={480}
                height={567}
                priority
              />
            </div>

            <div className={styles.byline}>
              <Image
                className="avatar avatar-lg"
                style={{ objectFit: "cover" }}
                src="/about/keng-face.jpg"
                alt=""
                aria-hidden="true"
                width={36}
                height={36}
              />
              <span className={styles.who}>
                Keng Zhing Ng
                <span>Chief Marketing Officer, OCR Group Berhad</span>
              </span>
              <a href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                LinkedIn ↗
              </a>
            </div>
          </header>

          <section className={`tiles ${styles.stats}`}>
            <div className="card tile">
              <div className="lbl">P&amp;L managed</div>
              <div className="val">£51M</div>
            </div>
            <div className="card tile">
              <div className="lbl">Sales growth, YoY</div>
              <div className="val">105%</div>
            </div>
            <div className="card tile">
              <div className="lbl">Subscribers repriced</div>
              <div className="val">20M</div>
            </div>
            <div className="card tile">
              <div className="lbl">Postgraduate</div>
              <div className="val">MSc</div>
            </div>
          </section>

          <div className={styles.prose}>
            <p className={styles.lead}>
              Margin Lab exists because the same question kept showing up in every P&amp;L Keng
              was handed, whether the revenue was in pounds, ringgit or subscribers: growth was
              real, but margin kept leaking out somewhere between the price list and the bottom
              line.
            </p>

            <h2>London: Reckitt Benckiser, global ecommerce and pricing</h2>
            <p>
              After training as a strategy consultant at Ernst &amp; Young and an audit associate
              at Deloitte, Keng spent eight years at Reckitt Benckiser building out its global
              ecommerce and revenue growth management function. He ran Go To Market and Route To
              Market strategy for RB&apos;s top ten markets, then took direct P&amp;L ownership as
              Ecommerce Director for Europe, Turkey and ANZ — 16 markets, £51M in managed P&amp;L,
              and a mandate to integrate the newly-acquired Mead Johnson portfolio online. A stint
              running RB&apos;s global marketplace and pureplayer business followed, growing that
              book 185% in a single year.
            </p>

            <h2>Consumer brands at scale: Mars Wrigley and Stanley Black &amp; Decker</h2>
            <p>
              At Mars Wrigley Confectionery UK, Keng built the ecommerce function from the ground
              up, growing it to £62M in 2018 while adding over 500 basis points of accretive
              margin — proof that digital growth and margin discipline are not a trade-off. A
              return to RB took him to Jakarta to unlock online-to-offline distribution for 3.5
              million Indonesian small shops, before he moved to Stanley Black &amp; Decker as
              Regional Ecommerce Director for East Asia and India, a $100M P&amp;L across ten
              markets that grew 105% year on year under his team of 35.
            </p>

            <h2>KSK Land: where Margin Lab began</h2>
            <p>
              As Chief Commercial Officer of KSK Land, Keng led sales and marketing for 8 Conlay,
              the RM5.4 billion Kempinski-serviced branded residences in Kuala Lumpur&apos;s Golden
              Triangle — restructuring pricing and promotions to deliver both a positive net
              margin swing and a faster rate of sale, and growing sales 105% year on year. The
              work was recognised in 2024 when CEOInsights Asia named him one of Malaysia&apos;s
              Top 10 Chief Commercial Officers. It is also, directly, where Margin Lab was born:
              the price, volume and mix decomposition the tool runs today is the same discipline
              Keng built by hand for 8 Conlay&apos;s pricing committee.
            </p>

            <h2>CelcomDigi and OCR Group: pricing analytics at national scale</h2>
            <p>
              Reporting directly to the CEO in CelcomDigi&apos;s Performance Enhancement unit, Keng
              used pricing value analytics, consumer research and mystery shopping to redesign
              prepaid and postpaid product pricing — a change that touched 20 million subscribers
              on 1 October 2024. He now serves as Chief Marketing Officer of OCR Group Berhad
              (KLSE: OCR), leading sales and marketing across a MYR263M GDV project portfolio
              including Kyra, The Mate, Stellar Damansara and Isola KLCC.
            </p>

            <h2>Why Margin Lab</h2>
            <p>
              Every one of those roles ended up answering the same question by hand: where,
              exactly, is the margin going. <strong>Margin Lab packages that diagnostic</strong>{" "}
              — the margin bridge, the cost gaps, the revenue split — into a two-minute
              upload, so any owner-run business can see what used to take a strategy team weeks
              to build.
            </p>
          </div>

          <section className={styles.facts}>
            <div className="card">
              <h3>Off the clock</h3>
              <p>
                PADI Advanced Diver since 2010 — dived Elphinstone Reef and the Blue Hole in
                Egypt, Richelieu Rock in Thailand and Silfra Rift in Iceland.
              </p>
            </div>
            <div className="card">
              <h3>Startup investor</h3>
              <p>
                Active seed investor in the UK since 2014, backing BrewDog and Landbay among
                others, with exits including Seedrs and Wealthify.
              </p>
            </div>
            <div className="card">
              <h3>Languages</h3>
              <p>English, Bahasa Malaysia, Mandarin and Cantonese.</p>
            </div>
          </section>

          <section className={`card ${styles.touch}`}>
            <div>
              <h2>Get in touch</h2>
              <p className={styles.addr}>
                <strong>Office</strong>
                Unit 3-1, Level 3, Menara Ara Damansara
                <br />
                Jalan PJU 1A/7A, Ara Damansara
                <br />
                47301 Petaling Jaya, Selangor, Malaysia
              </p>

              <iframe
                className={styles.map}
                src={MAP_SRC}
                title="Map showing the Margin Lab office in Ara Damansara"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
              <a className={styles.mapLink} href={MAP_LINK} target="_blank" rel="noopener noreferrer">
                Open in Google Maps
              </a>
            </div>

            <div className={styles.contactCol}>
              <div className={styles.badgeWrap}>
                <div
                  className="badge-base LI-profile-badge"
                  data-locale="en_US"
                  data-size="medium"
                  data-theme="light"
                  data-type="HORIZONTAL"
                  data-vanity="kengzhing"
                  data-version="v1"
                >
                  <a
                    className="badge-base__link LI-simple-link"
                    href={`${LINKEDIN_URL}?trk=profile-badge`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Keng Zhing Ng
                  </a>
                </div>
                <Script src="https://platform.linkedin.com/badges/js/profile.js" strategy="lazyOnload" async />
              </div>

              <div className={styles.qrRow}>
                <a className={styles.qrTile} href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
                  <span dangerouslySetInnerHTML={{ __html: whatsappQr }} />
                  <span>Scan to WhatsApp</span>
                </a>
                <a className={styles.qrTile} href={LINKEDIN_URL} target="_blank" rel="noopener noreferrer">
                  <span dangerouslySetInnerHTML={{ __html: linkedinQr }} />
                  <span>Scan to connect</span>
                </a>
              </div>
            </div>
          </section>

          <div className={styles.inlineCta}>
            <p>
              <strong>Want your own split?</strong> Upload twelve months of P&amp;L and get the
              price, volume and mix decomposition back free.
            </p>
            <Link className="btn btn-primary" href="/register">
              Get my free analysis
            </Link>
          </div>
        </article>
      </main>

      <SiteFooter />
    </>
  );
}
