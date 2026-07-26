# Sample P&Ls — Malaysian listed companies

Test data for the analyser. Figures are in **ringgit (RM), not thousands**.

Annual revenue / net profit are anchored to each company's published headline
results. Malaysian listcos report quarterly, so the **monthly split is
synthesized** (seasonality weighting, straight-line cost ratios) — treat these
as realistic shapes, not audited monthly accounts. Verify against the annual
reports before quoting any number.

| File | Shape it exercises |
| --- | --- |
| `mr-diy-malaysia-pnl-2023-2024.csv` | Healthy retailer. FY23 rev RM4.32bn / NP ~RM500m, FY24 RM4.85bn / ~RM570m. GP margin ~45%, CNY + year-end seasonality. Units = transactions, so price/volume/mix decomposes. |
| `top-glove-malaysia-pnl-2023-2024.csv` | Distressed. Post-glut losses, **COGS above revenue** in 2023 (negative gross margin), lumpy plant-closure charges in `Opex Other`, recovery toward breakeven through 2024. Units = thousand pieces, ASP RM/'000 pcs. |
| `maybank-malaysia-pnl-2023-2024.csv` | Bank chart of accounts. Revenue = total income, cost of sales = interest expense (so gross profit = net operating income), opex split personnel / establishment / administrative / impairment. **No Units column** — exercises the optional-column path. |
| `sime-darby-malaysia-pnl-fy2025-fy2026q3.xlsx` | Thin-margin distributor at scale. RM70bn revenue, ~15% gross margin, ~3% net. **21 months** (FY2025 + FY2026 Q1–Q3) and a **June year-end**, so calendar-year grouping and the 12-month YoY lookback both get exercised. `.xlsx` path. |
| `gamuda-malaysia-pnl-fy2024-fy2025.xlsx` | Construction/property. **Net profit above operating profit** in thin quarters — JV and concession income sits below the operating line, which the analyser handles by trusting the Net Profit column. July year-end. `.xlsx` path. |

The two `.xlsx` files carry a second **Notes** sheet with per-file provenance;
the parser reads sheet 1 only. Their quarterly revenue and net profit are the
published figures (Sime Darby FY2025 RM70.06bn / RM2.06bn; Gamuda FY2024
RM13.35bn / RM912m, FY2025 RM15.97bn / RM1.00bn). Gross margin is the published
annual margin spread evenly and opex ratios are back-solved from published
operating income — the quarterly gross-margin detail was not reliably
extractable, so per-quarter margin swings are absent by design.

Non-template headers are deliberate: `Opex Store Operations`,
`Cost of sales (interest expense)` etc. test the loose header matching in
`src/lib/pnl/parse.ts`.
