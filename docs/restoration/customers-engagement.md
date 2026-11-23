# Restoration ledger: Customers and Engagement

Old UI: commit `03f1417` (`app/(app)/customers/page.tsx`, `customer-detail-panel.tsx`, `app/(app)/engagement/churn.tsx`, `interactions.tsx`).
Status key: **Kept** (same place), **Moved to X**, **Restored at Y** (was removed by the redesign, now back), **Left out: reason**.
Calculations are the old ones unless noted.

## Customers list (`/customers`)

| Item | Old location | Status |
|---|---|---|
| KPI: Total customers | KPI card "Total" | Kept: strip 1 "Customers" |
| KPI: YTD created / Active in period | KPI card (label switched with period) | Restored at strip 1, "Created this year" / "Active in period" (`summary.ytdCustomers`) |
| KPI: New this month / New in period, with % vs prior | KPI card | Kept: strip 1. The "% vs prior" line now shows in both modes again (the redesign hid it when a period was chosen) |
| KPI: Retention % | KPI card | Restored at strip 2 "Retention" (`summary.retentionRate`) |
| KPI: B2B count | KPI card | Restored at strip 2 "Business customers" (click filters to Business) |
| KPI: B2C count | KPI card | Restored at strip 2, detail line of "Business customers" ("N individual") |
| KPI: Repeat count | KPI card | Kept: strip 1 "Repeat customers" (% plus the count in the detail line; click filters to 2+ orders) |
| KPI: Revenue | KPI card | Restored at strip 2 "Revenue" (short figure, exact amount in the detail line) |
| KPI: Avg value | KPI card | Restored at strip 2 "Average value" (revenue per customer) |
| Period hint text ("List shows customers who transacted in the selected range...") | Under the period bar | Restored as KPI detail lines: "Bought in this period" / "All time, matching filters", "Transacted in this period" / "Joined since 1 January", "First purchase in this period" / "First purchase this calendar month" |
| Period control | Metrics period bar | Kept: PeriodSelect in the filter bar |
| Search (name, email, company) | Filter row | Kept (also phone) |
| Type filter (B2B/B2C) | Filter row | Kept ("Business"/"Individual") |
| Location filter | Filter row | Kept (LocationSelect) |
| Orders filter (once / exact / at least) | Filter row | Kept: More filters |
| Segments filter (match all, grouped) and "based on period" note | Filter row popover | Kept: More filters |
| Result count, "Updating…" | Filter row | Kept: FilterBar result label |
| Column: Customer + company | Table | Kept (business customers lead with company) |
| Column: Contact, email | Table "Contact" | Restored at "Contact" column, second line (desktop) |
| Column: Contact, phone | Table "Contact" | Kept |
| Column: Type badge | Table "Type" | Restored at "Hub and type" column, second line (lg and up) |
| Column: Location | Table "Type" cell | Kept: "Hub and type" column |
| Column: Segments (first 3, filtered ones first, "+N") | Table "Segments" | Restored at "Segments" column (xl and up), same ordering rule |
| Column: Orders (sortable) | Table | Kept |
| Column: Revenue (sortable) | Table | Kept |
| Column: Repeat / New status | Table "Score" column | Restored at "Orders" column, second line ("Repeat"/"New") |
| Column: Score badge | Table "Score" column | Left out: in the list it was hard-coded to "N/A" for every row (`calculateScore = () => 'N/A'`). The real grade is in the drawer (see below) |
| Pagination, "Showing x to y of z" | Table footer | Kept (plus rows-per-page) |
| Export (current filters) | Header button | Moved to header ⋯ menu |
| Import, template download, import validation and summary | Header buttons, modals | Moved to header ⋯ menu; modal and summary kept |
| Add customer form (all fields, profile, auto segments preview) | Modal | Kept: side sheet |
| Deep link `?open=<id>` | URL | Kept (`?customer=<id>` too) |
| New since redesign | | Last purchase and Outstanding columns, row ⋯ (Record sale, Log feedback) |

## Customer drawer

| Item | Old location | Status |
|---|---|---|
| Name, company, type | Header | Kept (title + subtitle) |
| Edit | Header button | Moved to drawer ⋯ menu (opens the edit sheet) |
| Loyalty tier badge (Gold / Silver / Bronze) | Header badges | Restored at drawer header badges ("Gold tier"), same thresholds |
| Credit score badge (N/A / F / B) | Header badges | Restored at drawer header badges ("Credit grade F" etc.), same rule (from every credit record on file) |
| Repeat / New badge | Header badges | Restored at drawer header badges |
| Tab counts (purchases, interactions) | Tabs | Kept (credit count added) |
| Contact: email, phone, copy buttons | Overview | Kept |
| Location, joined date, added by | Overview | Kept |
| Business / consumer profile fields | Overview | Kept |
| Total orders, total spent | Overview cards | Moved to drawer stats (Orders, Revenue) |
| Avg order value | Overview card | Kept: Overview > Buying pattern "Average order" |
| Last purchase | Overview card | Moved to drawer stats |
| Auto segments | Overview | Kept |
| Spending trend chart | Overview | Kept |
| Edit form (incl. profile and segment preview) | Overview edit mode | Kept: side sheet |
| Recommended action + "View on Engagement list" | Purchases | Kept ("Suggested next step") |
| Lifetime value | Purchases card | Restored at Overview > Buying pattern "Lifetime value" (with order count) |
| Profit amount + margin | Purchases card | Restored at Overview > Buying pattern "Profit" (the redesign kept only the margin) |
| Avg order + order count | Purchases card | Kept / Restored (count is on the Lifetime value row) |
| Frequency ~Nd + orders per month | Purchases card | Kept; orders per month Restored on the "Frequency" row |
| Recency days + activity | Purchases card | Kept: "Activity" row |
| Trend (90d) + % vs prior | Purchases card | Kept: "Trend (90 days)" row (always shows the %) |
| Cadence (Regular / Semi-regular / Sporadic) | Purchase pattern | Restored at Overview > Buying pattern "Cadence" (was only shown when there was no interval) |
| Top channel | Purchase pattern | Kept |
| Cash / credit counts | Purchase pattern | Restored at Overview > Buying pattern "Paid at sale / on credit" (amounts also on Credit tab) |
| Next expected order | Purchase pattern | Kept (shows "-" when unknown) |
| Biggest order (amount, date) | Purchase pattern | Restored at Overview > Buying pattern "Biggest order" |
| Monthly spending chart | Purchases tab | Left out: identical chart (same data, same axis) is on the Overview tab of the same drawer |
| Most bought products (top 5, qty, revenue) | Purchases | Kept |
| All purchases list: date, product, amount, status, credit marker | Purchases table | Kept (paged, 10 a page) |
| Per-sale profit and margin | Expanded purchase row | Restored on each purchase row ("profit ₦X (Y%)") |
| Per-sale agent | Expanded purchase row | Restored on each purchase row |
| Per-sale channel | Expanded purchase row | Kept on each row |
| Per-sale payment, amount paid, delivery, line item, address, notes | Expanded purchase row | Moved to the sale drawer: each row links to `/sales?sale=<id>` |
| Total of all purchases | Table footer | Kept: section header ("N orders, ₦X") |
| Total outstanding, open items count, overdue state | Credit | Kept |
| Credit items: description, due date, amount, status | Credit | Kept (each links to the credit sheet) |
| Credit score | Credit | Restored at Credit > "Credit grade", with what the grade means |
| Payment method breakdown (cash vs credit, totals and counts) | Credit | Kept ("How they pay") |
| Feedback / enquiries / compensations with resolution details | Interactions | Kept |
| Total compensations | Interactions | Kept |
| Call (tel:) button | n/a (added then removed in redesign) | Left out: customers are contacted by WhatsApp only (user request) |

## Engagement > Churn

| Item | Old location | Status |
|---|---|---|
| KPI: Off cadence / At risk / Dormant | KPI cards | Kept (click to filter); plus new "Lifetime value at stake" |
| Summary updated time, "updates pending" | Header | Kept: result label |
| Activity filter (`?activity=` deep link) | Filter row | Kept |
| Loyalty filter | Filter row | Kept: More filters |
| Location filter | Header | Kept |
| Column: Customer + "Last order date · Nd ago" | Table | Kept: Customer, Last purchase, Days since columns |
| Column: Phone | Table | Restored at Customer column, last line (desktop). Phone link is WhatsApp only (row button), no tel: |
| Column: Hub | Table | Moved into Customer column |
| Column: Loyalty + grade badge | Table | Moved into Customer column ("Repeat Buyer, Gold") |
| Column: Activity | Table | Kept ("Risk") |
| Column: Days late + "vs ~Nd cadence" / "Single purchase" | Table | Kept: Days since (late line) and Usual gap |
| Column: Recommended action | Table | Restored at "Suggested action" column (the redesign had moved it to a hover tooltip); on phones it is its own line on each card |
| Open | Row button | Kept: row click (and Open when no phone) |
| Customer drawer + loading / error states | Drawer | Kept |

## Engagement > Interactions

| Item | Old location | Status |
|---|---|---|
| KPI: Total interactions (feedback + enquiries) | KPI card | Restored at second strip "Interaction volume" > "Total interactions" (with the split in the detail line) |
| KPI: Open complaints | KPI card | Kept (click filters) |
| KPI: Open enquiries | KPI card | Kept |
| KPI: Avg resolution days | KPI card | Kept |
| KPI: Satisfaction % | KPI card | Restored at second strip "Satisfaction" (the redesign had moved it into the Sentiment chart header, which is hidden until Insights is opened; that header is unchanged) |
| KPI: Compensation value | KPI card | Kept (pending count in its detail line) |
| Insights toggle: Sentiment pie | Toggle panel | Kept |
| Insights toggle: Complaints by segment bar chart | Toggle panel | Kept |
| Tab counts (open feedback, open enquiries, pending compensations) | Tabs | Kept |
| Feedback filters: search, status, type, priority | Filter row | Kept. Note: status now defaults to "Open" (was "All"); "All statuses" is one click away |
| Feedback columns: date, customer, type, priority, sentiment, content, status, resolution days | Table | Kept (type and sentiment in the Customer column) |
| Feedback actions: view, quick resolve, escalate priority, issue compensation | Row hover icons | Kept: Resolve button + ⋯ |
| Enquiry filters: search, status | Filter row | Kept (status defaults to "Open") |
| Enquiry columns: date, customer + email, subject + message, category, status | Table | Kept (category under the date) |
| Enquiry actions: view, quick close, reply by email | Row | Kept |
| Compensation columns: date, customer, category, reason, value, status, agent | Table | Kept |
| Compensation actions: approve, mark paid | Row | Kept |
| Total compensation value (N records) | Bar under table | Moved to the filter bar result label |
| Forms: record feedback / enquiry / compensation, all fields | Modals | Kept: side sheets |
| Feedback detail and resolve, resolved-in days, resolved by | Modal | Kept: drawer |
| Enquiry detail and close, managed by | Modal | Kept: drawer |

## Counts

- Kept (incl. kept in a new place on the same screen): 71
- Moved: 9
- Restored: 26
- Left out: 3 (list "Score" column, always N/A; duplicate monthly spending chart in the drawer; Call buttons, WhatsApp only)

## Notes for follow-up

- Backend / mock data: churn `recommendedAction` text in the mock data says "Call to check in". The team now contacts customers by WhatsApp only, so the suggestion text should change at the source (API and `lib/mock-api`), not in the UI.
- "Retention" has no definition in the API contract (mock returns a fixed 68). It is shown as the server sends it; the API should document what it measures.
