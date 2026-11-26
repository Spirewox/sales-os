# Inventory archiving

A product that is no longer stocked can be archived. It leaves the stock list and every product picker, its sales,
movements and analytics history stays, and it can be restored.

Plan: [2026-11-26-inventory-archiving.md](../superpowers/plans/2026-11-26-inventory-archiving.md). The plan blocked
archiving while stock was on hand. At the user's request (26 Nov) a product **with stock can be archived after a clear
warning**, and restoring brings the stock back.

## What a person sees

- **Inventory → Stock** has a status filter: **Active** (the default), **Archived**, **Active and archived**.
  Archived rows show an "Archived" badge and the date.
- A product's drawer and its row ⋯ menu have **Archive product**. An archived product shows its history only, with
  **Restore** in place of the stock actions.
- **Archiving with stock on hand** asks first: "Archive <name> with stock on hand?" The message says how much stock is
  held and what it is worth at cost. Archiving takes that stock out of the stock list, the stock value and the product
  pickers, so it can't be sold, transferred or adjusted. The stock stays recorded and comes back on restore.
  The button reads **Archive with stock**.
- **Open stock requests block it:** "<name> can't be archived yet. Close the 2 open requests first."
- Product pickers (sales, POS, transfers, requests, purchases) list active products only. Analytics, movements and
  sales history keep showing archived products.
- The stock export has a Status column.
- Permission: **Archive & restore products** (`archive_sku`), on by default for Company Admin and Hub Manager.

## Rules

`lib/inventory-archive.ts` (tested): `isArchived`, `archiveBlocker` (open requests), `archiveStockWarning` (the
message for stock on hand), `stockEditable`, `filterByArchiveStatus`. `useInventory` takes `status`, defaulting to
`active`, so every picker leaves archived products out without changes; analytics asks for `all`.

## Backend contract

| Call | Behaviour |
|------|-----------|
| `PATCH inventory/:id/archive` | Sets `is_active: false`, `archived_at: now`, `archived_by: user`. Writes an audit entry "Archived product <name>". Returns `{ data: ApiProduct }`. Stock on hand does **not** block: the product keeps `current_stock` and batches, which drop out of stock totals and lists. 409 with a `message` only when submitted or approved requests name the product. |
| `PATCH inventory/:id/restore` | Sets `is_active: true`, clears `archived_at` and `archived_by`. Audit entry. Returns `{ data: ApiProduct }`. |
| `GET inventory?status=active\|archived\|all` | Defaults to `active`. Pickers and the sale API reject an archived product id with 409 "This product is archived." |
| Stock changes to an archived product | Purchases, adjustments, transfers, batch updates and "align stock to batches" are refused with 409 "This product is archived." The app no longer offers them, but the server is the guard. |
| `ApiProduct` | Gains `archived_at?: string` and `archived_by?: { _id: string; full_name: string }`. |
| Permission | `archive_sku`, on for Company Admin and Hub Manager. |

## Files

`lib/inventory-archive.ts`, `lib/mock-api/products.ts`, `app/(app)/inventory/{page,stock-tab,product-drawer,use-stock-view}`,
`lib/exports/stock.ts`.
