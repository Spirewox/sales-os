# FudFarmer CRM — Insight Explorer & Suppliers (Reference Implementation)

> Everything in this branch, why it exists, how it's wired, and how to extend it.

---

## ⚠️ READ THIS FIRST — what this branch is

This is a **reference / prototype implementation, not a drop-in merge.** It was built on a **client-only architecture** (all data in `localStorage` via `StorageService`, whole datasets pulled into memory and computed in the browser).

The production `Update-v2` on GitHub is a **different architecture**: an **API-backed app** (`lib/api.ts`, `HAS_API`) whose hooks return **server-paginated slices** (`useCustomers` → `{ items, page }`), with **no `StorageService`** and **no Suppliers backend**. The two histories are unrelated.

**So do not merge this branch as-is — it will not build against the production app.** Use it to read the code, the UX, and the analytics/NL/simulation logic, then **port each feature onto the API data layer.** Section 11 is the porting checklist. Everything below documents the prototype so you can port it accurately.

---

## 0. Ground rules (read first)

- **Frontend-only update.** No backend was added. Every new feature runs entirely in the browser. All "data" is seeded and persisted in **`localStorage`** via `StorageService` and read through **React Query** hooks (`hooks/use-queries.ts`). If you add server persistence later, the read/write seams are the `StorageService` methods and the `useSave*` hooks — swap those, not the components.
- **This is Next.js 16.2.3 (App Router, Turbopack).** Per `AGENTS.md`, some APIs differ from older Next. When in doubt, check `node_modules/next/dist/docs/` rather than assuming. New pages were built by mirroring the existing working pages under `app/(app)/`.
- **Stack:** React 19, TypeScript (strict), Tailwind CSS v4, Recharts, lucide-react, next-themes, sonner (toasts).
- **Dev server runs on port `3456`** (`.claude/launch.json` / `npm run dev`).
- **Typecheck:** `npx tsc --noEmit`. A transient `.next/dev/types … not a module` error is a generated-file artifact — ignore it (`npx tsc --noEmit 2>&1 | grep -v "^\.next/"`).

### ⚠️ The one gotcha that will bite you: `SEED_VERSION`
`lib/storage-service.ts` has `const SEED_VERSION = '10'`. On load, if the stored version differs, **localStorage is wiped and reseeded**. So:
- If you change seed data, **bump `SEED_VERSION`** or your changes won't show for existing users.
- Bumping it **destroys any data the user entered**. That's fine for this demo/seed app, but know it before you touch it.

---

## 1. What's new at a glance

| Area | New | Files |
|---|---|---|
| **Suppliers module** | Full dedicated page: vendors, order history, per-supplier retail analytics, issues/complaints | `app/(app)/suppliers/page.tsx` |
| **Insight Explorer** | New page with 4 modes: **Ask**, **Explore**, **Simulate**, **Compare** | `app/(app)/insights/page.tsx` |
| **Auto customer segmentation** | Derived B2B/B2C segments from the profile | `lib/segmentation.ts` |
| **Semantic layer** | Entity/metric model + entity comparison | `lib/insights.ts` |
| **Multi-dataset query + record finder** | 7 datasets, filters, group-by, "find real records" | `lib/explore.ts` |
| **Natural-language interpreter** | Plain-English → query (aggregate **or** find real orders) | `lib/ask.ts` |
| **What-if simulator** | 6 decision scenarios, NL-driven, live levers | `lib/simulate.ts` |
| **Per-card AI insight** | ✨ button on every analytics/insight card | `lib/cardInsight.ts`, `components/insight-button.tsx` |
| **Decision-signal engine** | Prioritised "what to do" signals — **currently UNUSED**, kept for reference | `lib/decisions.ts` |

All "AI" here is a **deterministic, local NL/analytics engine — no external LLM, no API keys.** This was a product decision (chosen over an LLM integration). The structured semantic layer *is* the intelligence. If you later add an LLM, layer it on top of these same functions.

---

## 2. Data model changes (`types.ts`)

New interfaces/enums/constants (all additive — nothing removed):

- `enum SupplierBusinessType`, `enum SupplierIssueType`
- `interface Supplier`, `interface SupplierIssue`
- `interface SaleItem` — a single line in a multi-product sale
- Customer segmentation vocab (used to drive `deriveSegments`):
  - `B2B_CATEGORIES` (Roadside/Food Vendors, Hospitality, Schools, Religious Bodies, NGOs & Associations, Retailers, Education Institutions, Event Planners…)
  - `FAMILY_TYPES`, `MARITAL_STATUSES`, `AGE_GROUPS`, `LIFESTYLE_TAGS`, `EMPLOYMENT_STATUSES`, `RELIGIONS`
- **Extended `Customer`** with optional profile fields: `businessCategory`, `familyType`, `maritalStatus`, `ageGroup`, `lifestyle`, `employmentStatus`, `jobType`, `religion`.
- **Extended `InventoryItem` / `StockLog`** with optional `supplierId`.
- **Extended `Sale`** with optional `items?: SaleItem[]` (multi-line sales).
- `AuditLog.entityType` now includes `'Supplier'`.

All new profile fields are **optional** so existing records stay valid.

---

## 3. The core join model (understand this before analytics work)

Free-text `sale.productDetails` is **not** a reliable per-item link. The reliable fact table is the **SALE stock log**:

```
StockLog where type === SALE
  .itemId       → InventoryItem   (the product)
  .referenceId  → Sale.id → Sale.customerId → Customer
  .quantity / .unitPrice / .unitCost  → revenue, units, profit
```

Every new per-item / per-customer / per-supplier retail analytic is built on this join. **Sale line-items** (`Sale.items[]`) feed the same tables for multi-product sales. When a sale has `items[]` but no SALE logs, `explore.ts` falls back to the line-items (see `build()` in the `sales` dataset).

### Date anchoring
Seed data ends ~April 2026 but the app's "today" can be later. **Do not anchor timeframes to `new Date()`** for analytics — anchor to the latest activity date. See `latestActivity(bundle)` in `lib/explore.ts` and the timeframe logic in `analytics/page.tsx`.

---

## 4. New libraries (`lib/`)

### `lib/segmentation.ts` — auto customer segments (single source of truth)
- `deriveSegments(customer): string[]` — derives an exhaustive set of segment tags from a customer's profile + value/behaviour (e.g. `B2B Account`, `Hospitality`, `Large Household`, `Health-Focused`, `VIP / Key Account`, `Loyal`, `First-Time Buyer`…).
- `SEGMENT_TAXONOMY`, `ALL_SEGMENTS`, `SEGMENT_GROUP_OF` — the catalogue + reverse lookup.
- **Used everywhere** (customers page, analytics, interactions, explore, simulate). If you change segment logic, change it **here only** — do not re-derive segments inline anywhere else.

### `lib/insights.ts` — semantic layer
- `EntityKind` = `customer | supplier | product | category | segment | hub | agent`.
- `DataBundle` — the single object passed to every engine `{ customers, sales, suppliers, supplierIssues, stockLogs, inventory, credits, agents }`.
- `listEntities(kind, bundle)`, `resolveMetrics(...)`, `entityLabel(...)`, `compare(kind, aId, bId, bundle)` — powers the **Compare** mode (two vendors/customers/products head-to-head with per-metric winners).

### `lib/explore.ts` — multi-dataset query + record finder
- **7 datasets** (`DATASETS`): `sales`, `customers`, `inventory`, `suppliers`, `movements`, `credits`, `issues`. Each declares `fields` (dimensions; some `multi`/`time`), `measures`, and a `build(bundle): Row[]`.
- `Row = { dims, multi, sums, ids, date?, record? }`. `record` is the per-row descriptor used by **find mode** (title/subtitle/amount/date/link/tags).
- `runQuery(ds, rows, filters, groupBy, measureKey)` → aggregated buckets (**Explore/aggregate Ask**).
- `findRecords(ds, rows, { filters, numFilters, dateRange, sort, dir, limit })` → the **actual matching records** (with sales line-item→order rollup). Powers **find mode**.
- `fieldValues`, `Filter`, `NumFilter`, `DateRange`, `latestActivity`.

### `lib/ask.ts` — natural-language interpreter
`ask(question, bundle): AskResult`. Two branches:
- **Aggregate mode** (default) — picks dataset, measure, breakdown, filters → narrated chart. e.g. *"Revenue by customer segment"*, *"What do Sunday customers buy?"*
- **Find mode** — returns real records. Triggered by find verbs (find/show/list/which…), amount thresholds, or superlatives. e.g. *"Show orders over ₦50k"*, *"Biggest orders this quarter"*.
- Understands: **amount thresholds** (`over ₦50k`, `between 20k and 100k`), **date ranges** (`last week`, `last month`, `in March`, `Q1`, anchored to latest activity), **fuzzy names** ("Mama Kudi" → "Mama Kudi's Kitchen"), and **comparisons** (`X vs Y`).
- `ASK_EXAMPLES` — the suggestion chips.

### `lib/simulate.ts` — what-if scenario engine
`runSimulation(scenario, levers, bundle): SimOutput` and `interpretScenario(question, bundle)`.
- **6 scenarios** (`SIM_SCENARIOS`): `price`, `demand`, `cost`, `collect`, `churn`, `promo`.
- Each computes a **monthly baseline from real transactions** (`baselineFor`) then projects outcomes via adjustable **levers** (price %, elasticity, volume %, cost %, pass-through %, collect %, discount %, uplift %, churn count/segment).
- Returns `headline`, `metrics[]` (baseline→projected with better-direction), a baseline-vs-projected `chart`, a plain-English `narrative`, a color-coded `verdict` (positive/caution/negative/neutral), and `assumptions[]`.
- `SIM_EXAMPLES` — the suggestion chips.

### `lib/cardInsight.ts` — per-card insight generator
`generateCardInsight(title, series, { kind, time }): { title, bullets }`. Given a card's own data series, produces headline + trend/concentration + spread + a recommendation. Feeds the ✨ button.

### `lib/decisions.ts` — decision-signal engine (⚠️ currently UNUSED)
Full engine (`generateSignals`, `businessHealth`, `simulate`) built for an earlier "founder command-center" concept that was **dropped** in favour of the flexible self-serve Explorer. **Not imported anywhere.** Kept because its helpers (per-item velocity, cheapest-cost-by-item, reorder/dead-stock/win-back logic) are reusable — e.g. if you build an alerts/notifications feature, start here. Delete it if you're sure you won't.

---

## 5. New components

### `components/insight-button.tsx`
`<InsightButton title series kind time />` — the small ✨ sparkle button that toggles a popover rendering `generateCardInsight`. Dropped into every analytics/insight card header. `kind` = `'money' | 'number' | 'percent'`; set `time` for time-series cards so it narrates trend instead of concentration. **It reads the card's current toggle state** (pass the series the card is currently showing), so insights recompute when the user flips Value/Count, Weekly/Monthly, etc.

---

## 6. New pages

### `app/(app)/suppliers/page.tsx`
Dedicated Suppliers module: supplier list, profile (name, location, business type, products supplied), **Order History as a drill-down table** (per-order detail), **per-supplier retail analytics** (units sold, sales frequency, retail profit generated from their products), and **issues/complaints** log with severity/status. Deep-linkable via `/suppliers?open=<id>`.

### `app/(app)/insights/page.tsx` — Insight Explorer
Four modes (top-right toggle):
1. **Ask** — NL box (`ask.ts`). Renders either a narrated chart (aggregate) or a **clickable records list** (find mode) that deep-links into the real record. "Refine" hands an aggregate query off to Explore.
2. **Explore** — manual query builder: pick dataset → measure → breakdown → filters → chart style. Mix/match across all 7 datasets.
3. **Simulate** — the what-if simulator (`simulate.ts`): NL box + scenario chips + live levers + projected outcome + AI recommendation.
4. **Compare** — two entities head-to-head (`insights.compare`).
Shared `ResultChart` renders column/bar/line/pie/table.

---

## 7. Changes to existing files

- **`lib/storage-service.ts`** — new seed data (suppliers, supplier issues, backfilled `supplierId` on purchase logs, SALE logs for retail analytics, a multi-item seed sale, enriched customer profiles). `SEED_VERSION = '10'`.
- **`hooks/use-queries.ts`** — `useSuppliers`, `useSaveSuppliers`, `useSupplierIssues`, `useSaveSupplierIssues`.
- **`lib/permissions.ts`** — `suppliers.{view,create,edit,deactivate,log_issue,resolve_issue}` + permission group + role defaults. Gate supplier UI with `usePermissions().can('suppliers.*')`.
- **`components/layout/sidebar.tsx`** — Suppliers nav (Truck icon + open-issues badge) and Insights nav (Sparkles icon, gated on `analytics.view`).
- **`app/(app)/analytics/page.tsx`** — tabbed (sales/products/customers/credit/procurement); per-card **sort/filter controls**; **daily drill-down**; ~24 new analytics cards from the new data; ✨ **AI insight button on every card**; an "Ask AI" bar that routes to `/insights?ask=…`.
- **`app/(app)/customers/page.tsx`** — profile fields, auto-segments, detailed purchases table + purchase pattern + decision analytics. Deep-link `/customers?open=<id>`.
- **`app/(app)/inventory/page.tsx`** — per-product drill-down reflecting supplier/customer changes; click a top buyer → opens their customer profile.
- **`app/(app)/sales/page.tsx`** — **multi-product cart** (several products in one sale); per-sale itemised drill-down; **`?open=<id>` deep-link reader** (so found orders open their detail).
- **`app/(app)/page.tsx`** (dashboard) — per-card sort/filter controls, daily drill-down.
- **`app/(app)/interactions/page.tsx`** — uses `deriveSegments` for consistency.

---

## 8. Conventions you must follow

- **Deep-linking:** pages read `?open=<id>` via a `useEffect` + `URLSearchParams(window.location.search)` + a `useRef` guard (avoids Suspense/`useSearchParams` issues). Copy the pattern in `sales/page.tsx` when adding it elsewhere. Currently supported on **customers, suppliers, sales**. Inventory/credits do **not** yet read `?open=` — add it the same way if you need it.
- **One `DataBundle`, passed down.** Don't refetch inside engines; pass the bundle.
- **Segments only via `deriveSegments`.** Never inline segment logic.
- **Naira formatting:** use the `money`/`fmt` helpers (M/k compaction) already in each file — keep formatting consistent.
- **No dynamic Tailwind class strings** (e.g. `` `text-${x}` ``) — they get purged. Use literal conditional classes.

---

## 9. Extension recipes

**Add a new Explore/Ask dataset:** add an entry to `DATASETS` in `explore.ts` (`fields`, `measures`, `build`). It automatically appears in Explore, and Ask/find mode can route to it (add keyword hints in `ask.ts` `DS_HINTS` if you want NL routing). Add per-row `record` metadata to make it findable in find mode.

**Add a metric:** add a `MeasureDef` to a dataset's `measures` (helpers: `mSum`, `mCount`, `mDistinct`, `mAvg`, `mRatioDistinct`).

**Add a simulation scenario:** add a `ScenarioDef` to `SIM_SCENARIOS` (with its `LeverDef[]`), a `sim<Name>()` projection function, wire it into the `runSimulation` switch, and add detection keywords in `detectScenario` (`simulate.ts`). The UI renders levers generically from `LeverDef`, so no component changes are usually needed.

**Add a segment rule:** edit `deriveSegments` + `SEGMENT_TAXONOMY` in `segmentation.ts`. It propagates everywhere automatically.

**Change/add seed data:** edit `lib/storage-service.ts` **and bump `SEED_VERSION`**.

---

## 10. Verifying your work
```bash
npm install
npm run dev                 # http://localhost:3456
npx tsc --noEmit 2>&1 | grep -v "^\.next/"   # should be clean
```
Then click through: Suppliers, Analytics (try a card's ✨ and the filters), Insights → Ask (*"Show orders over ₦50k"*), Explore, Simulate (*"What if I raise Beef prices 10%?"*), Compare.

_Dev-server note: hot-reload can occasionally scramble in-memory React state or misroute a navigation. A hard refresh fixes it — it's the dev server, not the code._

---

## 11. Porting onto the production (API-backed) app

The prototype's engines assume they can iterate over **complete** datasets in memory. Production hooks return **paginated, server-filtered** slices. Port in this order:

### 11.1 Data access — the crux
Every engine takes one `DataBundle` = `{ customers, sales, suppliers, supplierIssues, stockLogs, inventory, credits, agents }` (full arrays). On production you must supply those arrays. Options, cheapest first:
1. **Fetch-all hooks** — add `useAllCustomers()`, `useAllSales()`, `useAllStockLogs()`, etc. that page through the existing endpoints (or call an `?all=1` / high `per_page`) and concatenate. Assemble the bundle from these. Fastest path; keeps all analytics client-side. Watch payload size — cache aggressively with React Query.
2. **Server-side aggregation** — push the heavy analytics (Explore `runQuery`, Ask aggregate, Analytics cards) to new API endpoints that return the already-grouped results. More work, scales better. The prototype's `DATASETS`/`measures` are a precise spec of what each endpoint must compute.
3. **Hybrid (recommended)** — fetch-all for the smaller datasets (suppliers, credits, agents, inventory) and server aggregation for the large ones (sales/stock logs). Keep Simulate client-side off a fetched baseline.

Once a real `DataBundle` is available, `lib/{segmentation,insights,explore,ask,simulate,cardInsight}.ts` should work **unchanged** — they're pure functions over the bundle and `types.ts`. That's the whole point of keeping them decoupled.

### 11.2 Suppliers module → needs a backend
No supplier endpoints/tables exist in production. To ship it you need: `suppliers` + `supplier_issues` resources (CRUD), a `supplier_id` FK on products and stock movements, and hooks mirroring the existing pattern (`useSuppliers`, `useCreateSupplier`, `useSupplierIssues`, …). Then port `app/(app)/suppliers/page.tsx`, swapping its `StorageService` writes for those mutations. `types.ts` (`Supplier`, `SupplierIssue`, enums) is ready to reuse.

### 11.3 Segmentation — reconcile with server `useSegments`
Production already has server-side `useSegments`. Decide: keep segments **server-authored** (then `deriveSegments` becomes a client fallback / preview), or adopt the prototype's **derived-from-profile** model (then expose the rules server-side). Don't ship both silently — pick one source of truth. The rule set lives in `lib/segmentation.ts`.

### 11.4 Page edits — re-apply by hand
The prototype modified `analytics/customers/inventory/sales/page.tsx` and the dashboard, but production rewrote those pages. Re-apply the *intent* against their versions:
- **Analytics:** per-card sort/filter, daily drill-down, the ✨ `InsightButton`, the "Ask AI" bar. `InsightButton` + `cardInsight.ts` drop in as-is (pure UI over a series).
- **Sales:** multi-line cart, per-sale drill-down, `?open=<id>` deep-link reader.
- **Customers/Inventory:** profile analytics, per-product drill-down, buyer→profile links.

### 11.5 Insight Explorer page
`app/(app)/insights/page.tsx` is self-contained UI; it only needs the `DataBundle` (11.1) and a route + sidebar entry (gate on the appropriate permission). Everything else is internal.

### Suggested phasing
1. Fetch-all/aggregation for the bundle (11.1) → stand up **Insight Explorer** (Ask/Explore/Simulate/Compare) — highest value, no backend schema changes.
2. Add ✨ insight buttons to the real analytics cards.
3. Backend suppliers resource → port the Suppliers module.
4. Reconcile segmentation.
5. Fold the remaining page-level drill-downs in.
