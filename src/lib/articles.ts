/**
 * RGM 101 article content.
 *
 * The spec (docs/01-landing-and-articles.md) calls for MDX files in the repo.
 * This typed module is a deliberate stand-in so the routes and the landing
 * page work end to end today; swapping the `body` field for MDX is a
 * self-contained change that does not touch the routes or the cards.
 */

export type Block =
  | { kind: "p"; text: string; lead?: boolean }
  | { kind: "h2"; text: string; id: string }
  | { kind: "ul"; items: string[] }
  | { kind: "ol"; items: string[] }
  | { kind: "quote"; text: string; cite: string }
  | { kind: "callout"; title: string; text: string };

export type Article = {
  slug: string;
  title: string;
  dek: string;
  kicker: string;
  author: string;
  authorRole: string;
  initials: string;
  date: string;
  readMinutes: number;
  /**
   * Local asset basename under /public/articles. Two crops per article:
   * `-wide.jpg` (16:9) and `-square.jpg` (1:1) for the art-directed mobile
   * hero. Local rather than a remote placeholder service so the build has no
   * runtime dependency on a third party and works offline.
   */
  image: string;
  imageAlt: string;
  body: Block[];
};

export const ARTICLES: Article[] = [
  {
    slug: "price-volume-mix",
    title: "Price, volume and mix: the only three ways revenue moves",
    dek: "Revenue went up 15.9 percent. Until you split it three ways, you do not know whether that is good news.",
    kicker: "RGM 101",
    author: "Nurul Aziz",
    authorRole: "Principal, Margin Lab",
    initials: "NA",
    date: "14 Jul 2026",
    readMinutes: 7,
    image: "price-volume-mix",
    imageAlt: "Packaged goods on a wholesale shelf, price labels facing forward",
    body: [
      {
        kind: "p",
        lead: true,
        text: "A distributor we worked with last year opened a board deck with one line: revenue up 15.9 percent. The room relaxed. Six months later they were out of working capital.",
      },
      {
        kind: "p",
        text: "Revenue is a product of two things you control and one thing you usually do not notice. Every ringgit of movement resolves into exactly three effects, and they behave nothing alike.",
      },
      { kind: "h2", id: "effects", text: "The three effects" },
      {
        kind: "p",
        text: "Price is what you charge. A price effect flows almost entirely to gross profit because the cost of the unit did not change. It is the most valuable ringgit of growth you can earn, and the one customers notice first.",
      },
      {
        kind: "p",
        text: "Volume is how many units move. A volume effect brings its own cost with it. You keep the gross margin percentage, so profit grows, but so does working capital, warehouse space and delivery cost.",
      },
      {
        kind: "p",
        text: "Mix is which products moved. Mix is the effect nobody budgets for. If growth came from your cheapest line, revenue rises while blended margin falls. Nothing on the income statement flags it.",
      },
      {
        kind: "callout",
        title: "The test",
        text: "If you cannot say which of the three drove last quarter, you cannot repeat it on purpose. You got a result, not a lever.",
      },
      { kind: "h2", id: "hiding", text: "Why mix hides" },
      {
        kind: "p",
        text: "Mix does not appear on a P&L. It has no line item. It shows up as a slow drift in gross margin percentage that gets explained away as input cost pressure for three or four quarters in a row.",
      },
      {
        kind: "ul",
        items: [
          "Gross margin fell 40 basis points, so someone blames raw material prices.",
          "Raw material prices were flat, so someone blames freight.",
          "Freight was flat, and by now nobody is looking.",
        ],
      },
      {
        kind: "quote",
        text: "We were celebrating a number that was quietly getting more expensive to produce.",
        cite: "Finance manager, Klang Valley distributor",
      },
      { kind: "h2", id: "run-it", text: "How to run the split yourself" },
      {
        kind: "p",
        text: "You need unit volumes by SKU for both periods, not just revenue. Most businesses have this and have never joined it to the income statement.",
      },
      {
        kind: "ol",
        items: [
          "Price effect. Change in average price, multiplied by prior-period volume.",
          "Volume effect. Change in total volume, multiplied by prior-period average price.",
          "Mix effect. The residual. If your three effects do not sum exactly to the revenue change, the residual is mix, and it is real.",
        ],
      },
      {
        kind: "p",
        text: "Run it monthly, not annually. Mix drifts slowly enough that a yearly view catches it a year late.",
      },
    ],
  },
  {
    slug: "opex-ratio",
    title: "The opex ratio your accountant will not show you",
    dek: "Absolute operating expense always rises. The number that matters is what it costs you per ringgit of revenue.",
    kicker: "RGM 101",
    author: "Nurul Aziz",
    authorRole: "Principal, Margin Lab",
    initials: "NA",
    date: "28 Jun 2026",
    readMinutes: 6,
    image: "opex-ratio",
    imageAlt: "Warehouse aisle with pallet racking",
    body: [
      {
        kind: "p",
        lead: true,
        text: "Every management account shows operating expense in ringgit. Almost none show it as a share of revenue, which is the only version that tells you whether the business is getting more efficient or less.",
      },
      {
        kind: "p",
        text: "Opex rising 8 percent sounds bad. Against revenue rising 16 percent it is the opposite: the business just bought two points of net margin.",
      },
      { kind: "h2", id: "ratio", text: "Track the ratio, not the total" },
      {
        kind: "p",
        text: "Divide each opex category by revenue for the same period and plot it monthly. Categories that climb while revenue climbs are the ones quietly eating the gains.",
      },
      {
        kind: "callout",
        title: "Rule of thumb",
        text: "If payroll is above 17 percent of revenue in a distribution business, the next hire needs a written payback, not a headcount slot.",
      },
    ],
  },
  {
    slug: "reading-a-pnl-bridge",
    title: "Reading a P&L bridge in ninety seconds",
    dek: "Six bars between revenue and net profit. Here is what each one is allowed to tell you, and what it is not.",
    kicker: "RGM 101",
    author: "Nurul Aziz",
    authorRole: "Principal, Margin Lab",
    initials: "NA",
    date: "09 Jun 2026",
    readMinutes: 4,
    image: "reading-a-pnl-bridge",
    imageAlt: "Printed financial statement on a desk",
    body: [
      {
        kind: "p",
        lead: true,
        text: "A bridge turns the income statement into a single picture: what came in, what left, and what survived. Read left to right and the whole year is one sentence.",
      },
      {
        kind: "p",
        text: "The two bars that matter most are the ones you can act on this quarter: cost of goods sold and operating expense. Finance costs and tax are consequences, not levers.",
      },
      { kind: "h2", id: "shape", text: "The shape tells you the problem" },
      {
        kind: "p",
        text: "A tall COGS bar with a thin opex bar is a pricing or sourcing problem. A modest COGS bar with a tall opex bar is a structure problem. They need completely different responses, and the bridge shows you which one you have before anyone opens a spreadsheet.",
      },
    ],
  },
  {
    slug: "when-a-discount-pays",
    title: "When a discount pays for itself",
    dek: "A 10 percent discount at a 40 percent margin needs 33 percent more volume to break even. Most promotions never get there.",
    kicker: "RGM 101",
    author: "Nurul Aziz",
    authorRole: "Principal, Margin Lab",
    initials: "NA",
    date: "21 May 2026",
    readMinutes: 8,
    image: "when-a-discount-pays",
    imageAlt: "Wholesale market stall with produce crates",
    body: [
      {
        kind: "p",
        lead: true,
        text: "Discounting is the fastest lever in the business and the least measured. The arithmetic is not complicated, it is just rarely done before the promotion runs.",
      },
      {
        kind: "p",
        text: "Break-even volume uplift is the discount divided by the margin that survives it. At a 40 percent gross margin, a 10 percent discount leaves 30 points, so you need a third more units simply to stand still.",
      },
      { kind: "h2", id: "after", text: "Measure the month after, too" },
      {
        kind: "p",
        text: "Most promotions pull demand forward rather than creating it. If the following month dips below trend by roughly what the promotion added, you bought volume you already had.",
      },
    ],
  },
];

export function getArticle(slug: string): Article | undefined {
  return ARTICLES.find((a) => a.slug === slug);
}

export function wideImage(article: Article): string {
  return `/articles/${article.image}-wide.jpg`;
}

export function squareImage(article: Article): string {
  return `/articles/${article.image}-square.jpg`;
}
