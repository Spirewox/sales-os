# Sales OS: UI and UX improvement plan

Written 20 November 2026 from a full audit of every module: screenshots of each page, tab and drawer at 1280px and 390px, plus a read of the code. The visual cleanup (one accent colour, Geist, 12px minimum text, status-only colour) is already done; this plan is about layout, flow and the system that pages are built from.

## 1. Diagnosis: why the app feels heavier than it is

Five root causes explain most of what's wrong. Fixing them at the system level fixes every module at once.

1. **There is no shared component layer.** Each page hand-builds its own header, filters, cards and tables: 119 hand-written button styles (2 pages use the `Button` component), 29 hand-built tables (the `Table` component is used 0 times), 19 raw `<select>` dropdowns, 3 different KPI card components, 5 money formatters, tooltip styles copied into 4 files. Every page therefore looks and behaves slightly differently, and every fix has to be made 11 times.
2. **Filters crowd out the work.** On most pages, the thing the user came for (the table) starts below the first screen:
   - Sales: about 900px down (7 KPI cards, a period strip, then a 300px filter card with 10 controls).
   - Customers: about 600px of period controls, hint text and 9 KPI cards.
   - Inventory: about 1,150px down (a 300px location and period card, 7 KPIs, 3 sales charts).
   - Analytics: the filter card is the entire first screen on a phone.
3. **Too many numbers, few of them actionable.** Pages show 6 to 9 KPI cards. Most aren't clickable, have no comparison ("is ₦1.2M good?"), repeat a column or list on the same page, or belong to another module (Inventory shows "Meals served" and best sellers). Some disagree with themselves:
   - Suppliers: KPI says 2 open issues while every row says "Clear"; total spend is "N/A" while rows show millions.
   - Dashboard: three different time periods on one screen.
4. **The same control behaves differently in every module.** Location is a chip cloud on Customers, Analytics and Inventory, a dropdown on Sales and Suppliers, and worded three ways ("All permitted locations", "All accessible locations", "All locations"). Period presets are "Daily/Weekly/Monthly/All time" in some places and "Today/This week/This month/Last 30 days/All time" in others. Sales has two date systems that don't sync. Tabs are an underline bar on Kitchen, a pill toggle inside the action buttons on Inventory, chips on Audit.
5. **Lists you can look at but not act on.** Overdue credit, low stock, top customers, debtors and churn rows mostly aren't clickable and have no row actions. Chasing a debt takes 3 clicks and there's no phone number on the Credits list. Churn rows can't be marked as contacted, so the list never gets shorter.

## 2. Design approach

### Principles
- **The task first.** Each page leads with the thing its main user came to do: find a sale, chase a debt, see what's running out. Analytics lives in Analytics.
- **One way to do each thing.** One header, one filter bar, one table, one drawer, one status vocabulary, used everywhere.
- **Every number earns its place.** At most 4 KPIs per page; each one either filters the page when clicked or shows a comparison. Never repeat a number already on screen. A KPI and the rows below it come from the same data.
- **Act where you look.** Rows open a drawer; common actions (Call, Record payment, Restock) sit on the row; drawers link sale, customer and credit to each other.
- **Calm by default.** Optional fields collapsed, rarely used filters behind "More", destructive actions in a `⋯` menu, confirmation for anything irreversible.

### The component kit (build once in `components/app/`, then every page uses it)

| Component | What it does | Replaces |
|---|---|---|
| `PageHeader` | Title, optional one-line description, one primary action, `⋯` overflow menu (Import, Export, Template). Tabs always sit **below** the title, never in the action cluster. | 15 hand-built headers; Inventory's tab pills in the action area; Sales' 4 equal header buttons |
| `SectionTabs` | Underline tab bar (Kitchen's style), synced to `?tab=` in the URL so tabs can be linked, with count badges ("Requests 3"). A select on phones. Also used for tabs inside drawers. | Pills on Inventory and POS, chips on Audit, local-only tab state on Settings and Audit |
| `FilterBar` | One row: search that grows, up to 4 compact filters, "More filters" popover, removable chips for active filters, "Clear all", result count. Filter state lives in the URL. | Labelled filter cards of 300 to 450px on Sales, Customers, Inventory, Analytics, POS |
| `LocationSelect` | One dropdown, one wording, defaulting from the app-wide hub context. | Chip clouds and three wordings |
| `PeriodSelect` | One control: presets (Today, Last 7 days, Last 30 days, This month, All time) plus a custom range in a popover. One vocabulary, one date format. | Preset strips + separate From/To boxes; "Daily" meaning "today" |
| `KpiStrip` | Up to 4 cells in one bordered strip (the new dashboard style): label, value, comparison vs previous period, detail line. Cells can act as filters. Shows a skeleton while loading, never "0". | 3 KPI components, 6 to 9 cards per page, "0" while loading |
| `DataTable` | Sortable headers, rows that are keyboard-focusable links opening a drawer, up to 2 labelled row actions plus `⋯` (destructive last), sticky bulk-action bar, pagination everywhere, a loading-aware footer (never "No sales to show" while loading), and card rows below 768px showing the 3 key fields. | 29 hand-built tables; tables that scroll sideways on phones with Amount off-screen |
| `EntityDrawer` | Side sheet: identity, status and key number in a sticky header with primary actions (destructive in `⋯`), a compact stat row, then `SectionTabs`. The default tab is the frequent task (Batches for a product, Purchases for a supplier). Cross-links between records. | 6 drawers with different structures |
| `FormSheet` | Full-height side sheet for create/edit: sections in task order, required fields first, optional sections collapsed, derived values shown as a preview line, sticky footer, and a reason shown when Save is disabled. Built on the existing `ModalDialog`. | Long centred modals whose Save button falls off-screen |
| `StatusBadge` | One vocabulary per domain: payments (Paid, Partial, Credit, Overdue, Voided), stock (In stock, Low, Out, Expiring), work (Open, In progress, Resolved). | Mismatched filter vs column vocabularies (Sales "Approved" filter vs "Partial" column) |
| `EmptyState` / `ErrorBoundary` | Empty states name the active filters and offer "Clear filters" or the first action. Each tab and section is wrapped so one bad response can't blank the page. | Bare "No data" lines; Settings crashing entirely on one malformed response |

Plus shared utilities: one `formatMoney` / `formatAxisMoney`, one chart tooltip config, one timezone rule (Africa/Lagos), one save model (forms: sticky "Unsaved changes" bar with Discard and Save; toggles: save instantly with a toast).

### App shell
- **Group the navigation**: *Overview* (Dashboard, Analytics), *Sell* (Sales, POS, Credits, Customers, Engagement), *Operate* (Inventory, Suppliers, Kitchen), *Admin* (Audit trail, Settings). Today it's 11 items in an arbitrary order.
- **Hub context**: a location switcher at the top of the sidebar that sets the default location for every page, instead of each page having its own filter. Shows the current scope at a glance.
- **User menu**: the footer becomes a menu (Profile, Alerts, Theme, Log out) instead of a bare logout icon.
- **Mobile top bar**: menu button, page title, bell. Today the menu and bell float over the content with no title.
- **Later**: a `⌘K` command palette with search over customers, sale numbers, SKUs and pages.

### Chart rules
No pie charts with more than 3 slices (use a ranked bar list with %); never show a legend and a duplicate list; every chart follows the page period; money axes read `₦2M`, not `₦2000k`.

## 3. Module by module

Effort: **S** = hours, **M** = a day or two, **L** = several days or needs backend work.

### Dashboard
*Job:* daily check: how is today going, who owes, what's running out.
- One page-level period (Today, 7 days, 30 days) and hub selector in the header; every section follows it. Top customers says "lifetime" until then. **M**
- KPI strip of 5 with "vs previous period": Revenue, Orders, Collected, Owed (overdue in red as detail), Stock alerts. **M** (needs prior-period figures from the API)
- "Needs attention" becomes a full-width action list with tabs (Overdue credit, Low stock, Open tickets), clickable rows and row actions (Call, Restock), shown directly under the KPIs on phones. **S** for clickable rows and mobile order, **M** for the full version.

### Sales (highest traffic)
*Job:* record a sale fast; find or check a sale.
- Header: Record sale + `⋯` (Import, Template, Export). **S**
- 4 KPIs (Revenue vs prior, Sales count, Credit sales linking to Credits, Average order); Profit, Units and Deliveries move to Analytics. **S**
- `FilterBar` in one row: search, one date control, Location, Payment status, "More" (agent, channel, category, SKU); chips underneath. This removes the second date system. **M**
- Table: Date, Sale #, Customer (+ channel), Items ("Gizzard, 12 kg"), Hub, Amount (balance underneath), Payment status. Card rows on phones and a sticky Record sale button. **M**
- **Record sale as a side sheet** with a sticky footer: Customer (with credit chip and "+ New customer") → Items (searchable product, several lines) → Payment → collapsed Details (hub, channel, date, agent, notes defaulted from context). Show why Save is disabled. **M**, multi-item lines **L**.
- Sale drawer: summary header (amount, paid, balance, status) with Record payment, Receipt, Edit and Void in `⋯`; links to the customer and the credit item; remove the raw "amount paid" edit that bypasses the repayment ledger. **M**

### Credits
*Job:* chase overdue balances and record repayments.
- Default sort by days overdue; drop the duplicate sort button. **S**
- 4 KPI tiles that filter: Outstanding, Overdue, Due this week, Flagged. Add a Location filter. **S**
- Table: Customer + phone, Outstanding, Overdue, Oldest due (days late), Last payment, row actions Call and Record payment. **M**
- Sheet: contact actions in the header, "Record repayment" (allocated oldest first), inline Pay and Extend on each item, "Log contact attempt". **M**

### Customers
*Job:* find a customer and act on them.
- Remove the 600px preamble: period presets, hint paragraph and 9 KPIs. Keep at most 3 (Total, New in period, Repeat %) or none. **S**
- Remove the "Score" column and badges, which always show "N/A" (hard-coded). **S**
- Table: Customer (+ company), Phone, Hub, Last purchase, Orders, Revenue, Outstanding, `⋯` (Record sale, Log feedback). **M**
- Drawer: Call / WhatsApp, Record sale, Record payment, Log interaction in the header; tabs Overview, Purchases, Credit (with actions), Interactions (with Add). **M**
- Add customer: name, phone (required), type, company, hub; the 12 profile questions collapsed under "Profile (optional)". Connect labels to inputs. **S**

### Engagement
*Job:* who to win back this week (Churn); log and resolve feedback (Interactions).
- Remove the duplicate headings; put "Log feedback" in the page header. **S**
- Churn: "Log outcome" on each row, which snoozes or removes it, so the list gets shorter as work gets done. **M** (needs an endpoint to store outcomes)
- Interactions: default to Open; labelled row buttons instead of 4 icons; then one queue for feedback, enquiries and compensations with a detail drawer. **S** / **L**
- Feedback form: optional link to a sale or product so complaints can be traced to a batch. **M**

### Inventory
*Job:* see what's low or expiring, then purchase, transfer or approve.
- Real tabs under the title: **Stock**, **Movements**, **Requests (3)**; each tab owns its page below the header. Today the filter card, 7 KPIs and 3 charts render on every tab, so Ledger and Requests sit below the fold. **S**
- Remove the reporting period from Stock (it only drove sales charts); move "Meals served", best sellers and volatility charts to Analytics. **S**
- An attention strip: Low, Out, Expiring in 30 days, Pending requests, each a filter. Removes the 4 duplicate low-stock controls. **S**
- Stock table: Product (name, SKU), Location, On hand vs minimum, Next expiry, Avg cost, Price, Margin, Value, labelled Purchase / Transfer plus `⋯`. Bulk bar on selection. Card rows on phones. **M**
- Movements: in/out/net strip and a paginated table (there is no pagination today). Requests: default "Needs my action", inline Approve / Fulfil / Reject, scoped to location. **M**
- Product drawer: Batches as the default tab (sorted by expiry); Purchase / Transfer / Adjust / Edit in the header. Remove the raw "current stock" overwrite from Edit (it fights the batch ledger) and route changes through Adjust. **M**
- Create SKU: "Product" section first; "Opening stock" as an optional collapsible section; product code as a preview line. **M**

### Suppliers
*Job:* find a supplier; see spend, reliability and open issues; reorder.
- **Fix the two data bugs**: the Issues column (built from one supplier's issues only) and Total spend (summed from a different source than the rows). **S** (confirm against the real API)
- 3 KPIs: Spend (period), Open issues (filters), No purchase in 60 days. Remove "Top suppliers by spend" (repeats the Spend column). **S**
- One-row filter bar; the supplier-code range moves into "More". Table: Supplier (+ code), Type and location, Supplies, Spend, Last purchase, Rating, Open issues, `⋯`. **M**
- Drawer: Call, Record purchase, Log issue in the header; Edit and Deactivate in `⋯`. **S**

### Kitchen (healthiest module; its header and tab bar are the model for the others)
- Settings shows markups as "2.5 %" when they are multipliers: show "× 2.5". Fix the truncated label. **S**
- Recipes use the configured targets ("At target 35%", "At pack markup × 2.5") instead of hard-coded 30% and 100%. **S**
- Board: a 3-chip strip (Overdue, Due soon, Done today) instead of 5 KPI cards that repeat column counts. **S**
- Toolbars on one line (Jobs search currently collapses; Ingredients buttons wrap). **S**
- Job panel: header with stage, customer, due date, the advance button and `⋯` for the other 6 actions; warnings first; tabs Summary, Costing, Shopping list, Payments. **M**
- Job form: Service before Customer; label every repeated row; replace "import the prototype data" with real empty-state copy. **S**

### Analytics
*Job:* periodic review: trends, products, customers, credit risk.
- Compact filter bar in the header (hub, period defaulting to Last 30 days, Reset); the data-source note goes into an info tooltip. **S**
- Every tab has the same shape: KPI strip with comparisons → one main chart → 2-column secondary charts → a sortable table with clickable rows. **M**
- Replace pies with ranked bar lists; remove the duplicate growth banner; numbers ignoring the selected period either follow it or say so. **M**
- Check the customer acquisition chart, which puts bars and a line inside an area chart and may not draw them. **S**

### Insights
- Decide where it lives: it's hidden from the menu yet duplicates Analytics' Compare. Either fold it into Analytics as an "Explore" tab or restore the menu item, and keep one Compare. **M**
- Two-pane layout (question or levers on the left, results on the right; results first on phones); 4 example questions instead of 10, plus recent questions. **M**

### POS
- One header for all tabs (title, tabs, shared filter row); Overview in the order KPIs → Live tills → Locations → Payment mix. **S**
- Transactions as a real table: Time, Reference, Location, Till, Cashier, Method, Status, Amount, with a drawer for receipt lines. Filters apply as you change them; Till and Cashier become pickers; chips and Clear all. **M**
- "Register till" button in the Tills header; the per-location "manual payment confirmation" setting moves to Settings > Locations. **M**

### Settings
- Split into **Your account** (Profile, Password, Appearance, Alerts) and **Organisation** (Users, Locations, Roles & access) with a left sub-menu; every tab linkable by URL. **M**
- Users as a compact table with search, role and location filters, status and last active. **M**
- Row actions: Edit visible; Deactivate, Downgrade and Delete in `⋯` with confirmation. **S**
- Roles as a matrix (permission groups as rows, roles as columns) with plain-language labels instead of raw keys like `pos.view`. **L**
- Guard against malformed responses and wrap each tab in an error boundary. **S**

### Audit trail
- Remove the overlapping Module dropdown (it duplicates the chips); add a Location filter; filters in the URL. **S**
- Dense table (Time, User, Location, Record link, Action, Summary) opening a drawer with a before/after comparison instead of raw JSON; CSV export. **M**
- Cover POS, Kitchen, Credits and role/permission changes (backend). **L**

## 4. Bugs found during the audit

| Where | Problem | Effort |
|---|---|---|
| Suppliers | Issues column always "Clear" (built from the open supplier's issues only) | S |
| Suppliers | Total spend "N/A" while rows show amounts (different data source) | S |
| Customers | "Score" always "N/A" (score function hard-coded) | S |
| Settings | One malformed response crashes the whole page (no guard or error boundary). Seen with the mock API; the real API probably returns the full shape. | S |
| Analytics | Customer acquisition chart puts bars and a line inside an area chart; they may not draw | S |
| Kitchen | Markups shown as "%" but are multipliers; recipes ignore configured targets | S |
| Sales, Credits, Engagement | Footers say "No sales/customers to show" and KPIs show 0 while data is still loading | S |
| Sales | Sale edit can overwrite "amount paid" directly, bypassing the credit repayment ledger | M |

## 5. Suggested order of work

1. **Phase 0: bugs and quick wins (about 1 day).** The bug table above, plus: Inventory tabs owning their page, Customers preamble and Score removal, Credits default sort, Kitchen labels, Engagement headings, Analytics default period and duplicate banner.
2. **Phase 1: the kit and the shell (2 to 3 days).** `PageHeader`, `SectionTabs`, `FilterBar` with `LocationSelect` and `PeriodSelect`, `KpiStrip`, `DataTable`, `EntityDrawer`, `FormSheet`, `StatusBadge`, `EmptyState`, `ErrorBoundary`, shared formatters; grouped navigation, hub context, user menu and mobile top bar.
3. **Phase 2: the daily-work modules on the kit (4 to 6 days).** Sales (including the Record sale sheet), Credits, Customers, Inventory. These are where staff spend their day.
4. **Phase 3: the review modules (3 to 4 days).** Dashboard, Analytics, Insights, Engagement.
5. **Phase 4: the admin modules (3 to 4 days).** Suppliers, Kitchen, POS, Settings, Audit trail.
6. **Phase 5: bigger bets.** Command palette, roles matrix, multi-item sales, unified interactions queue, churn outcomes, audit coverage: the items that need backend work.

Each phase ends with the same checks as the restyle: type-check, lint with no new errors, an accessibility scan of every page at phone and desktop width in light and dark, and a click-through of the main tasks.

## 6. Decisions needed

1. **Insights**: fold into Analytics as an "Explore" tab, or restore it to the menu?
2. **Inventory analytics** (meals served, best sellers, price volatility): move to Analytics?
3. **Hub context**: should choosing a location in the sidebar change the default on every page, or only on pages without their own filter?
4. **Comparisons** ("vs previous period"): can the API return prior-period figures for the dashboard and module KPIs, or should the app fetch the previous period separately?
5. **Multi-item sales**: the data model already has `items[]`; does the backend accept several items on create?
6. **Churn outcomes and contact logs**: is there an endpoint to store "contacted / snoozed", or should that be added?
