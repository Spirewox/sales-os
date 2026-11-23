# Restoration ledger: Kitchen, POS, Settings and Audit

Compared against the old UI at commit `03f1417`. Status is one of: Kept, Moved to X, Restored at Y, Left out (reason).

Totals: 117 rows. Kept 81, Moved 22, Restored 11, Left out 0, plus 3 notes (2 new additions, 1 field that never existed).

## Kitchen

| Item | Old location | Status |
| --- | --- | --- |
| KPI: Waiting to accept | Board, KPI row | Restored at Kitchen > Board, "Jobs by stage" strip (`board.tsx`) |
| KPI: In progress (accepted + cooking) | Board, KPI row | Restored at Kitchen > Board, "Jobs by stage" strip, with an accepted/cooking split in the detail line |
| KPI: Ready | Board, KPI row | Restored at Kitchen > Board, "Jobs by stage" strip |
| KPI: Due soon (with "n overdue" hint) | Board, KPI row | Kept, split into two cells (Overdue, Due soon) on the "Board status" strip; both now filter the columns |
| KPI: Completed today | Board, KPI row | Kept as "Done today" on the "Board status" strip, links to Jobs filtered to today's completed |
| Kitchen display button | Page header (Board tab) | Moved to Kitchen > Board, top right of the board |
| Board columns with per-stage counts, job cards (code, due, customer, dishes, total, payment, delivery, taken by, waiting minutes, advance button) | Board | Kept |
| Phone stage switcher | Board | Kept |
| Display mode (waiting / overdue / due soon counts, last updated, chime toggle, exit) | Board, display mode | Kept |
| Refresh note | Board | Kept |
| Outlet (hub) selector | Section nav row | Moved to Board and Jobs filter rows (app-wide location) |
| KPI: Jobs count | Jobs, KPI row | Moved to Jobs > "Job value" cell detail line ("n jobs, average X") |
| KPI: Average job (hint) | Jobs, KPI row | Moved to Jobs > "Job value" cell detail line |
| KPI: Job value, Collected, Owed | Jobs, KPI row | Kept |
| KPI: Profit (on n costed jobs) | Jobs, KPI row (cost permission) | Kept |
| Jobs filters: search, period, stage | Jobs filter card | Kept (period and stage now in the URL) |
| Export CSV (all columns incl. cost, profit, margin) | Jobs filter card | Moved to Jobs > `⋯` menu; same columns |
| Jobs table columns: Job + date, Customer + phone, Stage, Due, Service + count, Channel, Total, Payment, Profit + margin | Jobs table | Kept (Service and Channel hide below xl, Profit below lg) |
| Pagination with totals | Jobs table footer | Kept |
| Job drawer header: customer, stage, payment, code, service, count, outlet, due | Job panel | Kept (due is now a stat) |
| Job actions: advance, confirm, send quote, edit, client quote, duplicate, declined, cancel (with reason), archive | Job panel header | Kept; advance/confirm is the primary button, the rest are in the `⋯` menu |
| Overview: customer & service rows (customer, phone, channel, fulfilment, address, due, taken by, quote expires, cancel reason, sales/credits links, kitchen notes) | Job panel > Overview | Kept in Summary tab; phone now offers WhatsApp instead of a call link (customers are contacted by WhatsApp only) |
| Bill table with Total | Job panel > Overview | Kept |
| Bill footer: Paid, Balance | Job panel > Overview | Moved to the drawer stats (Total, Paid, Balance), visible on every tab |
| Customer history (past jobs, purchases, spend in Sales) | Job panel > Overview | Kept |
| Costing warnings with "Price ingredients" fix | Job panel > Costing | Kept, shown above every tab |
| Costing cards: Cost, Price, Profit + margin, Food cost % | Job panel > Costing | Kept |
| Cost breakdown and pricing note | Job panel > Costing | Kept |
| Pricing options table | Job panel > Costing | Kept |
| Shopping list (needed, packs, cost used, cost to buy) | Job panel > Costing | Moved to its own "Shopping list" drawer tab, with a total to buy |
| Payments summary cards (Total, Paid, Balance) | Job panel > Payments | Moved to the drawer stats (same numbers, always visible) |
| Record a payment form, payment records | Job panel > Payments | Kept |
| Timeline with notes and recost before/after | Job panel > Timeline | Kept |
| Job form (wizard): every field (customer search, name, phone, channel, outlet, fulfilment, address, due, notes, service, count, job name, dishes/menu, packaging and costs, labour, running costs, kitchen days, pricing method, markup override, test price) | Job form steps | Kept; the steps are now sections of one form, no field lost (field ids identical) |
| "Name on the bill" (Review step) | Job form, Review | Kept as "Job name (shown on the bill)" (same `title` field; the review step had a second input for it) |
| Bill preview and customer/phone/channel/due summary | Job form, Review | Kept |
| Price ticket: Price, price per unit, Cost, Profit, Margin | Job form side panel | Kept in the sticky footer line |
| Price ticket: Food cost % | Job form side panel | Restored at Job form footer line (`job-form-sections.tsx`, TicketLine) |
| Price ticket: warnings | Job form side panel | Kept (warning list in the form) |
| Save draft / Save as quote / Confirm order / Save and confirm | Job form footer | Kept |
| Recipes table: name, unpriced flag, category, yield, cost per portion, price at target food cost, price at markup | Recipes | Kept |
| Recipe editor: name, category, yield, unit, ingredients with unit cost and cost, batch cost, food cost per portion, notes, archive | Recipe panel | Kept |
| Ingredients: search, price filter, bulk "Update prices", columns (ingredient, pack, pack price, unit cost, price date, source) | Ingredients | Kept |
| Ingredient editor incl. retail price and price history | Ingredient panel | Kept |
| Kitchen settings: defaults, due/ack thresholds, running costs, staff roles, per-portion carry, alert rules and recipients, import | Settings tab | Kept (styling only) |
| Yield guide calculator | Yield guide tab | Kept |
| Client quote page | /kitchen-quote/[id] | Kept |
| Export job status page | /jobs/[id] | Kept |

## POS

| Item | Old location | Status |
| --- | --- | --- |
| KPI: Registered tills | Overview | Moved to Overview > "Tills" cell (links to Tills tab) |
| KPI: Passkeys created | Overview | Moved to Overview > "Tills" cell detail line ("n with a passkey") |
| KPI: Net POS sales (refunds, voids excluded) | Overview | Kept, now with change vs previous period |
| KPI: Transactions | Overview | Kept, now with change vs previous period, links to Transactions |
| Average sale | (new) | Added on Overview strip |
| Location / From / To filters | Overview filter card | Moved to the shared filter row: app-wide location plus period picker with custom range |
| Refresh | Overview header | Moved to page `⋯` menu |
| Live tills panel (till, connection, last seen, shift, activity, payment) and recent till activity | Overview | Kept |
| Locations and tills table (location + type, tills, passkeys, net sales, transactions, View tills) | Overview | Kept (sortable; search and paging now in the table) |
| Recorded payment types (method, transactions, net sales) | Overview | Kept as "Payment mix" with share of sales |
| Date/timezone note | Overview | Kept |
| Operations filters: location, search, from/to | Transactions, Shifts, Reviews | Kept (shared filter row; Tills has no period, as before) |
| Operations filters: Till ID, Cashier ID (free text) | Transactions, Shifts | Moved to More filters as Till and Cashier pickers (same `device_id` / `cashier_id` params) |
| Operations filters: Status (awaiting, completed, cancelled, review / open, closed) | Transactions, Shifts | Kept |
| Operations filter: Transaction type (sale, repayment, refund, void) | Transactions | Moved to More filters > Type |
| Apply filters button | Operations form | Left in place as live filtering (no option lost) |
| Row: reference, location, status, amount / variance | Operations table | Kept on every tab |
| Row details: cashier, till, date, closed time | Operations row details | Kept as columns (Transactions, Shifts) and in the transaction drawer |
| Row details: receipt lines, payment method and checkout reference, review reason | Operations row details | Moved to the Transaction drawer (Receipt and Payment sections) |
| Row details: "Open checkout and receipt details" link | Payment review rows | Kept as "Open transaction" row action |
| Row details: provider transaction reference (`evidence.transactionReference`) | Payment review row details | Restored at POS > Payment review, "Provider reference" column (xl and up) |
| Row details: cashier and till on review rows | Payment review row details | Restored at POS > Payment review, "Cashier" column and Terminal falls back to the till id |
| Next / previous page | Operations | Kept (cursor pages in the table) |
| Till details: label, device id, passkey, last seen, revoke | Till registration panel | Moved to POS > Tills table (status, last activity, connection, revoke in row menu) |
| New registration code (shown once, expiry) | Till registration panel | Moved to "Register till" sheet (header button on Tills) |
| Manual payment confirmation per location | Till registration panel (company admin) | Moved to Settings > Locations > location drawer > POS payments (Tills tab links there) |

## Settings

| Item | Old location | Status |
| --- | --- | --- |
| Profile: name, email (read only), phone, hub (read only), role badge | Profile tab | Kept |
| Change password with strength meter | Profile tab | Moved to Settings > Password section |
| Users list: avatar, name, role, email, username, location | Users tab | Kept as a table (plus status, joined date, filters) |
| User actions: regenerate till PIN, edit, delete | Users tab | Kept (Edit button, rest in row menu; activate/deactivate added) |
| "Last active" | (not in old UI or data) | Not applicable: the data has no last-active field |
| User form: name, email, username, phone, role, hub, POS PIN note, role permissions preview | User modal | Kept in the user sheet |
| Locations count label | Hubs tab | Kept in the section description |
| Type filter (all / hubs / RSPs) | Hubs tab | Kept (plus search) |
| Locations columns: name + address, code + ownership, type, parent hub, manager, children, status | Hubs table | Kept (children shown as "RSPs") |
| Location actions: edit, activate/deactivate, upgrade, downgrade, delete when nobody is assigned | Hubs table | Kept (row menu and drawer) |
| Location form: type, parent hub, ownership, code, name, address, phone, manager, active | Hub modal | Kept |
| Downgrade: child RSP disposition, manager keep/reassign, ownership, parent hub | Downgrade modal | Kept |
| Role list with "n/total" counts and Custom tag | Roles tab pills | Kept as matrix column headers ("n of total", Custom, Edited) |
| Company admin is always full access note | Roles tab | Kept (section description and "Full access" header) |
| Add role (name, description), delete custom role, reset all | Roles tab | Kept (reset in `⋯` menu, delete in the role column menu) |
| Permission groups with selected/total and select-all | Roles tab | Kept |
| Single permissions with label | Roles tab | Kept |
| Permission key (e.g. `sales.view`) next to each permission | Roles tab | Restored at Settings > Roles and access, under each permission label (`roles-matrix.tsx`) |
| Unsaved changes bar (discard / save) | Roles tab | Kept (now saves several edited roles at once) |
| Appearance: theme system / light / dark | Preferences tab | Moved to Settings > Appearance |
| Alerts: pop-ups, email, per-device, which alerts, urgent alerts | Alerts tab | Kept |
| Confirm dialogs for delete user / hub / role, reset roles | Confirm modal | Kept |

## Audit

| Item | Old location | Status |
| --- | --- | --- |
| Tab counts: All logs (n), Sales (n), Inventory (n), Customers (n), Bulk uploads (n) | Tab buttons | Restored at Audit > section tabs (all five counts from the summary the list already returns; Bulk was the only one left) |
| Search | Filter card | Kept |
| Entity filter (Inventory, Sale, Customer, System) | Filter card | Moved to More filters > Record type |
| Module filter (Sales, Inventory, Customers, System) | Filter card | Restored at Audit > More filters > Module (All activity tab; the other tabs pick their own module, as the old tabs overrode it) |
| Agent filter | Filter card | Moved to More filters > User |
| Date range and presets (today, 7, 30 days, all) | Filter card | Kept as the period picker with custom range |
| "Showing a to b of n entries" | Above table | Kept as the result count and table pagination footer |
| Activity columns: time, agent + location, entity, action, details summary | Activity table | Kept (location is its own column; record links to the record's page) |
| Bulk columns: time, user, domain, type, file, status | Bulk table | Kept |
| Bulk rows: total, valid, invalid | Bulk table | Restored at Audit > Bulk uploads, Rows column ("n total", "n valid, n invalid"); valid was missing |
| Bulk processed: processed, imported, failed | Bulk table | Restored at Audit > Bulk uploads, Processed column; processed was missing |
| "View rows" | Bulk table | Kept as row click (opens the drawer on the Rows tab set) |
| Drawer: time, agent, location, entity, entity id, action | Log modal | Kept (title, subtitle and Record line / stats) |
| Drawer: structured detail rows (cost / price changes) | Log modal | Kept as a before/after table plus notes |
| Drawer bulk: domain, type, file, stage | Log modal | Kept (file is the drawer title, the rest are stats) |
| Drawer bulk: uploaded/validated rows JSON, results JSON | Log modal | Kept as the Rows and Results drawer tabs |
| Export | (new) | Added: export this page as CSV in `⋯` |
