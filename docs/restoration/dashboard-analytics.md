# Restoration ledger: Dashboard, Analytics and Insights

Baseline: commit `03f1417` (before the redesign): `app/(app)/page.tsx`, `app/(app)/analytics/page.tsx`,
`app/(app)/insights/page.tsx`, `components/analytics-compare-tab.tsx`, `components/kitchen-analytics-tab.tsx`,
`components/metrics-period-bar.tsx`, `components/insight-button.tsx`, `hooks/use-insights-api.ts`,
`hooks/use-insight-data-bundle.ts`.

Totals: 124 items. Kept 77, moved 15, restored 25, left out 7 (the greeting, the "Live" badge, the credit book's Total owed, which repeats a KPI on the same screen, and the four What if items, removed at the user's request on 27 Nov 2026).

Update 27 Nov 2026: Explore was folded into Analytics > Reports. Ask is a view of Reports, and Build a chart is the report builder (New report), so its six items moved there. What if was removed. See [docs/features/reports.md](../features/reports.md).

## Dashboard

| Item | Old location | Status |
|---|---|---|
| Greeting "Welcome back, name" and date | Header | Date kept (header description, with the location). Greeting left out: a salutation, not information |
| "Live" badge | Header | Left out: decoration; the data refreshes the same way without it |
| Today's revenue + order count | Tracker strip | Kept: Revenue and Orders KPIs follow the page period (Today by default), now with change vs previous |
| Outstanding credit | Tracker strip | Kept: "Owed to you" KPI |
| Overdue amount + overdue customer count | Tracker strip | Kept: "Owed to you" KPI detail line |
| Stock alerts with "N low, N out" | Tracker strip | Kept: "Stock alerts" KPI |
| Open tickets with "N feedback, N enquiries" | Tracker strip | Restored at Dashboard > second KPI strip "Open tickets" (links to Engagement) |
| Customers with "+N this month" | Tracker strip | Restored at Dashboard > second KPI strip "Customers" (links to Customers) |
| Quick action: Record sale | Quick actions | Kept: header primary button |
| Quick action: Add customer | Quick actions | Kept: header button (overflow on phones) |
| Quick action: Log feedback | Quick actions | Kept: header button (overflow on phones) |
| Quick action: Add stock | Quick actions | Restored at Dashboard header overflow menu "Add stock" (needs inventory.create) |
| Quick action: Manage credits | Quick actions | Restored at Dashboard header overflow menu "Manage credits" (needs credits.view) |
| Quick action: Analytics | Quick actions | Restored at Dashboard header overflow menu "Open analytics" (needs analytics.view) |
| Sales period toggle Daily / Weekly / Monthly / All | Sales card | Moved to the one page period: Today / Last 7 days / Last 30 days. "All" restored as a fourth choice "All time" (charts by month, as before) |
| Category period toggle Daily / Weekly / Monthly / All | Revenue per category card | Moved to the same page period (one period for every section); "All time" restored as above |
| Sales: Revenue | Sales card | Kept: Revenue KPI |
| Sales: Orders | Sales card | Kept: Orders KPI |
| Sales: AOV | Sales card | Restored at Dashboard > Sales panel "Average order" (the KPI only showed it when there was no change line) |
| Sales: Profit (admins) | Sales card | Kept: Sales panel "Profit" (admins), plus margin |
| Sales: Cash / credit split | Sales card | Kept: Sales panel "Paid upfront" and "On credit" |
| Sales: Channels walk-in / delivery | Sales card | Kept: Sales panel "Walk-in" and "Delivery" |
| Sales trend chart | Sales card | Kept: Sales panel area chart (single-point and empty states kept) |
| Revenue per category bar chart | Revenue per category card | Kept: ranked bars (same revenue per category) |
| Revenue per category table with % | Revenue per category card | Kept: each bar shows revenue and %; all categories behind "Show all" |
| Top customers: top 10 | Top customers card | Restored to 10 (the redesign showed 8) |
| Top customers: All / B2B / B2C filter | Top customers card | Kept: All / Business / Individual |
| Top customers: type badge, total spent | Top customers card | Kept: type in the second line, lifetime spend, plus order count |
| Top customers: View all | Top customers card | Kept: "All customers" link |
| Purchase history (date, product, payment, amount), up to 50 | Top customers row | Restored to the latest 50 purchases in a scrolling list with a count line (the redesign showed 8 of 20); each date links to the sale |
| Inventory: Active SKUs | Inventory card | Restored at Dashboard > second KPI strip "Active products" |
| Inventory: Stock value | Inventory card | Restored at Dashboard > second KPI strip "Stock value" (at average unit cost, same calculation) |
| Inventory: Value by category chart | Inventory card | Removed from the Dashboard at the user's request (21 Nov 2026). Same breakdown is in Analytics > Inventory > "Stock value by category" |
| Inventory: Low stock list (first 6) | Inventory card | Moved to Dashboard > Needs attention > Low stock tab (every item, paged, with Restock) |
| Inventory: Out of stock list (first 6) | Inventory card | Moved to Dashboard > Needs attention > Low stock tab (out of stock listed first) |
| Inventory: "All stock levels healthy" | Inventory card | Kept: Low stock tab empty state "Stock is healthy" |
| Credit book: Outstanding / Overdue / Pending counts | Credit book card | Removed from the Dashboard at the user's request (21 Nov 2026). Owing, overdue and pending figures and the balances list are on the Credits page (KPI strips and table) |
| Credit book: pending vs overdue pie | Credit book card | Removed from the Dashboard at the user's request (21 Nov 2026). Owing, overdue and pending figures and the balances list are on the Credits page (KPI strips and table) |
| Credit book: Total owed | Credit book card | Left out of the panel: identical to the "Owed to you" KPI on the same screen |
| Credit book: Overdue amount | Credit book card | Removed from the Dashboard at the user's request (21 Nov 2026). Owing, overdue and pending figures and the balances list are on the Credits page (KPI strips and table) |
| Credit book: Recent 5 balances with status | Credit book card | Removed from the Dashboard at the user's request (21 Nov 2026). Owing, overdue and pending figures and the balances list are on the Credits page (KPI strips and table) |
| Needs attention (overdue credit, low stock, open tickets lists) | (new) | Kept |

## Analytics

| Item | Old location | Status |
|---|---|---|
| Location filter | Filter card | Kept: LocationSelect (now app-wide) |
| Period presets Daily / Weekly / Monthly / All time, custom range | MetricsPeriodBar | Moved to PeriodSelect: Today / Last 7 days (old Weekly was 8 days) / Last 30 days / This month / All time / custom calendar range. Nothing lost; the default changed from All time to Last 30 days |
| "Active range" caption with exact dates | MetricsPeriodBar | Restored at Analytics filter row: exact days ("22 Oct to 20 Nov 2026", "All available data") |
| Data-source hint (sale date, issue date, snapshot) | MetricsPeriodBar hint | Moved to a source note at the foot of each tab, worded for that tab |
| "Connect to the API" state | Page | Kept |
| Tab: Sales | Tabs | Kept |
| Revenue growth banner (MoM %, vs previous month) | Sales | Restored at Analytics > Sales > second KPI strip "Revenue growth" (month on month, months named) |
| Revenue growth MoM tile | Sales | Same figure as the banner: restored once (above) |
| Order growth MoM tile | Sales | Restored at Analytics > Sales > second KPI strip "Order growth" |
| Total revenue | Sales | Kept: Revenue KPI, with change vs previous period |
| Collected | Sales | Kept: Collected KPI |
| Outstanding | Sales | Kept: Collected KPI detail "N still owed" |
| Revenue trend with Daily / Weekly / Monthly and month drill-down | Sales | Kept (grains limited to what the period allows, as before) |
| Sales by day of week (Avg / Total / Orders) | Sales | Kept |
| AOV trend with its own Weekly / Monthly toggle | Sales | Kept chart; the independent week / month toggle restored |
| Channel mix pie (Revenue / Orders) with legend table | Sales | Kept: ranked bars with the same values, counts and shares |
| Payment mode pie (Value / Count) with three tiles | Sales | Kept: "How sales were settled" ranked bars show value, count and share |
| Payment type cards (Cash / Transfer / POS, value, count, %) | Sales | Kept: "How customers paid" ranked bars (same numbers) |
| Revenue by period table | (new) | Kept |
| Tab: Product performance | Tabs | Kept |
| Top 15 products table (#, product, category, orders, revenue; sort by revenue / orders) | Products | Kept: top 10 chart plus "All products sold" table with every product, sortable |
| Revenue / Orders by category (all categories) | Products | Kept: ranked bars; the top-10 cap now has "Show all", so every category shows again |
| Stock turnover / units sold (all products) | Products | Kept: ranked bars; "Show all" restores the full list (the redesign capped it at 10) |
| Dead stock alert (each item and its stock) | Products | Kept: "Not selling" KPI and table |
| Tab: Customer insights | Tabs | Kept |
| Total customers | Customers | Kept |
| Avg lifetime value | Customers | Kept |
| Revenue concentration (top 20%) | Customers | Kept |
| Repeat rate | Customers | Kept |
| Acquisition chart: new per week / month | Customers | Kept |
| Acquisition chart: cumulative line | Customers | Restored at Analytics > Customers > Customer acquisition "Running total" toggle (one series at a time instead of two axes) |
| Buyer engagement tiers pie + tier tiles | Customers | Kept: ranked bars; title "Buyer engagement tiers" restored (it had been relabelled "Buyer types") |
| Lifetime value distribution (Count / Revenue) | Customers | Kept |
| Top customers list (Spend / Orders) | Customers | Kept in the Top customers table; "Top spenders" view restored as its own list |
| Repeat customers list | Customers | Restored at Analytics > Customers > Top customers "Repeat buyers" view (it had been merged away) |
| Segment performance (Revenue / Customers) | Customers | Kept |
| View all customers button | Customers | Kept: "All customers" link |
| Tab: Credit & risk | Tabs | Kept |
| Outstanding, Overdue, Cleared (all time), Collection rate | Credit | Kept |
| Aging report tiles + stacked bar (Amount / Count) | Credit | Kept: ranked bars by age bucket with amount and accounts |
| Top debtors (All / Overdue / Pending) | Credit | Kept: "Largest balances" table with the same filter, plus issue date |
| Customer credit risk (Ratio / Owed), every customer | Credit | Kept; "Show all" restores the full list (the redesign capped it at 10) |
| Collection performance (issued vs cleared, Weekly / Monthly) | Credit | Kept |
| Tab: Kitchen | Tabs | Kept |
| Kitchen revenue, jobs, average | Kitchen | Kept |
| Profit with margin and costed-job count | Kitchen | Kept; costed-job count restored to the detail line |
| Food cost % (target 30%) | Kitchen | Restored at Analytics > Kitchen > second KPI strip "Food cost" (it had been squeezed into the profit detail) |
| Costed jobs | Kitchen | Restored at Analytics > Kitchen > second KPI strip "Costed jobs" (N of N completed) |
| Still owed / collected | Kitchen | Kept |
| Time to accept (median, n, average) | Kitchen | Kept: KPI when costs are hidden; "Quotes and response" panel otherwise |
| Quote conversion (converted of sent, declined, expired) | Kitchen | Kept: KPI plus the panel |
| Revenue and profit by month | Kitchen | Kept |
| By outlet table | Kitchen | Kept |
| By channel table with share | Kitchen | Kept: ranked bars with jobs and share |
| Cancelled jobs and top reasons | Kitchen | Kept |
| Link to kitchen jobs | Kitchen | Kept |
| Tab: Compare | Tabs | Kept |
| Inventory and Suppliers tabs | (new) | Owned by other agents; not in this ledger |

## Insights (now Analytics > Reports and Compare)

| Item | Old location | Status |
|---|---|---|
| Insights page with Ask / Explore / Simulate / Compare modes | /insights | Moved to Analytics > Reports (Ask is a view of Reports, Explore is the report builder, New report) and Analytics > Compare. Simulate (What if) was left out on 27 Nov, see below. /insights redirects, keeping ?ask= and kind/a/b |
| Hub and period filters | Insights header | Moved to the Analytics filter row (same scope for every tab) |
| Ask box | Ask | Kept |
| Ask examples (10) | Ask | Restored: 4 shown, the other 6 behind "More examples" |
| Answer narrative and "Understood as" chips | Ask | Kept |
| Refine into the builder | Ask | Kept: "Open as a report" opens Reports > New report with the question's data, breakdown and filters |
| Find records list (count, sort, total, dates, tags, links) | Ask | Kept (tags fold into the subtitle line) |
| Ask comparison result | Ask | Kept, with "Open in Compare" |
| Ask chart and AI insight button | Ask | Kept |
| Recent questions | (new) | Kept |
| Explore datasets with descriptions | Explore | Moved to Reports > New report: "Data" select with its description (27 Nov) |
| Measure, break down by, chart type | Explore | Moved to Reports > New report: "Columns" (one or up to 8), "One row per" and "Show as". Pie is shown as ranked bars with shares (same numbers) |
| Filters with value chips | Explore | Moved to Reports > New report: Filters, values as checkbox chips |
| Total, number of groups, top group with share | Explore | Moved to the report summary: a total for each column that adds up, "Top <group>" with its share, and "<group> groups" |
| Result table with share and total | Explore | Moved to the report table, with a Share column for the first column; the total is in the summary |
| "Showing top 12 of N" | Explore | Moved to the report chart (same note; ranked bars offer "Show all"; a line shows every point). The table lists every row |
| Simulate: what-if box, scenarios, levers | Simulate | Left out: What if was removed at the user's request on 27 Nov 2026 |
| Simulate examples (6) | Simulate | Left out: removed with What if (27 Nov 2026) |
| Projected outcome, metric tiles, baseline vs projected chart | Simulate | Left out: removed with What if (27 Nov 2026) |
| Recommendation, narrative, assumptions | Simulate | Left out: removed with What if (27 Nov 2026) |
| Insights Compare (all 7 entity kinds) | Compare | Moved to Analytics > Compare: the duplicate was merged; every kind is under Products, Customers or General |
| Compare: score, leader, metric wins | Compare | Kept |
| Compare: per-metric winner and its lead % | Compare | Restored at Analytics > Compare > Table view ("N% ahead" next to the winning value) |
| Compare: key insights and AI summary | Compare | Kept |
| Compare: chart / table views | Analytics Compare | Kept |

## Notes

- Calculations are unchanged from 03f1417. Stock value and value by category now follow the selected
  location (the old card used all locations); the credit book follows it too.
- Kitchen and Compare render with real data only: the mock API has no kitchen jobs or compare entities,
  so their restored pieces were checked by type and lint, not on screen.
