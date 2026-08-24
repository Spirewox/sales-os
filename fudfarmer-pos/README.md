# FudFarmer POS

An **offline-first Point of Sale PWA** for retail counters — FudFarmer-owned stores, franchises, and external subscribers.

> **The governing rule:** the network is never in the critical path of a sale. Every sale completes locally, always. Syncing is a background concern the cashier never waits on.

## Run it

```bash
cd fudfarmer-pos
npm install
npm run dev -- -p 3477
```

Open <http://localhost:3477>. Demo PINs — Cashiers `1234` / `2345` · Manager `9999` · Finance `4444` · Admin `0000`.

## What's built

| Area | Status |
|---|---|
| **Offline** — cached catalogue & pricing, offline sales, local storage, sync queue with idempotent retry, live sync status | ✅ Complete |
| **Sell** — product grid/search, cart, line & cart discounts (% or ₦), tax (inclusive/exclusive), split payments, change, receipt | ✅ |
| **Shifts** — open/close, opening float, cash count, variance, X/Z reports, cash drops | ✅ |
| **Returns** — partial returns by quantity with reason capture; pro-rata refund, tax and stock restore; cumulative audit trail | ✅ |
| **Supervisor** — cashier performance with risk flags, transaction journal, closing stock count with shrinkage, end-of-day reconciliation | ✅ |
| **Assist** — in-store help queue; supervisor resolves with a real action (price override, stock correction, cash drop, sync retry) | ✅ |
| **RBAC** — 5 roles + 16-permission matrix with full/limited/none | ✅ |
| **Settings** — store, tax, discount rules, returns, offline/device, staff, live permission matrix | ✅ |

Not yet built: barcode scanning, product images/variants, digital receipts (SMS/email/WhatsApp), multi-store hierarchy, payment lifecycle states.

## Architecture

```
POS PWA  ──writes locally, always──►  IndexedDB (catalog · sales · OUTBOX · settings)
                                            │
                                    sync engine (online event + interval + manual)
                                            │ idempotent by client-generated sale id
                                            ▼
                                      SyncBackend  ──►  sales platform
```

Sales are **append-only facts**, so two tills can never conflict. Stock is *eventually consistent* — the till holds a local estimate, the server is truth.

**Money is integer kobo throughout**; formatting happens only at the UI edge (`lib/money.ts`).

See [`PLAN.md`](PLAN.md) for the full implementation plan, phase history and data model.

## Integration note

The POS holds a **local stock estimate** so it can show on-hand counts during an outage, but the central platform owns inventory. What still needs wiring: receiving authoritative stock back on sync, and handling out-of-stock / insufficient / reserved / sync-error responses.
