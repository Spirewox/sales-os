# Data Export Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every list a person works from in Sales OS can be downloaded as a CSV of what it currently shows: the filters, search, period and location applied.

**Architecture:** One pure module, `lib/export.ts`, turns rows and column definitions into a CSV. It pages through a list endpoint up to a row cap. A hook, `hooks/use-export.ts`, wraps it with pending state, toasts and an `OverflowMenu` item. Each module has its columns in `lib/exports/<module>.ts`, so they run under `npm test`, and adds one menu item to its page's `⋯`. The exports run in the browser from the JSON list endpoints that already exist, so no backend change is needed. Customers, Sales, Kitchen jobs and Stock already export and keep their current paths.

**Tech Stack:** Next.js 16.2.3, React 19, TanStack Query, `node --test`, the `@/components/app` kit.

**Spec:** The user's request "data exporting in modules where it's necessary" plus [the shared notes](2026-11-26-README.md).

## Global Constraints

- **Format:**
  - The file is a CSV in UTF-8 with a BOM (`﻿`), so Excel reads ₦. Cells are always quoted, with `"` doubled, and lines end in `\r\n`. This matches `lib/csv.ts` today.
  - The filename is `fudfarmer-<module>-<YYYY-MM-DD>.csv`, dated in Lagos time (`APP_TIMEZONE`, `lib/format.ts`).
  - Money is a plain number with no ₦ sign or thousands separator, so spreadsheets can add it up. Dates are `YYYY-MM-DD`, or `YYYY-MM-DD HH:mm` in Lagos time.
- **Limits:**
  - Row cap: `EXPORT_ROW_CAP = 10_000`. At the cap, the toast reads `Exported the first 10,000 rows. Narrow the filters to get the rest.`
  - Page size for fetching: 200.
- **Menu labels:**
  - The label is `Export <plural noun>`, for example `Export suppliers`. While running it reads `Exporting…` and is disabled.
  - The success toast is `Exported <n> <plural noun>.`
  - With no rows, the item is disabled.
- **Who can export:** gated by the module's existing view permission, as `customers.view` gates Customers export today.
- **Existing exports:** leave the Customers, Sales, Kitchen jobs and Stock exports and their labels as they are. Audit keeps `Export this page (CSV)` and gains a second item.

## Review Focus

1. **Filtered lists:** exporting while a filter or search is set gives only the matching rows. Each module task's fetcher passes the page's current params, and a test asserts it.
2. **Text that breaks CSV:** names with commas, quotes, line breaks or a leading `=` stay one cell and don't run as a formula. `buildCsv` prefixes `'` to cells starting with `=`, `+`, `-` or `@`, but not to negative numbers.
3. **Midnight in Lagos:** an export at 23:30 UTC is dated the next day. `exportFilename` is tested with `2026-11-25T23:30:00Z` → `2026-11-26`.
4. **Very long lists:** more than 10,000 matching rows stop fetching at the cap and say so. Tested in `exportRows`.
5. **Pressing twice:** a second press while running does nothing. The item is disabled while pending, and `run` returns early while pending.

---

### Task 1: The export core

**Files:**
- Create: `lib/export.ts`
- Test: `lib/export.test.ts`
- Modify: `lib/csv.ts` (`downloadCsv` keeps its signature and builds its text with `buildCsv`)
- Modify: `app/(app)/inventory/inventory-utils.ts` (its own `downloadCsv` becomes a re-export of `lib/csv.ts`)

**Interfaces:**
- Produces:
  - `type ExportCell = string | number | null | undefined`
  - `type ExportColumn<T> = { header: string; value: (row: T) => ExportCell }`
  - `const EXPORT_ROW_CAP = 10_000`
  - `buildCsv<T>(columns: ExportColumn<T>[], rows: T[]): string`: includes the BOM.
  - `exportFilename(module: string, now?: Date): string`
  - `csvDate(value: string | Date | null | undefined, withTime?: boolean): string`: Lagos time; `''` for empty or invalid input.
  - `fetchExportRows<T>(fetchPage: (page: number, limit: number) => Promise<{ items: T[]; totalPages: number }>, cap?: number): Promise<{ rows: T[]; capped: boolean }>`
  - `saveCsv(filename: string, text: string): void`: browser download, the same as `downloadCsv` today.

- [ ] **Step 1: Write the failing tests** in `lib/export.test.ts`:

```ts
it('quotes every cell and doubles quotes', () => {
  const csv = buildCsv([{ header: 'Name', value: (r: { n: string }) => r.n }], [{ n: 'Ada "Mama" Put, Ltd' }]);
  assert.equal(csv, '﻿"Name"\r\n"Ada ""Mama"" Put, Ltd"');
});
it('neutralises formula cells but not negative numbers', () => {
  const cols = [{ header: 'A', value: (r: { a: ExportCell }) => r.a }];
  assert.equal(buildCsv(cols, [{ a: '=SUM(A1)' }]).split('\r\n')[1], `"'=SUM(A1)"`);
  assert.equal(buildCsv(cols, [{ a: -250 }]).split('\r\n')[1], '"-250"');
});
it('writes null and undefined as empty cells', () => { /* [null, undefined] → '"",""' */ });
it('dates the filename in Lagos', () => {
  assert.equal(exportFilename('suppliers', new Date('2026-11-25T23:30:00Z')), 'fudfarmer-suppliers-2026-11-26.csv');
});
it('csvDate gives Lagos date and time', () => {
  assert.equal(csvDate('2026-11-25T23:30:00Z', true), '2026-11-26 00:30');
  assert.equal(csvDate('not a date'), '');
});
it('stops at the cap and reports it', async () => {
  const calls: number[] = [];
  const page = async (p: number, limit: number) => { calls.push(p); return { items: Array(limit).fill(p), totalPages: 100 }; };
  const { rows, capped } = await fetchExportRows(page, 450);
  assert.equal(rows.length, 450); assert.equal(capped, true); assert.deepEqual(calls, [1, 2, 3]);
});
it('is not capped when the list ends first', async () => { /* 2 pages, second short → capped false */ });
```

- [ ] **Step 2: Run and see them fail.** `npm test`, expected FAIL: `Cannot find module './export'`.
- [ ] **Step 3: Implement `lib/export.ts`.**
  - `fetchExportRows` requests pages of 200 and stops when a page is short, when `totalPages` is reached, or when `rows.length >= cap`, then trims to `cap`.
  - Dates use `Intl.DateTimeFormat('en-CA', { timeZone: APP_TIMEZONE, ... })`.
- [ ] **Step 4: Point `lib/csv.ts` and `inventory-utils.ts` at it.** `downloadCsv(filename, headers, rows)` maps the headers to columns that read by index, then calls `saveCsv(filename, buildCsv(...))`.
- [ ] **Step 5: Run `npm test`.** Expected PASS. Then export stock in the browser and check the file opens with ₦ intact.
- [ ] **Step 6: Commit.** `git commit -m "Add the shared CSV export core"`

### Task 2: The export hook and menu item

**Files:**
- Create: `hooks/use-export.ts`

**Interfaces:**
- Consumes: Task 1.
- Produces:
  - `useExport<T>(opts: { module: string; noun: string; columns: ExportColumn<T>[]; fetchPage: (page: number, limit: number) => Promise<{ items: T[]; totalPages: number }>; disabled?: boolean })`
  - It returns `{ run: () => void; pending: boolean; item: OverflowMenuItem }`. `module` is the filename part (`suppliers`) and `noun` is the plural shown (`suppliers`).
  - `OverflowMenuItem` is the item type `components/app/overflow-menu.tsx` already takes.

- [ ] **Step 1: Implement the hook.**
  - `item` is `{ label: pending ? 'Exporting…' : \`Export ${noun}\`, icon: <Download />, onSelect: run, disabled: pending || disabled }`.
  - `run` returns early while pending. It then calls `fetchExportRows`, `buildCsv` and `saveCsv(exportFilename(module), …)`.
  - It toasts `Exported ${formatCount(n)} ${noun}.`, or the cap message from Global Constraints. On failure it shows the `Error.message` through `toast.error`.
  - The success message comes from a pure `exportToast(n, noun, capped)` in `lib/export.ts`, with a test for 1, 240 and the cap.
- [ ] **Step 2: Add the `exportToast` tests to `lib/export.test.ts` and run `npm test`.** Expected PASS.
- [ ] **Step 3: Commit.** `git commit -m "Add useExport for list pages"`

> **If an "Export data" permission is wanted later:**
> 1. Add `'data.export'` to `ALL_PERMISSIONS`, the Settings group and `PERMISSION_MAP` (`'export_data'`) in `lib/permissions.ts`.
> 2. Pass `disabled: !can('data.export')` from each call site.
> 3. The backend must add the `export_data` key.

### Tasks 3 to 9: One module each

Each module task follows the same shape, so it is written once here. The table below gives the per-module decisions.

**Shape of a module task:**
- **Create `lib/exports/<module>.ts`.** It exports `<MODULE>_EXPORT_COLUMNS: ExportColumn<Row>[]`, where `Row` is the type the page already renders.
- **Create `lib/exports/<module>.test.ts`.** It asserts:
  1. The header list, exactly as in the table.
  2. One fixture row's cells, including a money value as a plain number and a date through `csvDate`.
- **Add `fetch<Module>Page(params)` beside the module's existing hook** in `hooks/use-queries.ts`. It takes the same params object the page's list hook already takes, plus `page` and `limit`, and calls the same endpoint. It returns `{ items, totalPages }` using `readListMeta` from `lib/fetch-all-pages.ts`.
  - Its test lives in `lib/exports/<module>.test.ts`. It stubs `axiosGet` and asserts that the page's search, filter and location params reach the request URL (Review Focus 1).
- **Modify the page.** Call `useExport({ module, noun, columns, fetchPage: (p, l) => fetch<Module>Page({ ...currentParams, page: p, limit: l }), disabled: !rowCount })`. Add `exp.item` to the page's existing `OverflowMenu` items, before any destructive item. If the page has no `⋯`, add an `OverflowMenu` to the `PageHeader` `actions` slot, last.
- **Verify.** Run `npm test` (PASS), then export in mock mode at 1280 px and open the file.
- **Commit.** `git commit -m "Export <noun> as CSV"`

| Task | Module (`module`, `noun`) | Page and list hook | Columns, in order |
|------|---------------------------|--------------------|-------------------|
| 3 | `suppliers`, `suppliers` | `app/(app)/suppliers/page.tsx`, `useSuppliers` | Name, Contact person, Phone, Email, Category, Status (Active/Inactive), Rating, Open issues, Total spend, Last purchase |
| 4 | `credit`, `credit records` | `app/(app)/credits/page.tsx`, `useCreditSummary` | Customer, Type, Location, Total credit, Paid, Outstanding, Overdue, Oldest due date, Days overdue |
| 5 | `enquiries` / `feedback` / `compensations`, the same nouns | the three tables in `app/(app)/engagement/` (`enquiry-table.tsx`, `feedback-table.tsx`, `compensation-table.tsx`), `useEnquiries`, `useFeedback`, `useCompensations` | **Enquiries:** Date, Customer, Channel, Subject, Status, Assigned to, Resolved on. **Feedback:** Date, Customer, Type, Rating, Comment, Status, Resolved on. **Compensations:** Date, Customer, Reason, Amount, Status, Approved by |
| 6 | `stock-movements`, `movements` and `stock-requests`, `requests` | `app/(app)/inventory/movements-tab.tsx`, `useStockLogs`; `requests-tab.tsx`, `useInventoryRequests` | **Movements:** Date, Product, SKU, Type, Quantity, Unit, Unit cost, From, To, Reference, By. **Requests:** Date, Product, Quantity, From location, To location, Status, Requested by, Fulfilled on |
| 7 | `pos-transactions`, `transactions` | `app/(app)/pos/transactions.tsx`, `pos/operations/transactions` (the fetch in `operations.tsx`) | Date and time, Location, Till, Cashier, Items, Payment method, Net amount, Status |
| 8 | `audit-trail`, `audit entries` | `app/(app)/audit/page.tsx`, `useAuditLogs` | Reuse the headers `downloadAuditCsv` writes today (`audit-details.ts`). Add the item **after** `Export this page (CSV)` with the label `Export all matching (CSV)`. |
| 9 | `users`, `users` | `app/(app)/settings/users-section.tsx`, `useAgents` | Name, Email, Username, Phone, Role, Location(s), Status, Joined. Shown only with `settings.manage_users`. |

**Not exported, on purpose:**
- Analytics tabs: Plan 5's reports export them.
- The dashboard: it summarises the same data the reports export.
- Kitchen ingredients and recipes: they are setup data. Add them later if someone asks.

### Task 10: The whole check

- [ ] **Step 1:** Run `node scripts/check.mjs`. Expected exit 0. Fix each finding with `node scripts/check-system.mjs --explain <rule-id>`.
- [ ] **Step 2:** At 390 and 1280 px, in light and dark, open each changed page's `⋯`. The export item sits before the destructive items, and the menu fits on screen at 390.
- [ ] **Step 3:** Commit any fixes. `git commit -m "Tidy export menus"`
