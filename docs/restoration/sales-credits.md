# Restoration ledger: Sales and Credits

Old UI = commit 03f1417. "Now" = this branch after restoration. Calculations are unchanged from the old code unless noted.

## Sales page (`app/(app)/sales/page.tsx`)

| Item | Old location | Status |
|---|---|---|
| Revenue KPI + change | KPI card "Revenue", "vs last month" from server `revenueChange` | Kept: KPI strip 1 "Revenue"; change is now vs the previous period of the selected window (second summary query). |
| Profit KPI (admin only) + change | KPI card "Profit", admin only, "vs last month" | Restored at: KPI strip 2 "Profit and volume" > Profit (admin only), with change vs previous period computed the same way as Revenue (`profitChangePct` in use-sales-page.ts). |
| Total sales count | KPI card "Total Sales" | Kept: strip 1 "Sales". |
| Average order | KPI card "Avg. Order" | Kept: strip 1 "Average order". |
| Credit sales: count and amount | KPI card "Credit Sales" `N (₦X)` | Kept: strip 1 "Credit sales" (amount as value, "N sales on credit" as detail, links to Credits). |
| Deliveries count | KPI card "Deliveries" | Restored at: strip 2 > Deliveries. The cell also filters the list to the Delivery channel (click again to clear). |
| Units sold by unit (Kg, Cartons, Liters, ml, Plates, Units, then other units) + scope hint (SKUs / categories / All categories) | KPI card "Units Sold" with "Other recorded units" disclosure | Restored at: strip 2 > Units sold. Largest main unit as the value; every other unit listed in the detail line in the old order; scope hint (selected SKUs, categories or "All categories") at the end. Same ordering logic, now `unitsSoldRows()` in sales-utils.ts. |
| "(filtered)" suffix on KPI labels | KPI labels | Moved to: filter chips under the filter bar and the period in each KPI detail line show what the numbers cover. |
| Date presets Today / This week / This month / Last 30 days / All time | Button row above filters | Moved to: Period select (Today, Last 7 days, Last 30 days, This month, All time, Custom). "This week" became "Last 7 days" in the app-wide period vocabulary; custom range covers from/to. |
| From / To date inputs | Filter bar | Moved to: Period select > Custom range. |
| Date field (Date sold / Date recorded) | Filter bar select | Kept: More filters > "Date filter uses". |
| Agent filter | Filter bar | Kept: More filters > Agent. |
| Sale status filter (Pending / Approved / Paid / Voided) | Filter bar "All Status" | Restored at: More filters > Sale status (Pending, Approved, Paid; `?status=`). Voided stays under the inline Payment filter ("Voided"). |
| Hub filter | Filter bar | Kept: Location select (app-wide sidebar location). |
| Channel filter | Filter bar | Kept: More filters > Channel (and the Deliveries KPI). |
| Categories multi-select | Filter bar popover | Kept: More filters > Category. |
| SKU multi-select | Filter bar | Kept: More filters > SKU (searchable). |
| Search customer / product / notes | Filter bar | Kept. |
| Clear filters | Filter bar | Kept: "Clear all" on the chip row. |
| "Showing X to Y of Z" | Filter bar and table footer | Kept: result label + table pagination footer. |
| Import sales | Header button | Kept: header overflow (⋯) > Import sales. |
| Download template (Catalog / Custom) | Header split menu | Kept: overflow > Catalog sales template, Custom product template. |
| Export | Header button | Kept: overflow > Export sales (uses current filters). |
| Record sale | Header primary | Kept: header primary button (+ phone bottom bar). |
| Column: Date sold | Table | Kept: Date. |
| Column: Customer + channel badge | Table | Kept: Customer with channel under the name. |
| Column: Product name | Table | Kept: Items column. |
| Column: Quantity (sortable) | Table | Moved to: Items column shows "Product, qty unit"; quantity sort is in More filters > Sort (high to low / low to high). |
| Column: Unit | Table | Moved to: Items column (qty + unit). |
| Column: Category | Table | Restored at: Category column (shown from xl width; phones see it in the drawer). |
| Column: Amount (sortable) + "Paid: X" when part paid | Table | Kept: Amount (sortable) with "₦X due" under it (balance instead of paid; same information). |
| Column: Payment mode badge + payment type (Cash/Transfer/POS) | Table | Kept: payment status badge. Restored: payment method under the badge (not for full-credit or voided sales, as before). |
| Voided rows dimmed | Table | Kept. |
| New: Sale # and Hub columns | n/a | Added in redesign; kept. |

## Sale drawer (`sale-detail-panel.tsx`, `sale-detail-tabs.tsx`)

| Item | Old location | Status |
|---|---|---|
| Header: customer, date, agent, channel, Credit/Kitchen badges | Drawer header | Kept: customer (now a link), sale #, channel, Kitchen in subtitle; payment status badge replaces "Credit"; date in stats; agent in Overview. |
| Edit / Save / Cancel | Header | Kept: Edit in overflow; Save/Cancel in header while editing. |
| Tabs Overview / Delivery / History (count) | Tab row | Kept. |
| Total amount, Amount paid, Balance | Overview cards | Kept: drawer stats Amount / Paid / Balance (balance uses the linked credit record so repayments count). |
| Discount (view mode) | Under total amount | Restored at: Overview badge row, "Discount: ₦X" when > 0. |
| Discount and amount (edit mode) | Overview | Kept. |
| Amount paid edit | Overview edit input | Left out: the raw "amount paid" edit bypassed the repayment ledger. Edit mode shows the paid amount read-only with a link to Credits > Record payment. |
| Payment mode, payment type, credit badges | Overview | Kept. |
| Product details: name, batch allocations, qty, unit, weighed kg, category, batch cost, recorded SKU price, "under list, charged ₦X" | Overview | Kept (all fields). |
| Admin edit of product name/qty/unit/category | Overview | Kept. |
| Date sold, date recorded, last updated, agent, hub (editable), channel (editable), payment terms (editable) | Overview grid | Kept. |
| Delivery info (address, phone) | Overview | Kept. |
| Notes (editable) | Overview | Kept. |
| Linked stock movements | Overview | Kept. Note: built from the stock-log query, which is paged by the API (same limitation as before). |
| Void with confirm | Overview footer | Kept: overflow > Void sale, confirm panel at top. |
| Delivery stepper, address/phone edit, Advance to next step | Delivery tab | Kept. |
| Other sales to this customer (status, credit badge, product, amount) | History tab | Kept. Based on the sales loaded on the current page (same as before). |
| New: Record payment, Receipt, Open credit link | n/a | Added in redesign; kept. |

## Record sale (`add-sale-modal.tsx`, `use-record-sale.ts`)

| Item | Old location | Status |
|---|---|---|
| Hub, channel, delivery address, customer phone, date, agent, notes | Form fields | Kept: Details section (collapsed, summary in its description). |
| Customer (server search) | Form | Kept. |
| Customer context: type, orders, total spent, avg order, last purchase, outstanding credit | Context card | Kept, plus Restored: "avg order" (it was computed but not shown). Outstanding credit is the Owes/Overdue badge linking to Credits. |
| Credit warning shown whatever the payment mode | Warning box | Restored: warning line under the customer when paying in full; credit modes keep the warning under Payment ("This sale adds to it"). |
| Meal sale (name, Kitchen, Food plate) | Product option + panel | Kept: "Record a meal" option; meal name field with the Kitchen / food plate hint. |
| Product select | Form | Kept: searchable product combobox (shows SKU, stock, price per option). |
| On hand, kg per carton, low stock | Info line under product | Kept. |
| SKU selling price per unit (carton and kg, or each volume unit, or per UOM) | Info line under product | Restored at: info line under product, "(SKU price)". |
| FIFO note | Under product | Kept: Item section description. |
| Unit, quantity (0.5 carton steps), weighed kg with suggestion | Form | Kept. |
| Amount, discount | Form | Kept. |
| List price breakdown, under list / % off / above list / discount | Live line | Kept. |
| Payment mode (full / partial / credit), payment type, paid now, due date | Form | Kept. |
| Balance on credit | Under paid now | Moved to: sticky footer preview "Total, Paid, Balance". |
| Re-price when the SKU price changes while the form is open | `useEffect` in old use-sales-page | Restored at: use-record-sale.ts, render-time comparison (no effect). When the selected SKU's price or carton price changes, the amount is recalculated and the discount reset, with a note in the Item section. Safety change: past-dated (historical) sales keep the typed amount, since those must be entered by hand. |

## Credits page (`app/(app)/credits/page.tsx`, `credit-columns.tsx`)

| Item | Old location | Status |
|---|---|---|
| Total outstanding | KPI card | Kept: strip 1 "Outstanding" (also clears the filter). |
| Customers with credit | KPI card | Moved to: Outstanding detail ("N customers") and Open credit items detail. |
| Overdue items | KPI card | Kept: strip 1 "Overdue" detail. Restored as its own number in strip 2 "Collection health" > Overdue items (with % of open items). |
| Avg days overdue | KPI card | Restored at: strip 2 "Collection health" > Avg days overdue. Same calculation (`buildMetricsFromSummary`: average of each overdue customer's oldest overdue item), now scoped to the selected location; the detail line states the basis. |
| Flagged items | Avg days card footnote | Kept: strip 1 "Flagged" (customers and items; filters the list). |
| Open credit items total | (sum of the Open column) | Restored at: strip 2 > Open credit items. |
| Search customer | Filter bar | Kept (now also matches phone). |
| Overdue only toggle | Filter bar | Kept: Overdue KPI filter (`?filter=overdue`, old `?overdue=1` still works). |
| Sort: Outstanding | Filter bar button | Kept: sortable Outstanding column. |
| Column: Customer + flag | Table | Kept (phone added under the name). |
| Column: Outstanding (red when overdue) | Table | Kept; red tone when the customer has overdue items Restored. |
| Column: Open (count) | Table | Restored at: "Open items" column (sortable, shown from xl width). |
| Column: Overdue (count, sortable) | Table | Kept: Overdue column (sortable) shows the amount; the item count is Restored under it. |
| Column: Oldest due + days overdue (sortable) | Table | Kept. |
| Footnote: credits come from sales | Under table | Moved to: page description. |
| New: Due this week KPI, Last payment column, WhatsApp, Record payment row actions, location filter | n/a | Added in redesign; kept. Customer "Call" buttons left out: customers are contacted by WhatsApp only. |

## Customer credit sheet (`components/credits/*`)

| Item | Old location | Status |
|---|---|---|
| Total outstanding | Sheet header | Kept: stats "Outstanding". |
| Open credits count | Header pill | Kept: stats "Items". |
| Overdue count | Header pill | Kept: stats "Overdue" (amount); Restored: count in the status badge ("N overdue"). |
| Flagged count | Header pill | Kept: "N flagged" badge. |
| General repayment | Header button | Kept: "Record repayment" (oldest due first, pay-full shortcut). |
| Open credits list / Cleared or closed list | Sections | Kept (open items now oldest due first). |
| Item: product, status, extensions, flag | Card | Kept. |
| Item: qty + unit | Card | Kept. |
| Item: sale date and amount | Card | Kept. |
| Item: sale payment mode | Card meta line | Restored at: item card meta line. |
| Item: due date, days past due (aging per item) | Overdue banner | Kept: "Due X, N days late" in red. There was no aging-bucket breakdown in the old sheet. |
| Item: outstanding / Cleared, % collected | Card | Kept. |
| Original credit, collected (₦ and %) | Expanded card | Kept. |
| Repayment history (amount, method, date, recorded by, balance after, note) | Expanded card | Kept ("No repayments yet" when empty). |
| Extension trail (from → to, when, by whom, reason) | Expanded card | Kept. |
| Record payment, Extend due date, Flag / Remove flag | Expanded card | Kept: always visible on open items. |
| Record payment form (amount, method, note) | Modal | Kept (FormSheet). |
| Extend form (new date with days-from-today hint, reason, prior extensions) | Modal | Kept. |
| New: last payment stat, WhatsApp, View customer, Record sale, View sale link | n/a | Added in redesign; kept. Call button left out (WhatsApp only). |

## Counts

By row status: 76 kept, 8 moved, 13 restored, 1 left out (manual "amount paid" edit). Counting the partial restorations inside "Kept" rows, 19 pieces of information or behaviour came back. Customer Call buttons stay out by request (WhatsApp only).
