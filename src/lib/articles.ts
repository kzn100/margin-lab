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
  | { kind: "callout"; title: string; text: string }
  | { kind: "table"; head: string[]; rows: string[][] };

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
  /**
   * Closing call to action. Written per article so the ask follows the
   * argument the reader just finished, rather than one generic block on
   * every page. `defaultCta` is the fallback for articles without one.
   */
  cta?: { title: string; text: string; label: string };
};

export const defaultCta = {
  title: "Want your own split?",
  text: "Upload twelve months of P&L and we will return the price, volume and mix decomposition, free.",
  label: "Get my analysis",
};

export const ARTICLES: Article[] = [
  {
    slug: "growing-broke-revenue-up-margin-down",
    title: "Growing broke: why a 10 percent revenue year can be bad news",
    dek: "Two companies grew revenue 10 percent. One got healthier, one got sicker. The decomposition tells you which one you are, before your CFO does.",
    kicker: "RGM 101",
    author: "Keng Zhing Ng",
    authorRole: "Principal, Margin Lab",
    initials: "KZ",
    date: "26 Jul 2026",
    readMinutes: 6,
    image: "growing-broke-revenue-up-margin-down",
    imageAlt:
      "A long supermarket checkout queue of heaped trolleys at peak hour",
    body: [
      {
        kind: "p",
        lead: true,
        text: "Two companies just closed their financial year. Both grew revenue 10 percent. Both chief executives presented the same proud slide. One of them had a much better year than the other, and the slide does not say which.",
      },
      {
        kind: "p",
        text: "Company A grew by cutting price and chasing volume. Shelves everywhere, promotions every month, units flying out the door. Company B grew by raising price and holding volume. A quiet year, no fireworks. In most boardrooms, Company A gets the applause.",
      },
      { kind: "h2", id: "arithmetic", text: "The same 10 percent, torn open" },
      {
        kind: "p",
        text: "Give both the same starting point: 100,000 units at RM 10.00, cost of goods RM 7.00 a unit. That is RM 1 million of revenue and RM 300,000 of gross profit.",
      },
      {
        kind: "table",
        head: ["", "Company A", "Company B"],
        rows: [
          ["Price move", "−12% to RM 8.80", "+10% to RM 11.00"],
          ["Volume move", "+25% to 125,000", "flat at 100,000"],
          ["Revenue", "RM 1.10M", "RM 1.10M"],
          ["Gross profit", "RM 225,000", "RM 400,000"],
          ["Gross margin", "20.5%", "36.4%"],
        ],
      },
      {
        kind: "p",
        text: "Same headline. A RM 175,000 gross profit gap, and 58 percentage points of profit growth between two identical press releases. Company A grew revenue and destroyed a quarter of its gross profit doing it.",
      },
      {
        kind: "callout",
        title: "Why the asymmetry never goes away",
        text: "Every extra unit you sell carries RM 7.00 of cost out of the door with it. A price move carries nothing. Volume growth pays your factory first. Price growth pays you first.",
      },
      { kind: "h2", id: "share", text: "But volume growth is market share" },
      {
        kind: "p",
        text: "Sometimes it is. If you are a new brand buying awareness, if the category grows through penetration, if you are in a genuine share war where shelf presence compounds, volume-led growth can be exactly right. The point is not that volume is bad.",
      },
      {
        kind: "p",
        text: "The point is that most companies do not know which growth they had. They see plus 10 percent and stop asking. The revenue line hides the story, and you have to decompose it to get the story back.",
      },
      { kind: "h2", id: "pvm", text: "The tool: price, volume and mix" },
      {
        kind: "p",
        text: "The decomposition splits any revenue change into three drivers, and they behave nothing alike.",
      },
      {
        kind: "ul",
        items: [
          "Volume. Did we sell more units?",
          "Price. Did we get more per unit, like for like?",
          "Mix. Did the blend shift toward cheaper or more expensive products?",
        ],
      },
      {
        kind: "p",
        text: "The third one is the silent killer. A business can hold every price, grow every SKU's units, and still lose margin, because the growth concentrated in the low-margin end of the portfolio. Record quarters where all of the growth came from the 24 percent margin value pack while the 42 percent margin premium pack quietly shrank. Revenue up, margin structurally down, and nobody owns it because no single price was cut.",
      },
      {
        kind: "quote",
        text: "That pattern has a name in the trade: growing broke.",
        cite: "The version nobody puts on the slide",
      },
      { kind: "h2", id: "run-it", text: "Run this on your own numbers this week" },
      {
        kind: "p",
        text: "You do not need software. Take your two biggest SKUs, last year against this year.",
      },
      {
        kind: "ol",
        items: [
          "Volume effect. Total unit change, multiplied by last year's average price.",
          "Price effect. Price change per SKU, multiplied by this year's units, summed.",
          "Mix effect. The remainder of the revenue change after volume and price.",
        ],
      },
      {
        kind: "p",
        text: "Then ask three questions. Is the mix effect negative, which means growth is being financed by margin? Which lever produced the price effect, a real list price move or promo depth quietly eroding it? And if your CFO decomposed your great year this way at the next board meeting, would you want to have seen it first?",
      },
      {
        kind: "p",
        text: "That last one is the honest question. The decomposition is not an academic exercise. It is the difference between presenting your growth story and having it presented to you.",
      },
      { kind: "h2", id: "discipline", text: "The bigger discipline" },
      {
        kind: "p",
        text: "This is the entry point to revenue growth management: the five levers sitting between your list price and your realised profit, which are pricing, price-pack architecture, mix, trade promotion and trade terms. Companies that practise it do not grow less. They grow deliberately, knowing which side of revenue equals price times volume each initiative pulls, and what it does to margin before it ships.",
      },
      {
        kind: "p",
        text: "Revenue is a headline. Margin is the health record.",
      },
    ],
    cta: {
      title: "Which growth did you have?",
      text: "Upload twelve months of P&L with monthly units and the analysis returns your price, volume and mix split, so you can see whether last year's revenue growth paid you or paid your factory.",
      label: "Get my free split",
    },
  },
  {
    slug: "promo-that-pays-baseline-subsidy",
    title: "You are paying shoppers who would have bought anyway",
    dek: "Most promotions look profitable because the ROI maths quietly ignores the baseline. Here is the calculation that separates volume you bought from volume you already had.",
    kicker: "RGM 101",
    author: "Keng Zhing Ng",
    authorRole: "Principal, Margin Lab",
    initials: "KZ",
    date: "26 Jul 2026",
    readMinutes: 7,
    image: "promo-that-pays-baseline-subsidy",
    imageAlt:
      "A blank red promotional flag on a shelf that is still completely full",
    body: [
      {
        kind: "p",
        lead: true,
        text: "Here is a promotion that looks like a win. Normal week: 12,000 units at RM 10.00, RM 4.00 of gross margin each. Campaign week: 25 percent off, and units jump to 20,000. Units up 67 percent, the buyer is happy, the category manager wants a repeat next month.",
      },
      {
        kind: "p",
        text: "Now do the calculation almost nobody does.",
      },
      { kind: "h2", id: "two-questions", text: "The two questions that decide every promotion" },
      {
        kind: "p",
        text: "First, how many of those units were incremental? You sold 20,000. You would have sold 12,000 anyway. Only 8,000 units are incremental, the ones the promotion actually bought you.",
      },
      {
        kind: "p",
        text: "Second, how many units did you discount? All 20,000. Including the 12,000 that were coming to you at full price.",
      },
      {
        kind: "callout",
        title: "Baseline subsidy",
        text: "You gave away RM 2.50 per unit on 20,000 units, but only 8,000 of them were for sale. The other 12,000 × RM 2.50 = RM 30,000 went to shoppers who had already decided to buy you.",
      },
      { kind: "h2", id: "the-sum", text: "Do the full sum" },
      {
        kind: "table",
        head: ["", ""],
        rows: [
          ["Incremental units", "8,000"],
          ["Margin per unit during promo (RM 4.00 − RM 2.50)", "RM 1.50"],
          ["Incremental gross profit", "RM 12,000"],
          ["Baseline units subsidised", "12,000"],
          ["Discount per baseline unit", "RM 2.50"],
          ["Baseline subsidy, pure cost", "RM 30,000"],
          ["Net result", "−RM 18,000"],
        ],
      },
      {
        kind: "p",
        text: "A promotion that grew units 67 percent destroyed RM 18,000 of gross profit. Total discount given away was RM 50,000 and it generated RM 12,000 of incremental gross profit, a return of 0.24. Every ringgit of promotional depth came back as twenty-four sen.",
      },
      {
        kind: "p",
        text: "And this is the flattering version. It ignores forward buying, where the trade loads up cheap and skips your next order. It ignores cannibalisation of your own full-price SKUs. It ignores the fact that repeated depth teaches shoppers your real price is the deal price.",
      },
      { kind: "h2", id: "baseline", text: "Why it keeps happening" },
      {
        kind: "p",
        text: "Because the promotion is measured on the wrong number. Units versus last week is a headline that always flatters depth. The right measure is incremental profit versus what you would have earned doing nothing, and doing nothing means the baseline.",
      },
      {
        kind: "p",
        text: "Getting the baseline right is the hardest number in the room, and most teams do not have clean sell-out data to build one. In order of preference:",
      },
      {
        kind: "ol",
        items: [
          "Same weeks last year, de-seasonalised and adjusted for distribution changes.",
          "Pre- and post-promotion non-promo run rate, excluding the dip immediately after, because that is the pantry-loading hangover rather than real demand.",
          "Sell-in adjusted for pipeline fill. The weakest option, because sell-in during a promo week is inflated by trade stocking, not consumption.",
        ],
      },
      {
        kind: "p",
        text: "State which one you used. A promotion ROI with an undeclared baseline is not an analysis, it is a hope.",
      },
      { kind: "h2", id: "fixes", text: "The three fixes that actually work" },
      {
        kind: "p",
        text: "Change the mechanic before you change the depth. Depth on every unit is the most expensive way to buy volume, because baseline shoppers self-serve it. Mechanics with a gate, such as a minimum basket, multibuy, bundle or gift with purchase, make the shopper do something to earn the discount. In the example above, a 15 percent deal gated behind a two-unit minimum can beat a straight 25 percent cut on both volume and profit.",
      },
      {
        kind: "p",
        text: "Know who is actually funding the depth. On a marketplace during a 9.9 or 11.11 event, the shelf-facing discount is often part platform voucher and part your own off-invoice contribution. If the platform co-funds half, your real outlay on that 25 percent is 12.5 percent, but so is your commission, your free-shipping contribution and your ad burn, and those rarely make it onto the ROI slide. Model the money you actually pay, on both sides.",
      },
      {
        kind: "p",
        text: "Protect the reference price. Depth resets what shoppers think your product is worth. Display and visibility do not. A shopper who sees you at RM 7.50 every third week has learned that RM 10.00 is the sucker price. Buy visibility, feature and quality of display before you buy price. The first builds demand, the second rents it.",
      },
      { kind: "h2", id: "the-question", text: "The question for your next promo review" },
      {
        kind: "quote",
        text: "How much profit did this deliver versus doing nothing, and how much of the discount went to people who had already decided to buy us?",
        cite: "Not: how many units did we sell",
      },
      {
        kind: "p",
        text: "If the answer to the second half is most of it, you did not run a promotion. You ran a giveaway with a barcode.",
      },
    ],
    cta: {
      title: "See what your promo months really earned",
      text: "Heavy discount months show up in your own P&L as a falling average selling price against a flat gross margin percentage. Upload twelve months and the analysis puts both on the same chart, month by month.",
      label: "Check my promo months",
    },
  },
  {
    slug: "price-pack-architecture-two-sides",
    title: "Your medium size is not meant to be bought",
    dek: "Price-pack architecture is built from two sides at once: shopper psychology and your own cost curve. Most companies design one and leak margin on the other.",
    kicker: "RGM 101",
    author: "Keng Zhing Ng",
    authorRole: "Principal, Margin Lab",
    initials: "KZ",
    date: "26 Jul 2026",
    readMinutes: 8,
    image: "price-pack-architecture-two-sides",
    imageAlt:
      "Three shelves of the same product in three sizes, the middle row untouched while the others are picked over",
    body: [
      {
        kind: "p",
        lead: true,
        text: "Three iced white coffees on a kopitiam menu. Look at the steps, not the prices.",
      },
      {
        kind: "table",
        head: ["Size", "Volume", "Price", "Per 100ml"],
        rows: [
          ["Small", "300 ml", "RM 8.00", "RM 2.67"],
          ["Medium", "450 ml", "RM 11.50", "RM 2.56"],
          ["Large", "600 ml", "RM 12.50", "RM 2.08"],
        ],
      },
      {
        kind: "p",
        text: "Small to medium costs you RM 3.50 for 150ml more. Medium to large costs RM 1.00 for exactly the same 150ml more. Standing at the counter, upgrading to large feels almost free. That is not an accident, and the medium is not there to be sold. The medium exists to make the large look smart.",
      },
      {
        kind: "p",
        text: "And the house wins the trade-up. Going small to large adds RM 4.50 of revenue against maybe RM 1.20 of coffee, milk and a bigger cup, so roughly 73 percent of the upsize flows straight to gross profit. The expensive part of serving you, which is rent, staff and the transaction itself, was already paid on cup one.",
      },
      {
        kind: "p",
        text: "Once you see the structure you see it everywhere: cinema popcorn, bubble tea, fast-food combos, cloud storage tiers, software plans. The technical name is a decoy or anchoring structure. The practical name is price-pack architecture.",
      },
      { kind: "h2", id: "rules", text: "Three rules a ladder should obey" },
      {
        kind: "p",
        text: "Price the steps, not the packs. The gaps between sizes steer the choice. Make the step toward the size you want to sell feel small and the step away from it feel expensive. Get this wrong and shoppers cluster on your entry size while the premium pack rots on shelf.",
      },
      {
        kind: "p",
        text: "Key price points are cliffs, not slopes. RM 9.90 and RM 10.20 are not thirty sen apart, they are in different mental buckets. A smaller pack engineered to sit under the barrier at a higher price per gram is one of the most reliable margin-accretive moves there is. Leave the price point empty and a competitor or a private label takes it.",
      },
      {
        kind: "p",
        text: "Never let price per unit invert by accident. Bigger should be cheaper per gram, unless you are deliberately taxing convenience with sachets, on-the-go or single-serve. An accidental inversion gets arbitraged fast: the provision shop buys your family pack, refills the small packs, and you have funded your own competitor.",
      },
      {
        kind: "p",
        text: "That is the demand side. Most companies stop here. The expensive mistake lives on the other side.",
      },
      { kind: "h2", id: "supply-side", text: "The side shoppers never see" },
      {
        kind: "p",
        text: "A manufacturer sells three screen sizes. The shelf shows a tidy price ladder. The factory tells a completely different story.",
      },
      {
        kind: "table",
        head: ["SKU", "List price", "Cost", "Why the cost sits there", "Margin"],
        rows: [
          [
            "42 inch",
            "RM 1,200",
            "RM 1,000",
            "Legacy mould, short runs, changeover cost, old-line amortisation",
            "16.7%",
          ],
          [
            "50 inch",
            "RM 1,500",
            "RM 1,050",
            "The line was tooled for this panel. Best yield, longest runs",
            "30.0%",
          ],
          [
            "60 inch",
            "RM 2,000",
            "RM 1,700",
            "Stiffener frame and protective packaging against panel flex, higher freight and breakage",
            "15.0%",
          ],
        ],
      },
      {
        kind: "p",
        text: "The 60 inch has the biggest price tag and nearly the worst margin. The 42 inch looks like the affordable entry hero and can barely fund a discount. The 50 inch is the profit sweet spot, and the promotional plan should say so out loud.",
      },
      {
        kind: "ul",
        items: [
          "42 inch. No promotion. It cannot afford one.",
          "50 inch. Preferential depth, say 8 percent. Pull volume into the sweet spot.",
          "60 inch. Token depth, say 3 percent. Stay in the conversation, protect the halo.",
        ],
      },
      {
        kind: "p",
        text: "Run gross profit per unit after discount. The 42 inch at list makes RM 200. The 50 inch, even after 8 percent off, makes RM 330. The 60 inch after 3 percent makes RM 240. The discounted SKU is still the most profitable unit you can sell, and every share point you steer into it pays.",
      },
      {
        kind: "callout",
        title: "What instinct produces instead",
        text: "Promote the entry price point, it drives traffic. Put that 8 percent on the 42 inch and its gross profit per unit collapses from RM 200 to RM 104. You have spent the promotional budget discounting the SKU with the worst cost position in the portfolio.",
      },
      { kind: "h2", id: "conditions", text: "Two conditions, or steering does not pay" },
      {
        kind: "p",
        text: "Depth is a certain cost. Share shift and volume growth are a bet. Steering only pays if both land.",
      },
      {
        kind: "ol",
        items: [
          "Share actually moves toward the sweet spot. If shoppers take the discount on the 50 inch but the mix stays where it was, you have simply reduced the price of your best SKU.",
          "Total volume actually grows. In the example above the steering plan adds about 8 percent to total gross profit, but only because volume grew alongside the share shift. Hold volume flat and the identical promotion destroys 17 percent of gross profit.",
        ],
      },
      {
        kind: "p",
        text: "Which means the honest promotional question is not what depth do I need. It is what share and volume outcome does this depth have to buy in order to pay for itself, and do I believe that outcome?",
      },
      { kind: "h2", id: "two-questions", text: "The two questions for your own portfolio" },
      {
        kind: "p",
        text: "Demand side: what does each price step tell your shopper to do, and is your medium doing its decoy job or actually stealing sales from the size you want to sell?",
      },
      {
        kind: "p",
        text: "Supply side: which SKU is your 50 inch, meaning best real cost position rather than best margin on the standard costing sheet, and does your promotional calendar preferentially feed it, starve it, or, most common by far, not know it exists?",
      },
      {
        kind: "p",
        text: "Most promotional calendars are written entirely from the demand side. Depth goes wherever the buyer asked for it, blind to the cost curve underneath. That is not a promotional problem or a pricing problem. It is an architecture problem, and it is fixable in one planning cycle, once someone owns both sides of the ladder.",
      },
    ],
    cta: {
      title: "Start with the blended picture",
      text: "Before you map SKU cost curves, find out what your ladder is doing to the blend. Upload twelve months and the analysis shows whether your average selling price and gross margin moved together, or whether mix has been quietly pulling them apart.",
      label: "See my margin blend",
    },
  },
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
    imageAlt: "A warehouse worker reaching up to a carton in a wholesale aisle stacked high with plain boxes",
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
    imageAlt: "The back-of-house service corridor of a shop: racking, trolleys, crates and cabling",
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
    imageAlt: "Printed financial statements fanned across a desk under a lamp in a factory office at night",
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
    imageAlt: "A hand holding a label gun against a shelf edge, a blank price label curling off the roll",
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
