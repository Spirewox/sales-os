# FudFarmer POS — Implementation Plan

An offline-first **Point of Sale PWA** for retail counters: FudFarmer-**owned** stores, **franchised** stores, and **external subscribers** who pay to use it.

> **The governing rule:** the network is never in the critical path of a sale. Every sale completes locally, always. Syncing is a background concern the cashier never waits on.

---

## 1. Why a separate app

The POS is not a CRM screen. Different users (cashiers, not managers), different rhythm (hundreds of small transactions vs. analysis), different device (a till/tablet, often wall-mounted), and different install target (external subscribers install *this*, and must never see FudFarmer's internal data).

It therefore lives in its own folder — `fudfarmer-pos/` — as its own Next.js PWA with its own manifest, service worker, port and install identity. It talks to the CRM only through one seam (§5).

```
fudfarmer-pos/
  app/            # kiosk-style routes (no CRM chrome)
  lib/            # db (IndexedDB), sync engine, catalog, cart, money, seeds
  components/     # POS UI primitives (keypad, tiles, receipt)
  public/         # manifest.webmanifest, service worker, icons
  PLAN.md
```

---

## 2. Architecture

```
┌─ POS PWA (installed, works with zero network) ──────────────┐
│  Sell → Cart → Payment → Receipt                            │
│      │ writes locally, ALWAYS (never awaits network)         │
│      ▼                                                       │
│  IndexedDB:  catalog · customers · sales · OUTBOX · settings │
│      │                                                       │
│  Sync engine: online-event + interval + manual, FIFO,        │
│               idempotent by client-generated sale id         │
└──────┼───────────────────────────────────────────────────────┘
       ▼ when reachable
  SyncBackend (interface)
    • prototype  → writes into the CRM's local data layer
    • production → real REST API (same method signatures)
```

**Service worker** precaches the app shell so a cold start with no network still boots the till. **Manifest** makes it installable to the home screen, standalone display, landscape-friendly.

---

## 3. Data model (local)

| Store | Purpose | Notes |
|---|---|---|
| `settings` | Store profile, device, active shift | One row (`id: 'store'`) |
| `catalog` | Sellable products + prices | Synced down (owned/franchise) or user-owned (subscriber) |
| `customers` | Optional lookup for credit/loyalty | Synced down; POS can create locally |
| `sales` | Every completed sale (append-only) | Local source of truth for reports |
| `outbox` | Unsynced mutations | `pending → syncing → synced | failed` |
| `cashiers` | Staff + PIN + role | `cashier | supervisor` |

**Key types**

```ts
StoreProfile { id, storeName, storeType: 'Owned'|'Franchise'|'Subscriber',
               hubId?, currency, receiptFooter, plan?, planExpiry?, deviceId, deviceLabel }

PosProduct   { id, sku, name, category, price, cost?, unit, stock?, trackStock, isActive }

PosSale      { id (client-generated), deviceId, storeId, cashierId, shiftId,
               lines: PosSaleLine[], subtotal, discount, tax, total,
               payments: PosPayment[], change, customerId?, customerName?,
               status: 'completed'|'refunded'|'voided', createdAt, syncState }

PosPayment   { method: 'Cash'|'Transfer'|'Card'|'Credit', amount, reference? }
OutboxItem   { id, type: 'sale'|'refund'|'shift'|'customer', payload, attempts, lastError?, createdAt }
```

### Why sync is simple here
Sales are **append-only facts** — two tills can never "edit the same row," so there are **no merge conflicts**. The only shared mutable quantity is **stock**, which is treated as *eventually consistent*: the till shows a local estimate; the server is truth and reconciles on sync. A till may oversell during a long outage — that is a business decision (allow, warn, or block), configurable per store.

---

## 4. Sync protocol

1. Sale completes → written to `sales` **and** enqueued in `outbox` (one transaction).
2. Flush triggers: `online` event · interval (~30s) · manual "Sync now" · app foreground.
3. FIFO drain; each item POSTs with its **client-generated id** as the idempotency key.
4. Success → mark `synced`. Failure → increment `attempts`, exponential backoff, keep queued. Never blocks the UI.
5. Pull-down (catalog/prices/customers) on connect, versioned by `updatedAt`.

**Trust through visibility:** a persistent status pill shows Online/Offline + pending count; every sale row shows its own sync state. Cashiers must be able to *see* that nothing was lost.

---

## 5. Multi-tenant model

| Store type | Catalog | Sales sync | Isolation |
|---|---|---|---|
| **Owned** | Pulled from FudFarmer inventory (hub-scoped) | Push into CRM Sales + stock movements | Full internal access |
| **Franchise** | Pulled, franchise-scoped pricing | Push, tagged to franchise for royalty/performance reporting | Sees only own store |
| **Subscriber** | **Own catalog**, self-managed | Stays in their own tenant — never touches FudFarmer data | Hard-isolated; plan + expiry gate |

Everything funnels through `SyncBackend`, so tenancy is a config concern, not a code-fork.

---

## 6. Phases

**Phase 1 — Sell offline** ✅ *shipped & verified*
Store setup + cashier PIN login · product grid + search · cart (qty, line discount) · payments (cash w/ change, transfer, card, split, credit) · receipt · IndexedDB + outbox + sync engine · service worker + manifest · sync status UI.

**Phase 2 — Operate the till** ✅ *shipped & verified*
Shifts (open/close, opening float, cash count, variance) · X/Z reports · refunds & voids behind supervisor PIN (stock restored, original stamped for audit, reversal mirrored as a negative record) · held/parked carts.

**Phase 2.5 — Supervisor** ✅ *shipped & verified*
PIN-gated supervisor screen, reachable with or without an open till.
- **Cashier performance** (per day): net/gross, transactions, items, avg basket, cash taken, sales per hour, payment mix, discounts given, refunds — ranked, with **risk flags** (refund rate, discount rate, drawer variance, unreconciled shift).
- **Transaction journal**: every transaction for the day — expandable to line items, payments, change, customer, receipt no., sync state; filter by cashier / sales vs refunds; search by receipt, customer or product. Reversals show who authorised them and why.
- **Closing stock**: per-product opening → sold → returned → expected closing (opening derived backwards from live stock), closing value at cost, plus a **physical stock count** with per-product variance and total shrinkage in units and naira.
- **End-of-day reconciliation**: trading summary + payment mix, cash walk (floats → cash sales − cash refunds → expected vs counted), **closing-stock position**, per-shift variance, and guards that block closing the day while shifts are open or records unsynced. Day variance counts **only reconciled shifts**.

**Phase 2.6 — Supervisor assist** ✅ *shipped & verified*
An in-store help channel so a stuck cashier never has to leave the till.
- **Cashier** taps the life-ring: picks an issue type (price override, discount, wrong item, payment problem, complaint, stock, cash drop, sync stuck), adds detail, flags "customer waiting", and can **attach the live cart**. The till never blocks. A badge tracks their open and resolved requests.
- **Supervisor** gets an Assist queue (urgent first, wait time shown, cart visible), can claim ("I'll handle it"), dismiss, or **Fix & resolve**.
- Resolution performs a **real action**, not just advice: **price override** and **stock correction** write to the catalog, **cash drop** records money moved to the safe, **retry sync** flushes the outbox, or resolve with guidance. Every action is logged with before → after values and the supervisor's name.
- **Cash drops reduce expected drawer cash** in the shift/day reconciliation, so money taken to the safe never reads as a shortage.

**Phase 2.7 — PRD gap closure: tax, discounts, partial returns** ✅ *shipped & verified*
Closing the highest-priority gaps found auditing against the POS PRD.
- **Tax (§3, §5, §25)**: store-level rate, label and inclusive/exclusive mode. Inclusive breaks VAT out on screen and receipt without changing what anyone pays; exclusive adds it at checkout. Recomputes after discounts.
- **Discounts (§13)**: per-line and cart-level, entered as **% or fixed amount** with quick-pick chips. A store `maxDiscountPct` hard-caps them, and anything above `discountApprovalThresholdPct` **blocks checkout until a supervisor authorises it**.
- **Partial returns (§11, §12)**: pick the quantity per line, choose a **reason** (7 preset reasons + free-text note). Refund value, tax and stock all restore **pro-rata**. Repeat returns are capped at what remains, the original stays `completed` until everything is back, and it carries a cumulative `returnedQty` audit trail.
- **Settings migration**: existing installs are backfilled with the new tax/discount policy rather than silently running with it undefined.

**Phase 2.8 — RBAC, permission matrix & settings** ✅ *shipped & verified*
- **Five roles (§21)**: Cashier, Store Manager, Inventory Manager, Finance, Super Admin — replacing the old `cashier | supervisor` boolean. Legacy tills migrate `supervisor → manager` automatically, and gain any role they predate.
- **Permission matrix (§22)**: 16 permissions × 5 roles as data in `lib/permissions.ts`, with the PRD's **tri-state** — full / **limited** / none. "Limited" is meaningful: a cashier may discount *up to* the threshold, start (but not approve) a refund, and see *only their own* reconciliation.
- **Enforcement**: every hardcoded `role === 'supervisor'` check is gone. Approvals now test the *permission*, so Finance and Admin can authorise too — not just managers. Verified: a cashier sees Refund but **no Void and no Settings**; an admin sees all three.
- **POS Settings (§25)**: store & receipt, tax, discount rules, return policy, offline/device, staff, and a read-only render of the live permission matrix. Gated by `settings.manage`, saves back to the store profile and applies immediately.

**Phase 3 — Tenancy**
Store-type onboarding · subscriber catalog manager (CRUD + import) · plan gating & expiry · device registry · cashier management.

**Phase 4 — Integrate with CRM**
Synced sales land in CRM Sales + stock movements (channel = POS) · franchise & subscriber performance as an Insights dataset · consolidated multi-store analytics.

---

## 7. Conventions

- **Never `await` the network to finish a sale.** Local write first, enqueue, return.
- **All ids are client-generated** (`deviceId` + timestamp + random) so retries are idempotent and tills never collide.
- **Money is integer kobo internally**, formatted at the edges — no float drift.
- **Touch-first UI**: large tap targets, keypad entry, high contrast, works one-handed on a tablet.
- **Every write goes through `lib/db.ts`**; components never touch IndexedDB directly.
- Swapping to a real backend = implementing `SyncBackend`. Nothing in the UI changes.
