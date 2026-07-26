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

Non-template headers are deliberate: `Opex Store Operations`,
`Cost of sales (interest expense)` etc. test the loose header matching in
`src/lib/pnl/parse.ts`.
