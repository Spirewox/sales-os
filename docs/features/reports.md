# Reports

**Analytics → Reports** holds ready-made reports, the reports a person builds for themself, and Ask. It replaced the
Explore tab.

Plan: [2026-11-26-reports.md](../superpowers/plans/2026-11-26-reports.md). What was built differs from the plan, at the
user's request:

| Plan | Built |
|---|---|
| 10 ready-made reports | 9: **Sales by staff was removed** (27 Nov). The same figures are a custom report: Sales, one row per Agent. |
| CSV export and a print view | The shared **Export** button (Excel, CSV, PDF). The PDF is the printable form. |
| Saved Explore queries: one measure, one breakdown | **Custom reports**: up to 8 columns, built, saved, edited and deleted in Reports, and exportable before saving |
| Explore stays a separate tab | **Explore folded into Reports** (27 Nov): Ask is a view of Reports, Build a chart became the report builder, and **What if was removed** |

## What a person sees

The tab has a toggle: **Reports** and **Ask**. Everything follows the page's location and period.

### The library (`?tab=reports`)

- **My reports**, with **New report**. Each saved report says what it holds, for example
  "Sales · 3 columns · one row per location", and when it was saved. With none: "No reports of your own yet".
  If the list fails to load: "Your reports did not load" with Try again.
- **Ready-made reports**, one panel per group, each report a row with its description:

| Group | Report | Columns | Permission | Follows the period |
|---|---|---|---|---|
| Sales | Daily sales | Date, Orders, Revenue, Avg order, Voided | `sales.view` | yes |
| Sales | Sales by product | Product, SKU, Category, Quantity, Revenue, Share % | `sales.view` | yes |
| Sales | Sales by location | Location, Orders, Revenue, Avg order, Share % | `sales.view` | yes |
| Sales | Payment methods | Method, Orders, Revenue, Share % | `sales.view` | yes |
| Customers | Top customers | Customer, Type, Location, Orders, Spent, Last purchase | `customers.view` | yes |
| Credit | Credit aging | Customer, Outstanding, Not due, 1-30, 31-60, 61-90, Over 90 days | `credits.view` | no, today's position |
| Inventory | Stock valuation | Product, SKU, Location, On hand, Unit, Avg cost, Stock value | `inventory.view` | no, today's position |
| Inventory | Stock movements | Product, Opening, Purchased, Transferred in, Transferred out, Sold, Adjusted, Closing | `inventory.view` | yes |
| Suppliers | Purchases by supplier | Supplier, Purchases, Total spend, Avg order, Last purchase | `suppliers.view` | yes |

A report someone can't open is hidden; a shared link to one shows the library and "You don't have access to that report."

### A ready-made report (`?report=<key>`)

- Back to reports, the title, its description, and what it covers ("28 Oct to 26 Nov 2026 · All locations", or
  "As of 26 Nov 2026" for a report that shows today's position). **Export** (Excel, CSV, PDF).
- **Totals** for the amount and count columns, never averages or shares. More than four totals split into even
  strips (Credit aging shows its six as two rows of three).
- **A chart** of the first money column: a line across every day for Daily sales, ranked bars for the others, with the
  AI insight button.
- **The table**, sortable and paged. The export holds every row and a Total row.
- Over 10,000 rows: "Showing the first 10,000 rows. Narrow the period or location to see the rest."

### Building a report (`?report=new`, `?report=edit:<id>`)

- **Data**: Sales, Customers, Inventory, Suppliers, Stock Movements, Credits, Supplier Issues.
- **One row per**: any field of that data, for example Location, Product, Customer, Month, Day of week, Agent.
- **Show as**: Columns, Ranked bars, Line or Table.
- **Columns**: chips, up to 8, "2 of 8". The order picked is the column order, and the first one is charted.
- **Filters**: Add filter, pick a field, tick its values.
- A **live preview** on the right: totals, top group with its share, number of groups, the chart and the table
  (with a Share column when the first column adds up).
- **Export** works before saving. **Save report** asks for a name (suggested, for example "Revenue, orders and 3 more
  by location", at most 60 characters; a name already used shows "You already have a report with that name." under
  the field). **Back to reports** with unsaved changes asks "Leave without saving?".

### A saved report (`?report=saved:<id>`)

The same summary, chart and table, for the period and location on screen. **Export**, and a ⋯ menu with
**Edit report** and **Delete report** ("Delete <name>?"). A report whose data, columns or filters no longer exist
says "This report can't run any more" and offers Edit report.

### Ask (`?mode=ask`)

Ask in plain words and get a chart, a list of records or a comparison, as before. An answer's **Open as a report**
opens New report with that data, breakdown and filters filled in. Ask needs the API: mock mode doesn't answer it.

### Old links

| Old | Now |
|---|---|
| `?tab=explore` (Ask) | `?tab=reports&mode=ask` |
| `?tab=explore&mode=build` | `?tab=reports&report=new` |
| `?tab=explore&mode=simulate`, `?tab=reports&mode=simulate` | `?tab=reports` (What if was removed) |
| `/insights?ask=…`, `?mode=explore`, `?mode=simulate` | The same, through `app/(app)/insights/page.tsx` |

## Data points for custom reports

Each dataset's columns (measures). Those marked * don't add up across groups (averages, ratios, distinct counts), so
they get no "Total" figure; the server's `total` for them must be worked out over all rows, not summed.

| Data | Columns |
|---|---|
| Sales | Revenue, Orders*, Units Sold, Gross Profit, Avg Order Value*, Distinct Customers*, Cost of Goods, Gross Margin %*, Avg Selling Price*, Avg Units per Order*, Revenue per Customer*, Credit Sales, Cash Sales, Distinct Products* |
| Customers | Customers, Total Spend, Total Orders, Avg Lifetime Value*, Credit Owed, Avg Order Value*, Avg Orders per Customer*, Customers Owing, Customers Overdue, Avg Credit Owed* |
| Inventory | SKUs, Stock Value, Stock Units, Avg Selling Price*, Avg Margin %*, Retail Value, Potential Profit, Avg Unit Cost*, Low Stock SKUs, Out of Stock SKUs |
| Suppliers | Suppliers, Procurement Spend, Retail Profit Generated, Open Issues, Avg Rating*, Avg Lead Time*, Avg Spend per Supplier*, Retail Profit per ₦ Spent* |
| Stock Movements | Movements, Quantity, Value, Units In, Units Out, Value In, Value Out, Avg Unit Cost* |
| Credits | Records, Amount Owed, Original Amount, Amount Paid, Collection Rate %*, Overdue Amount, Avg Amount Owed*, Flagged Records |
| Supplier Issues | Issues, Open Issues, Resolved or Closed |

The keys and how each is worked out are in `DATASETS` in `lib/explore.ts`; measures marked `additive: false` there are
the starred ones. "Credit sales" means any payment mode but Full Payment.

## Backend contract

| Call | Shape and behaviour |
|------|---------------------|
| `GET analytics/reports/:key?period=&date_from=&date_to=&hub_id=` | `{ data: ReportResult }` for the 9 keys: `sales-daily`, `sales-by-product`, `sales-by-location`, `payment-methods`, `top-customers`, `credit-aging`, `stock-valuation`, `stock-movements`, `supplier-purchases`. Unknown key 404, missing permission 403. Rows capped at 10,000, with `capped: true`. |
| `ReportResult` | `{ columns: { key; label; kind: 'text' \| 'money' \| 'number' \| 'percent' \| 'date' }[]; rows: Record<string, string \| number \| null>[]; totals: Record<string, number>; capped: boolean; generatedAt: string }`. `totals` holds only the columns that add up. |
| `GET analytics/reports/saved` | `{ data: SavedReport[] }`, the signed-in user's only, newest first. |
| `SavedReport` | `{ id, name, dataset, measure, measures: string[], groupBy, filters: Filter[], chart: 'column' \| 'bar' \| 'line' \| 'table', createdAt }`. `measure` is `measures[0]`, kept for reports saved before `measures`. |
| `POST analytics/reports/saved` | Body `{ name, dataset, measure, measures, groupBy, filters, chart }`. Name 1 to 60 characters, unique per user, ignoring case: 409 "You already have a report with that name.". 1 to 8 `measures`, else 400. Returns `{ data: SavedReport }`. |
| `PUT analytics/reports/saved/:id` | Same body and checks (a report may keep its own name). Owner only; 404 for an unknown id. The id and `createdAt` stay. |
| `DELETE analytics/reports/saved/:id` | Owner only. |
| `POST insights/explore/query` | Unchanged shape, `{ dataset, measure, groupBy, filters, ...scope }` → `{ rows: { key, label, value }[], total, measureKind, measureLabel, groupLabel }`, but it must support **every measure key in the table above**. A custom report calls it once per column. |
| `POST insights/explore/field-values` | `{ dataset, field, ...scope }` → `{ values: string[] }`, the values a filter can take. |
| `insights/simulate/*` | No longer called. What if was removed. |

## How it's built

- `lib/reports.ts` (tested): `REPORTS`, `resolveReportParam` (library, builtin, saved, new, edit, denied),
  `summableColumns`, `reportKpiColumns`, `kpiRows`, `reportChart`, `reportExportColumns`, `reportRowsWithTotal`,
  `savedReportMeasures`, `savedReportRunnable`, `reportDraftError`, `customReportName`, `mergeMeasureRows`,
  `customReportSummary`, `MAX_REPORT_COLUMNS` (8).
- `hooks/use-reports.ts`: `useReport`, `useSavedReports`, `useSaveReport`, `useUpdateSavedReport`,
  `useDeleteSavedReport`, `useCustomReport` (one query per column, merged into rows).
- Screens in `app/(app)/analytics/`: `reports-tab.tsx` (views and routing), `report-library.tsx`, `report-viewer.tsx`,
  `report-builder.tsx`, `custom-report.tsx` (the shared body and export), `report-filters.tsx`,
  `save-report-dialog.tsx`, `explore-ask.tsx`.
- Mock mode: `lib/mock-api/reports.ts` builds the 9 reports, `lib/mock-api/saved-reports.ts` keeps saved reports in
  memory until a reload, and `lib/mock-api/explore.ts` answers Explore queries and filter values for **Sales only**
  (other data shows no rows).
