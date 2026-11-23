# Inventory: restoration ledger

Old UI: commit 03f1417 (`app/(app)/inventory/page.tsx`, `inventory-requests-panel.tsx`, `inventory-import-modal.tsx`).
New UI: `app/(app)/inventory/*` plus Analytics > Inventory (`app/(app)/analytics/inventory-tab.tsx`).

Totals: 90 rows. 74 kept (some reorganised, as noted), 1 moved, 12 restored, 2 left out, 1 new.

## Page header and controls

| Item | Old location | Status |
|---|---|---|
| Page title and description | Header | Kept (wording: "Stock, batches and expiry across your locations.") |
| Products / Ledger / Requests switch | Header toggle | Kept as section tabs Stock / Movements / Requests (URL `?tab=`) |
| Create SKU | Header button | Kept, in the header `⋯` menu (Purchase stock is the one primary action) |
| View ledger / Back to SKUs | Actions menu | Kept as the Movements tab |
| Inventory requests | Actions menu | Kept as the Requests tab, with a pending count badge |
| Batch actions (selection mode) | Actions menu | Kept: the stock table has row checkboxes and an "Update stock" bulk action |
| Download template | Actions menu and filter bar | Kept, header `⋯` menu |
| Import movements (.xlsx), validation preview, progress, errors | Actions menu and filter bar, import modal | Kept (`inventory-import-modal.tsx` unchanged) |
| Export CSV (same 9 columns) | Actions menu | Kept, header `⋯` menu |
| Show low stock (N) toggle | Actions menu | Kept as the Low stock cell in the "Needs attention" strip (filters the table) |
| Location filter | Location bar | Kept: app-wide location in the sidebar, plus LocationSelect in each tab's filter bar |
| Reporting period control (meals, volume, best sellers, volatility) | Reporting period bar | Restored at Stock tab > Sales trends (period picker, default all time, as before) |

## Alert and KPI cards (above the stock table)

| Item | Old location | Status |
|---|---|---|
| "Inventory alert: N items critically low" banner with first 3 names and "+N more" | Above KPIs | Restored at Stock tab, top: same list (at or below minimum, out of stock included), names, "Show them" toggles a new `?stock=below` filter |
| Inventory value (cost) | KPI card | Restored at Stock tab > "Stock position" strip (follows the filters, as before). Also on Analytics > Inventory |
| Total active SKUs | KPI card | Restored at Stock position strip, "Active products", with the category count |
| Total units, with top 3 units of measure | KPI card | Restored at Stock position strip, "Units on hand", detail lists the top 3 units |
| Retail value (admins only) | KPI card | Restored at Stock position strip, admins only as before, with potential gross profit. Analytics > Inventory now also hides it from non-admins. Calculation fix: carton products now use the carton selling price (the old card multiplied cartons by the per-kg price) and negative stock counts as zero, so it matches Analytics |
| Meals served (kitchen, food plate) | KPI card | Kept in Stock tab > Sales trends and Analytics > Inventory |
| Meals served card click filters the table to Kitchen | KPI card | Restored: "Show kitchen products" link next to meals served in Sales trends |
| Low stock alerts count | KPI card | Kept, split into Low stock and Out of stock cells (each filters the table) |
| Expiring soon count | KPI card | Kept, "Expiring in 30 days" cell (filters), detail counts batches |
| Card clicks that scroll to the table | KPI cards | Left out: the table sits directly under the strips, there is nothing to scroll to |

## Sales charts

| Item | Old location | Status |
|---|---|---|
| Volume sold by unit (Kg, Litres, ml, Units) | Chart above table | Kept in Stock tab > Sales trends (collapsed) and moved to Analytics > Inventory |
| Top 3 best sellers (quantity, revenue) | Card above table | Kept in Sales trends and Analytics > Inventory |
| Top 3 most volatile (volatility %, last change) | Card above table | Kept in Sales trends and Analytics > Inventory (Analytics adds min to max price) |
| Link between the two | n/a | Restored: "Open Analytics, Inventory" link inside Sales trends |

## Product filters

| Item | Old location | Status |
|---|---|---|
| Search SKU or product | Filter bar | Kept (URL `?q=`) |
| Category | Filter bar | Kept (URL `?category=`) |
| SKU multi-select | Filter bar | Kept under "More filters" (URL `?sku=`) |
| Low stock only / All stock levels | Filter bar | Kept as KPI cells and chips |
| Active filter chips (Low stock, Expiring within 30 days, Kitchen) | Filter bar | Kept: chips for stock state, category, SKUs and search |
| "Update selected (N)" | Filter bar | Kept as the table's bulk action |

## Stock table columns

| Item | Old location | Status |
|---|---|---|
| Photo, product name, SKU | SKU and product column | Kept |
| "via {supplier}" under the SKU | SKU and product column | Restored (shown from tablet width up) |
| Expiring batch lines (batch code, qty left, days to expiry) when the expiring filter is on | SKU and product column | Restored in the "Next expiry" column when `?stock=expiring` is on |
| Category | Column | Restored as a column (from wide desktop up) |
| Hub (when all locations) | Column | Kept as Location (always shown from laptop width up) |
| Status: Out of stock / Critical / Low (within 1.5x minimum) / Healthy | Column | Kept as Out / Low / In stock. The old "Low" level (above minimum but within 1.5x) is restored as a "near minimum" note under On hand, and on the drawer's Minimum level row |
| Stock (red when low) | Column | Kept as On hand, with the minimum under it |
| Cost / price (avg) with margin % | Column | Kept as three columns: Avg cost, Price, Margin |
| Value | Column | Kept |
| Sorting by cost and value | Column headers | Kept; every column sorts |
| Edit, Purchase, Transfer row actions | Actions column | Kept: Purchase and Transfer inline, Adjust and Edit in the row `⋯` |
| Pagination, "Showing x to y of N" | Table footer | Kept |

## Movements (ledger)

| Item | Old location | Status |
|---|---|---|
| Total inbound value | Ledger stat card | Kept, "Stock in" with movement count |
| Total outbound value | Ledger stat card | Kept, "Stock out" with movement count |
| Net movement value | Ledger stat card | Kept, "Net" with the period |
| Search (product, notes, batch) | Ledger filters | Kept |
| Movement type | Ledger filters | Kept |
| From / To dates | Ledger filters | Kept as the period control with a custom range (default is now last 30 days instead of all) |
| Clear filters | Ledger filters | Kept as chips and "Clear all" |
| Entry count | Ledger heading | Kept as the result count |
| Date, Product (+batch), Type, Qty (+/-), Unit cost, Total value | Ledger columns | Kept |
| Details: transfer route, supplier, expiry badge, notes | Ledger column | Kept |
| Limit: latest 200 movements | Implicit | Kept and now stated under the table |

## Product drawer

| Item | Old location | Status |
|---|---|---|
| Photo, name, stock status, SKU, location | Drawer header | Kept |
| Edit button | Drawer header | Kept in the drawer `⋯` menu |
| Purchase, Transfer quick actions | Overview tab | Kept in the drawer header, plus Adjust |
| Stock on hand vs open batches mismatch warning, "Align stock to batches" | Above tabs | Kept on the Batches tab |
| Current stock, Stock value, Avg unit/carton cost, Margin | Overview tab | Kept as the drawer stat row |
| Selling price (avg from batches), Carton selling price, Carton weight | Overview tab | Kept on Overview |
| Margin warning "Selling below cost" | Overview tab | Kept on Overview |
| Inbound / Outbound totals | Overview and Activity tabs | Moved to Activity only (the same figure from the same loaded movements; it was shown twice) |
| Min level, Last updated, Last purchase price, Last supplier (links to supplier), Expensed opening | Overview tab | Kept on Overview (plus category and unit of measure) |
| Suppliers tab: name (links), Cheapest badge, rating, open issues, orders, qty bought, last date, last price, spend | Suppliers tab | Kept |
| Sales tab: units sold, revenue, gross profit and margin, sales count | Sales tab | Kept |
| Sell velocity, days of cover, "Reorder soon via {supplier}" | Sales tab | Kept |
| Buyer mix (B2B / B2C), Bought most by (segments), Monthly revenue | Sales tab | Kept |
| Top buyers (6): name (links), type, segment, revenue, share, qty | Sales tab | Kept |
| Batches: code, received date, Spent badge, qty remaining, cost, supplier, expiry badge | Batches tab | Kept (now also shows the expiry date) |
| Batch selling price ("Price") | Batches tab | Restored on each batch that has a ledger entry, as before |
| Edit batch cost with review step | Batches tab | Kept |
| Price history (date, cost, price, margin), last price update | Price tab | Kept |
| Activity: type, batch, qty, date, unit cost, transfer route, supplier, reference, unit, "showing x of y", load more on scroll | Activity tab | Kept |

## Forms

| Item | Old location | Status |
|---|---|---|
| Create SKU: image, product code note, name, category, unit, min level, selling price, carton price, carton weight, supplier, location | Create SKU modal | Kept (side sheet) |
| Create SKU: initial stock, avg cost, purchased date, expiry date | Create SKU modal | Kept in the optional "Opening stock" section |
| Create SKU: expensed opening (scope, mode, value, count unit) | Create SKU modal | Kept |
| Create SKU: negative margin warning | Create SKU modal | Kept |
| Edit SKU: image, product code, name, category, unit, min level, location, selling price, carton price, carton cost, carton weight, review step | Edit SKU modal | Kept |
| Edit SKU: "Current stock" field (and its purchased / expiry dates) | Edit SKU modal | Left out: it overwrote stock directly and bypassed the batch ledger. Adjust stock (ledger entry) replaces it, linked from the Edit sheet |
| Purchase: product, current stock and location, quantity, unit, conversion preview, cost, selling price, carton price, carton weight, purchased date, expiry date, supplier (with link to Suppliers when none), notes, review step | Purchase modal | Kept |
| Transfer: batch, quantity (max for batch), to location, notes, review step | Transfer modal | Kept |
| Batch stock update: movement type, notes, per-product qty and cost, on-hand, over-stock highlight | Batch update modal | Kept |
| Adjust stock | n/a | New (replaces the Edit current stock field) |

## Requests

| Item | Old location | Status |
|---|---|---|
| Status filter (all, submitted, approved, fulfilled, rejected, cancelled) | Requests header | Kept, plus "Needs my action" (default) and "All open" |
| New request | Requests header | Kept as the header primary action on the Requests tab |
| Request form: requesting and fulfilling location (suggested parent), product with stock, quantity, unit, carton / volume conversion, notes | Inline form | Kept (side sheet) |
| Route (from to), requested by, date, status | Request card | Kept as table columns |
| Lines with conversions, notes, rejection reason | Request card | Kept in the table, but truncated there; full text restored in a request drawer (click a row) that also shows reviewed by, fulfilled by and last update |
| Approve, Fulfil, Reject (with reason), Cancel | Request card | Kept on the row and in the request drawer |

## Not information, left as is

The old screen's colour coding (green / red movement types, rainbow chart bars) is replaced by neutral badges and the one-accent rule; the values it carried are all still shown.
