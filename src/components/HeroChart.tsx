"use client";

import { useEffect, useState } from "react";
import m from "@/app/marketing.module.css";
import { MarginBridgeChart, type BridgeStep } from "./Charts";
import s from "./heroChart.module.css";

/**
 * The landing hero: one margin bridge, cycling through four shapes of business.
 *
 * The point is that the same five bars tell four completely different stories —
 * a services firm losing a 63% gross margin to overhead reads nothing like a
 * distributor clearing 2.8% on eleven million. One static chart cannot make
 * that argument.
 *
 * The figures are illustrative and labelled as such. The margin structures are
 * taken from the sample workbooks in public/examples, scaled to the revenue
 * band this page is written for; the workbooks themselves are named after
 * listed companies but their monthly shape is synthesized, so nothing here
 * carries a company name.
 */

type Slide = {
  sector: string;
  /** Carries the revenue too: on a phone a longer chip wraps to two lines. */
  note: string;
  bridge: BridgeStep[];
};

/** RM '000, matching the unit printed in the chart head. */
const SLIDES: Slide[] = [
  {
    sector: "Food manufacturer",
    note: "RM 6.03M of revenue leaves RM 240k of net profit. Everything else is somebody else's.",
    bridge: [
      { label: "Revenue", type: "total", value: 6034 },
      { label: "COGS", type: "dec", value: -3517 },
      { label: "Gross profit", type: "total", value: 2517 },
      { label: "Opex", type: "dec", value: -2148 },
      { label: "Net profit", type: "total", value: 240 },
    ],
  },
  {
    sector: "Distributor",
    note: "RM 11.4M of revenue, and nearly 85% of it is bought-in cost. Volume is not the lever here — buying is.",
    bridge: [
      { label: "Revenue", type: "total", value: 11400 },
      { label: "COGS", type: "dec", value: -9679 },
      { label: "Gross profit", type: "total", value: 1721 },
      { label: "Opex", type: "dec", value: -1401 },
      { label: "Net profit", type: "total", value: 320 },
    ],
  },
  {
    sector: "Services firm",
    note: "RM 4.8M of revenue at a 63% gross margin, and overhead eats four fifths of it.",
    bridge: [
      { label: "Revenue", type: "total", value: 4800 },
      { label: "COGS", type: "dec", value: -1757 },
      { label: "Gross profit", type: "total", value: 3043 },
      { label: "Opex", type: "dec", value: -2496 },
      { label: "Net profit", type: "total", value: 547 },
    ],
  },
  {
    sector: "Manufacturer, bad year",
    note: "RM 7.2M of revenue, and cost of sales above it. The loss is there before a single overhead is paid.",
    bridge: [
      { label: "Revenue", type: "total", value: 7200 },
      { label: "COGS", type: "dec", value: -7230 },
      { label: "Gross profit", type: "total", value: -30 },
      { label: "Opex", type: "dec", value: -1906 },
      { label: "Net profit", type: "total", value: -1936 },
    ],
  },
];

const EVERY_MS = 5000;

export function HeroChart() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  // index is a dependency on purpose: picking a slide by hand restarts the
  // interval, so the chosen one gets its full five seconds.
  useEffect(() => {
    // Somebody who has asked for less motion gets the first shape and the dots.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    if (paused) return;

    const id = setInterval(() => {
      // A background tab would otherwise queue up advances and flick through
      // them all the moment it is looked at again.
      if (document.hidden) return;
      setIndex((i) => (i + 1) % SLIDES.length);
    }, EVERY_MS);
    return () => clearInterval(id);
  }, [paused, index]);

  const slide = SLIDES[index];

  return (
    <figure
      className={m.heroChart}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <figcaption className={m.heroChartHead}>
        <strong>{slide.sector}</strong>
        <span>RM &apos;000</span>
      </figcaption>

      {/* Keyed so React replaces the chart rather than patching it, which is
          what makes each shape animate in from zero. */}
      <div className={s.plot} key={index}>
        <MarginBridgeChart data={slide.bridge} />
      </div>

      <p className={`${m.heroChartNote} ${s.note}`} aria-live="polite">
        {slide.note}
      </p>

      <div className={s.dots}>
        {SLIDES.map((sl, i) => (
          <button
            key={sl.sector}
            type="button"
            className={s.dot}
            aria-label={`Show ${sl.sector}`}
            aria-current={i === index || undefined}
            onClick={() => setIndex(i)}
          />
        ))}
        <span className={s.illustrative}>Illustrative shapes</span>
      </div>
    </figure>
  );
}
