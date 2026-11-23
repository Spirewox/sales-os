# What the redesign removed, and where it went

The redesign (commits 0123b26 onward) trimmed information from several modules to "declutter". Sales OS is an analytics-heavy system, so every module was re-checked against the old UI (commit 03f1417), item by item: every KPI and its detail lines, chart, panel, drawer tab, table column, list, filter, form field and action.

Each item is one of:
- **Kept**: still on the same screen, perhaps restyled.
- **Moved**: on a different screen, tab or drawer; the ledger names where.
- **Restored**: had been removed and is back.
- **Left out**: still removed, with the reason.

| Module group | Kept | Moved | Restored | Left out | Ledger |
|---|---:|---:|---:|---:|---|
| Suppliers | 65 | 6 | 19 | 2 | [suppliers.md](suppliers.md) |
| Inventory | 74 | 1 | 12 | 2 | [inventory.md](inventory.md) |
| Customers and Engagement | 71 | 9 | 26 | 3 | [customers-engagement.md](customers-engagement.md) |
| Sales and Credits | 76 | 8 | 13 | 1 | [sales-credits.md](sales-credits.md) |
| Dashboard, Analytics and Insights | 86 | 9 | 26 | 3 | [dashboard-analytics.md](dashboard-analytics.md) |
| Kitchen, POS, Settings and Audit | 81 | 22 | 11 | 0 | [kitchen-pos-settings-audit.md](kitchen-pos-settings-audit.md) |
| **Total** | **453** | **55** | **107** | **11** | |

## The 11 items left out, and why

| Item | Why |
|---|---|
| Customer "Call" buttons (all screens) | Customers are contacted by WhatsApp only, at the user's request. WhatsApp buttons remain. |
| Customers list "Score" column | It was hard-coded to N/A for every row. The real credit grade is back in the customer drawer. |
| Customer drawer: monthly spending chart on Purchases | Identical chart is on the Overview tab of the same drawer. |
| Sale edit: typing "amount paid" directly | It bypassed the credit repayment ledger. Paid amount shows read-only, with a link to record payments in Credits. |
| Inventory Edit: "Current stock" field and its dates | It overwrote stock outside the batch ledger. The new Adjust stock form replaces it and is linked from Edit. |
| Inventory KPI cards' click-to-scroll | The table now sits directly under the KPI strips. |
| Supplier form: "Assigned agent" | The old form never sent it and the API has no field for it. Who added the supplier is shown in Details. |
| Supplier order history: "Orders" count | Same number is in the drawer stats and on the tab badge on the same screen. |
| Dashboard greeting and "Live" badge | Not information. |
| Dashboard credit book "Total owed" | Same figure as the "Owed to you" KPI on the same screen. |
| Dashboard "Stock value by category" and "Credit book" panels | Removed at the user's request on 21 Nov 2026. The same information is in Analytics > Inventory (stock value by category) and on the Credits page (owing, overdue, pending, balances). |

## New since the old UI (not removals)

Analytics now has Inventory and Suppliers tabs, Requests have a detail drawer, POS shows average sale, Audit trail exports CSV, and every list has rows-per-page.

## Data notes

- Several restored figures are computed from a capped set of records (for example the latest 200 stock movements or 500 purchases); each one says so on screen.
- The mock API can't show everything: it has no POS payment reviews, no batches expiring within 30 days, fixed retention (68%) and random supplier totals. These need checking against the real API.
