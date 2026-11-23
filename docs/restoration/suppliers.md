# Suppliers: restoration ledger

Old UI: `app/(app)/suppliers/page.tsx` at commit 03f1417 (one 1,239-line file).
New UI: `app/(app)/suppliers/*` (page, list hook, columns, drawer and one file per drawer tab), plus Analytics > Suppliers (`app/(app)/analytics/suppliers-tab.tsx`).

Totals: 92 old items. Kept 65, Moved 6, Restored 19, Left out 2 (plus 4 items new in the redesign, all kept).

## Page header and figures

| Item | Old location | Status |
|---|---|---|
| Title and description | Header | Kept (PageHeader) |
| Add supplier button (`suppliers.create`) | Header | Kept |
| KPI: Suppliers (API total) | KPI card 1 | Restored at the second KPI strip "Supplier base" (same figure: API `summary.total`, detail shows how many are inactive) |
| KPI: Active (API active count) | KPI card 2 | Restored at "Supplier base" strip (API `summary.active`; clicking it now also filters the list to active suppliers) |
| KPI: Total spend | KPI card 3 | Kept (first strip; now follows the period and shows change vs the previous period) |
| KPI: Open issues | KPI card 4 | Kept (first strip; now also filters to suppliers with open issues, and says across how many suppliers) |
| KPI: Average lead time | KPI card 5 | Restored at "Supplier base" strip (same rounded mean over every loaded supplier with a lead time; detail shows how many suppliers it covers) |
| KPI: No purchase in 60 days | (new) | New in redesign, kept |
| Top suppliers by spend (top 5, bars, click opens supplier) | Panel under KPIs | Restored at the panel under the KPI strips (`top-suppliers.tsx`). Same top 5 and bars; now follows the period and the active filters. A fuller ranking also lives in Analytics > Suppliers "Spend by supplier" |
| Loading skeletons for KPIs | KPI cards | Kept (KpiStrip skeletons) |

## Filters

| Item | Old location | Status |
|---|---|---|
| Search (name, business name, contact, email, code) | Filter bar | Kept (also matches phone now) |
| Supplier code range from / to | Filter bar | Moved to More filters ("Code from", "Code to") |
| Business type | Filter bar | Kept |
| Location | Filter bar | Kept (LocationSelect, app-wide location) |
| Category | Filter bar | Kept |
| Status (Active / Inactive) | Filter bar | Moved to More filters ("Status"); also reachable from the "Active" KPI |
| Result count | Filter bar | Kept ("N suppliers") |
| Sort by spend / rating (header buttons) | Table header | Kept (sortable columns; all columns now sortable client-side) |

## Supplier table

| Item | Old location | Status |
|---|---|---|
| Code column | Table | Kept (under the supplier name) |
| Supplier name and Inactive badge | Table | Kept |
| Business name under the name | Table | Restored (under the name next to the code, shown when it differs from the name) |
| Contact person, phone or email | Table "Contact" column | Restored as a "Contact" column (hidden below large screens) |
| Business type and location | Table | Kept ("Type and location") |
| Supplies (categories, first 3 + count) | Table | Kept (shows products actually bought, falls back to categories) |
| Spend | Table | Kept (follows the period) |
| Rating stars | Table | Kept (hidden below extra-large screens) |
| Open issues / Clear | Table | Kept ("Open issues" column) |
| Last purchase | (new) | New in redesign, kept |
| Row click opens supplier | Table | Kept |
| Empty and loading states | Table | Kept |
| Inactive rows dimmed | Table | Kept |

## Add / edit supplier form

| Item | Old location | Status |
|---|---|---|
| Supplier code note (auto-assigned) | Add modal | Kept (form description) |
| Supplier name (required, duplicate check) | Add and edit | Kept |
| Business name | Add and edit | Kept |
| Business type | Add and edit | Kept |
| Location (required) | Add and edit | Kept |
| Contact person | Add and edit | Kept |
| Phone | Add and edit | Kept |
| Email | Add and edit | Kept |
| Address | Add and edit | Kept |
| Payment terms | Add and edit | Kept ("Terms and products" section) |
| Lead time (days) | Add and edit | Kept |
| Rating (star input) | Add and edit | Kept |
| Products supplied (categories) | Add and edit | Kept |
| Notes | Add and edit | Kept |
| Assigned agent | Add modal | Left out: the old form showed the picker but never sent it (`supplierPayload` had no agent field) and the supplier API has no assigned-agent field; the server records who added the supplier (`added_by`), which the Details tab shows as "Added ... by ...". Restoring it would be a control that does nothing. Backend need if wanted: an `assigned_agent` field on suppliers |
| Edit inline in the drawer | Drawer Overview | Moved to the Edit side sheet (drawer `⋯` > Edit, and row `⋯` > Edit) |

## Supplier drawer: header and actions

| Item | Old location | Status |
|---|---|---|
| Name, Inactive badge | Drawer header | Kept |
| Code, business name, business type | Drawer header | Kept (subtitle; business name restored there when it differs from the name) |
| Rating stars, payment terms, lead time | Drawer header | Moved to the Details tab (Terms section) |
| Deactivate / Reactivate (`suppliers.deactivate`) | Drawer header | Kept (drawer `⋯`, now with a confirmation) |
| Edit (`suppliers.edit`) | Drawer header | Kept (drawer `⋯`) |
| Call, Record purchase, Log issue | (new) | New in redesign, kept |
| Deep link `?open=<id>` | Page | Kept (plus `?supplier=<id>`) |

## Drawer: Overview tab

| Item | Old location | Status |
|---|---|---|
| Contact person, phone, email (copy buttons), location, address | Overview | Moved to the Details tab (copy buttons kept) |
| Added date and by whom | Overview | Kept (Details tab) |
| Total spend | Overview stat | Kept (drawer stats) |
| Purchase orders | Overview stat | Kept (drawer stats "Orders") |
| Products supplied count | Overview stat | Kept (count on the Products tab) |
| Last order | Overview stat | Kept (drawer stats "Last purchase") |
| Product categories | Overview | Kept (Details tab) |
| Notes | Overview | Kept (Details tab) |
| Spend trend chart | Overview | Moved to the Purchases tab ("Monthly spend") |

## Drawer: Order history tab (now Purchases)

| Item | Old location | Status |
|---|---|---|
| Orders count | Tab summary | Left out as a true duplicate: the same number is in the drawer stats ("Orders") and the tab badge on the same screen |
| Total spend | Tab summary | Kept (drawer stats, and the total line at the foot of the list) |
| Average order | Tab summary | Restored at the top of the Purchases tab (same calc: total of listed purchases ÷ number of purchases) |
| Order list: date, product, qty, unit cost, total | Table | Kept |
| Drill-down: SKU, batch no., expiry, sell price, markup %, recorded by, notes | Expanded row | Kept |
| Footer total across N orders | Table footer | Kept |
| Order count badge on the tab | Tab | Kept |
| Empty state | Tab | Kept |

## Drawer: Products tab

| Item | Old location | Status |
|---|---|---|
| Product name, orders, total quantity, SKU | Products | Kept (name now links to the product) |
| Latest price per unit | Products | Kept |
| Best price / +N% vs best badge | Products | Kept |
| Cheapest source line | Products | Kept |
| Empty state | Products | Kept |
| Sell-through per product | (new) | New in redesign, kept |

## Drawer: Performance tab

| Item | Old location | Status |
|---|---|---|
| Explanation of how sales are attributed | Performance | Restored at the new Performance tab (`supplier-performance-tab.tsx`), now also stating the data limit: "from the latest 500 sale movements across all products" |
| Units sold | Performance | Restored |
| Retail revenue | Performance | Restored |
| Gross profit with margin % | Performance | Restored |
| Sales frequency (count, per month, across N months) | Performance | Restored |
| Sell-through (of units bought) | Performance | Restored |
| COGS | Performance | Restored ("Cost of goods") |
| Last sold | Performance | Restored |
| Best seller callout (name, revenue, units) | Performance | Restored |
| Monthly retail revenue chart | Performance | Restored |
| Product performance table (sold, revenue, profit + margin, sell-through bar) | Performance | Restored (DataTable, sortable, phone cards) |
| Empty state | Performance | Restored |

All Performance calculations are the old ones line for line. The old tab read sale movements from an unfiltered stock-log query (server default page size); the new one reads the latest 500 sale movements, the same query the Products tab uses, and says so on screen.

## Drawer: Issues tab

| Item | Old location | Status |
|---|---|---|
| Issue count in header | Issues | Kept ("N issues logged, M open" line above the list) |
| Open count badge on the tab | Tab | Kept |
| Log issue (`suppliers.log_issue`) with type, severity, related product, description | Inline form | Kept (Log issue side sheet) |
| Issue card: type, severity, status, description, date, reporter, related product | Issues | Kept (related product now links to the product) |
| Resolution note and date | Issues | Kept |
| Resolve with optional note (`suppliers.resolve_issue`) | Issues | Kept |
| Empty state | Issues | Kept |

## Analytics > Suppliers tab

Checked; nothing from the old suppliers page needed to move there. It already shows spend, purchase orders and average order, suppliers used, open issues, spend over time, spend by supplier, spend by category, biggest cost changes, open issues by type and a supplier scorecard. Not edited.
