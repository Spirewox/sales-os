# Inventory Archiving Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A product that is no longer stocked can be archived. It leaves the stock list and every product picker, but its sales, movements and analytics history stays, and it can be restored.

**Architecture:**
- **The data:** archiving is a status on the product (`is_active: false` plus `archived_at` and `archived_by`), set by two new endpoints.
- **The rule:** a pure module, `lib/inventory-archive.ts`, decides when archiving is allowed and filters lists by status.
- **The list:** `useInventory` gains a `status` filter. It defaults to `active`, so every picker drops archived products without touching it. The analytics tabs ask for `all`.
- **The screens:** the Stock tab gets a status filter, and the product drawer gets Archive and Restore.

**Tech Stack:** Next.js 16.2.3, React 19, TanStack Query, `node --test`, the `@/components/app` kit (`ConfirmDialog`, `OverflowMenu`, `FilterSelect`, `StatusBadge`, `EntityDrawer`).

**Spec:** The user's request "inventory archiving" plus [the shared notes](2026-11-26-README.md).

## API contract (backend)

| Call | Behaviour |
|------|-----------|
| `PATCH inventory/:id/archive` | Sets `is_active: false`, `archived_at: now` and `archived_by: user`. Writes an audit entry, `Archived product <name>`. Returns `{ data: ApiProduct }`. Returns 409 with a `message` when stock on hand is above 0 or when submitted or approved requests name the product. |
| `PATCH inventory/:id/restore` | Sets `is_active: true` and clears `archived_at` and `archived_by`. Writes an audit entry. Returns `{ data: ApiProduct }`. |
| `GET inventory?status=active\|archived\|all` | Defaults to `active`. Pickers and the sale API reject an archived product id with 409 `This product is archived.` |
| `ApiProduct` | Gains `archived_at?: string` and `archived_by?: { _id: string; full_name: string }`. |
| Permission | `archive_sku`. On by default for Company Admin and Hub Manager. |

## Global Constraints

- **Permission:** `'inventory.archive'` maps to `'archive_sku'`, labelled `Archive & restore products`, in the Inventory group of `lib/permissions.ts`. Add it to the `DEFAULT_ROLE_PERMISSIONS` entry for Hub Manager. Company Admin gets it through `ALL_PERMISSIONS`.
- **Copy:**
  - **Archive menu item:** `Archive product`, destructive, last in the drawer's `⋯`.
  - **Confirm dialog:**
    - Title: `Archive <name>?`
    - Body: `It leaves the stock list and the product pickers. Its sales and movements stay in reports. You can restore it from Archived stock.`
    - Confirm button: `Archive`.
  - **Toasts:** `<name> archived.` after archiving, and `<name> restored.` after restoring.
  - **Restore:** `Restore`, the drawer's primary action when the product is archived, and a row action in the Archived view.
  - **Badge:** `StatusBadge` with tone `neutral`, reading `Archived`.
  - **Status filter:** a `FilterSelect` labelled `Status` with the options `Active` (default), `Archived` and `All`, kept in the URL as `status`.
- **Blocked archiving:** the menu item stays visible but disabled, and its reason shows as the item's description.
  - With stock on hand: `Stock must be 0 first. <stock display> on hand.`
  - With open requests: `Close the <n> open requests first.`, or `request` when n is 1.
- **Nothing is removed:**
  - Stock KPIs and the stock summary count active products only, as today.
  - Analytics Inventory and Suppliers tabs count every product, so their history doesn't shrink.

## Review Focus

1. **Recording a sale while someone archives the product:** the server's 409 message shows as the sale form's error, and the picker refetches. Task 4 tests that `useRecordSale`'s product list is invalidated on that error.
2. **Archived products in history:** a sale or movement row naming an archived product still shows the name. The drawer opened from it shows `Archived` and `Restore`. The mappers never drop inactive products.
3. **Low-stock alerts:** an archived product with a minimum level never shows in Needs attention or the low-stock count. The dashboard reads `useInventory` with the default `active`, and Task 3's test asserts it.
4. **Restoring brings it back everywhere:** after a restore, the stock list, pickers and KPIs include it without a reload. The mutation invalidates the `['inventory']` key prefix.
5. **Stale stock:** the server's 409 is the source of truth. The client check is only a hint, and the 409 message shows through `toast.error`.

---

### Task 1: The archive rule and status filter

**Files:**
- Create: `lib/inventory-archive.ts`
- Test: `lib/inventory-archive.test.ts`
- Modify: `types.ts` (`InventoryItem` gains `archivedAt?: string` and `archivedByName?: string`)
- Modify: `lib/api-mappers.ts:306` (`mapInventoryItem` maps `archived_at` and `archived_by.full_name`)
- Modify: `types/api.ts` (`ApiProduct` fields from the contract)

**Interfaces:**
- Produces:
  - `type ArchiveStatus = 'active' | 'archived' | 'all'`
  - `isArchived(item: Pick<InventoryItem, 'isActive'>): boolean`: `isActive === false`.
  - `archiveBlocker(item: InventoryItem, openRequestCount: number): string | null`
  - `filterByArchiveStatus<T extends Pick<InventoryItem, 'isActive'>>(items: T[], status: ArchiveStatus): T[]`
  - `parseArchiveStatus(value: string | null | undefined): ArchiveStatus`: anything else gives `'active'`.

- [ ] **Step 1: Write the failing tests:**

```ts
it('blocks archiving with stock on hand', () => {
  assert.equal(archiveBlocker(item({ currentStock: 12, unitOfMeasure: 'Units' }), 0), 'Stock must be 0 first. 12 Units on hand.');
});
it('blocks archiving with open requests', () => {
  assert.equal(archiveBlocker(item({ currentStock: 0 }), 2), 'Close the 2 open requests first.');
  assert.equal(archiveBlocker(item({ currentStock: 0 }), 1), 'Close the 1 open request first.');
});
it('allows archiving at zero stock and no requests', () => { assert.equal(archiveBlocker(item({ currentStock: 0 }), 0), null); });
it('treats tiny float stock as zero', () => { assert.equal(archiveBlocker(item({ currentStock: 0.0000001 }), 0), null); });
it('filters by status', () => { /* 2 active + 1 archived → active 2, archived 1, all 3 */ });
it('parses unknown status as active', () => { assert.equal(parseArchiveStatus('x'), 'active'); });
```

  The stock text comes from `formatInventoryStockDisplay` (`lib/format-carton-stock.ts`), so cartons read as they do on the drawer. Treat `|stock| < 1e-6` as zero.
- [ ] **Step 2:** Run `npm test`. Expected FAIL (module missing).
- [ ] **Step 3:** Implement the module, the types and the mapper fields.
- [ ] **Step 4:** Run `npm test`. Expected PASS.
- [ ] **Step 5: Commit.** `git commit -m "Add the inventory archive rule"`

### Task 2: API hooks, permission and mock

**Files:**
- Modify: `hooks/use-queries.ts:1556`. `useInventory` filters gain `status?: ArchiveStatus` and send `status` only when it isn't `'active'`. Add `useArchiveProduct()` and `useRestoreProduct()`.
- Modify: `lib/permissions.ts` (Global Constraints)
- Modify: `lib/mock-api/handler.ts`
  - The `inventory` GET route filters on `status` with `is_active`.
  - Add PATCH routes for `/archive` and `/restore` that update the product in `db.products` in memory, so the change shows until reload.
  - The archive route returns 409 with the contract's message when `current_stock > 0`.

**Interfaces:**
- Consumes: Task 1 `ArchiveStatus`.
- Produces:
  - `useArchiveProduct(): UseMutationResult<InventoryItem, Error, { id: string }>`
  - `useRestoreProduct(): UseMutationResult<InventoryItem, Error, { id: string }>`
  - Both invalidate `['inventory']` and `['inventory-sales-metrics']` on success.

- [ ] **Step 1:** Add the permission, then the hooks. The hooks use `axiosPatch(\`inventory/${id}/archive\`, {}, true)`, then map the result with `mapInventoryItem`.
- [ ] **Step 2: Make the mock answer.**
  - The handler's `route()` handles non-GET writes after GET. Add the two PATCH matches before the echo fallback.
  - For a 409, return `{ status: 409, data: { message } }`. Then make `mockAdapter` reject non-2xx statuses with an `AxiosError` carrying that response, so `axiosErrorMessage` reads it.
- [ ] **Step 3:** Run `npm test` and `npx tsc --noEmit`. Expected PASS, with no type errors.
- [ ] **Step 4: Commit.** `git commit -m "Add archive and restore product hooks and mock routes"`

### Task 3: Keep pickers active, keep history whole

**Files:**
- Modify: `app/(app)/analytics/inventory-tab.tsx:31` and `app/(app)/analytics/suppliers-tab.tsx:54`. Pass `status: 'all'`.
- Modify: `app/(app)/suppliers/supplier-drawer.tsx:31`. Pass `status: 'all'`, because the Products tab is history.
- Leave alone: every other `useInventory(` call site. They are pickers or live stock: sales, the record-sale form, request and transfer forms, issue form, the Suppliers page and dashboard attention. They inherit `active`.
- Test: `lib/inventory-archive.test.ts`. Add `it('default list is active only')`, which feeds the mock route's filter function (export it from `handler.ts` as `filterProducts`) with no status and asserts no archived rows.

- [ ] **Step 1:** Write that test. Run it; it fails until `filterProducts` is exported.
- [ ] **Step 2:** Make the call-site changes and export `filterProducts`.
- [ ] **Step 3:** Run `npm test`. Expected PASS.
- [ ] **Step 4: Commit.** `git commit -m "Keep archived products out of pickers and in analytics"`

### Task 4: Stock tab status filter and the drawer actions

**Files:**
- Modify: `app/(app)/inventory/page.tsx`
  - Read `status` with `useUrlState` and pass it to `useInventory`.
  - `scopedItems` uses `filterByArchiveStatus(items, status)` in place of its inline `isActive !== false` check.
  - The KPI and summary inputs stay active-only: they filter with `'active'` whatever the view.
- Modify: `app/(app)/inventory/stock-tab.tsx`. Add the `Status` `FilterSelect` to the existing `FilterBar` filters. In the Archived view, rows show the `Archived` badge after the name and a `Restore` row action.
- Modify: `app/(app)/inventory/product-drawer.tsx:90`. The `OverflowMenu` gains `Archive product`, last, destructive. Use `archiveBlocker(item, openRequests)` to disable it with the reason. Count the open requests with `useInventoryRequests` filtered to this product and to `submitted` or `approved`.
  - When the product is archived: the header shows the badge, the primary action is `Restore`, and the other actions that change stock are hidden.
- Modify: `app/(app)/sales/use-record-sale.ts`. In the submit `onError`, when the message is `This product is archived.`, invalidate `['inventory']` (Review Focus 1).
- Modify: `stories/` for the product drawer. Add an `Archived` story.

- [ ] **Step 1:** Make the edits. The confirm uses `ConfirmDialog` with the Global Constraints copy, following the Suppliers deactivate pattern in `app/(app)/suppliers/page.tsx:81-103`.
- [ ] **Step 2: Check in mock mode at 1280 px.**
  1. Archive a zero-stock product: the toast shows and the product leaves the list.
  2. Switch Status to Archived: the product is there with the badge.
  3. Restore it: it is back under Active.
  4. Try a product with stock: the item is disabled with the reason.
  5. Record a sale: the archived product isn't offered.
- [ ] **Step 3:** Run `node scripts/check.mjs` (exit 0). Then check the Stock tab and drawer at 390 and 1280 px, in light and dark.
- [ ] **Step 4: Commit.** `git commit -m "Archive and restore products from the stock list"`

### Task 5: Export carries status

**Files:**
- Modify: the stock export in `app/(app)/inventory/page.tsx:174`. When the view is `archived` or `all`, add a `Status` column (`Active`/`Archived`) and an `Archived on` column (`csvDate`, from Plan 1). The filename module stays as it is.

- [ ] **Step 1:** Make the edit. Export in each view and check the columns.
- [ ] **Step 2: Commit.** `git commit -m "Show archive status in the stock export"`
