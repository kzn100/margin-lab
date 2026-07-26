# Sample P&Ls — Malaysian listed companies

Test data for the analyser. Figures are in **ringgit (RM), not thousands**.
Every workbook carries a **Notes** sheet with its own provenance; the parser
reads sheet 1 only. Regenerate everything with:

```bash
node scripts/gen-examples.mjs
```

## What is real and what is not

Malaysian listcos report **quarterly**, so no file here is audited monthly
data. Two levels of fidelity:

- **Quarter-anchored** (99 Speed Mart, Senheng, CelcomDigi, Sime Darby,
  Gamuda) — published quarterly revenue, net profit and, where the series is
  reliable, gross profit and operating income. Only the split across the three
  months of each quarter is synthesized (30/33/37%).
- **Year-anchored** (Mr DIY, Top Glove, Maybank) — published annual results
  only; the whole monthly shape is synthesized, so these are not
  quarter-accurate.

Opex categories are modelled: fixed ratios of revenue, with one category acting
as the balancing figure where the file reconciles to reported operating income.
The split between categories is not separately published. Verify against the
annual reports before quoting any number.

## Files

| File | What it exercises |
| --- | --- |
| `99-speed-mart-malaysia-pnl-2024-2026q1.xlsx` | Mini-market chain, RM10–11bn revenue, ~20% gross / ~5% net. 27 months. `Units` = outlets trading (2,300 → 2,900), so ASP reads as revenue per outlet per month. Admin jumps in Q4 2024 — the IPO quarter. |
| `senheng-malaysia-pnl-2024-2026q1.xlsx` | Consumer electronics, **net margin under 1%** on a ~21% gross margin — the whole result sits in opex. Q1 2026 is a net loss. `Units` = stores. |
| `celcomdigi-malaysia-pnl-2024-2026q1.xlsx` | Telco: **~64% gross margin** and heavy depreciation. Q4 2024 net profit collapses to RM158m on accelerated network-integration depreciation, which lands in `Opex Depreciation & Amortisation`. `Units` = subscribers (~20m), so ASP reads as ARPU. |
| `sime-darby-malaysia-pnl-fy2025-fy2026q3.xlsx` | Thin-margin distributor at scale: RM70bn revenue, ~15% gross, ~3% net. **21 months** on a **June year-end** — exercises non-calendar FY and the 12-month YoY lookback. No `Units`. |
| `gamuda-malaysia-pnl-fy2024-fy2025.xlsx` | Construction/property. **Net profit above operating profit** in thin quarters — JV and concession income sits below the operating line, so the analyser has to trust the Net Profit column. July year-end. No `Units`. |
| `mr-diy-malaysia-pnl-2023-2024.xlsx` | Healthy retailer, ~45% gross margin, CNY and year-end seasonality. `Units` = transactions. Also present as **`.csv`** — the only file that exercises the CSV path. |
| `top-glove-malaysia-pnl-2023-2024.xlsx` | Distressed: **COGS above revenue** through 2023 (negative gross margin), lumpy plant-closure charges in `Opex Other`, recovery toward breakeven in 2024. `Units` = thousand pieces. |
| `maybank-malaysia-pnl-2023-2024.xlsx` | Bank chart of accounts: revenue = total income, cost of sales = interest expense (so gross profit = net operating income), opex split personnel / establishment / administrative / impairment. **No `Units` column** — exercises the optional-column path. |

Non-template headers are deliberate — `Opex Outlet Operations`,
`Cost of sales (interest expense)`, `Revenue (total income)` — they test the
loose header matching in `src/lib/pnl/parse.ts`.

Sources: each company's quarterly announcements and annual/integrated reports,
aggregated via stockanalysis.com.
