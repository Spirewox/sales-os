# StatusBadge

## Description
StatusBadge names the state a record is in, such as Paid, Low or Resolved, in one word or two, with a tone that says how much it needs attention.

`import { StatusBadge, STATUS_TONES, type Tone } from "@/components/app"`, source `components/app/status-badge.tsx`, status `ready-with-gaps`.
Foundation: hand-rolled. Traps checked: `trap/color-only-status` (States and Accessibility: the state word is always the badge's text), `trap/numbers-shift` answered by the caller: the one badge whose label is a live due time, `app/(app)/kitchen/board.tsx:310`, passes `tabular-nums` through `className`, and the component itself sets none (finding in the run report), `trap/empty-value` n/a because a missing status renders no badge at the call sites rather than an empty one, `trap/table-divs`, `trap/list-dead-gap`, `trap/narrow-hidden-nav` n/a because it is an inline label, not a table, list or nav, `trap/icon-optical-size` and `trap/icon-optical-align` n/a because no call site puts an icon in a badge, `trap/loading-layout-shift`, `trap/loading-label-swap`, `trap/loader-small-dots` n/a because it has no loading state, `trap/toast-errors`, `trap/toast-timer`, `trap/live-region-double` n/a because it is not a toast and has no live region, `trap/decor-pointer` n/a because it is not interactive and sets no pointer cursor, `trap/demo-on-timers`, `trap/reduced-motion-ignored`, `trap/loop-offscreen`, `trap/motion-restart`, `trap/motion-layout-property`, `trap/motion-blocks-input` n/a because it has no motion.

### Foundation
Not applicable: hand-rolled. A `span` with five tone classes and the `STATUS_TONES` table in `components/app/status-badge.tsx`, with no shadcn Badge underneath.

## Examples
Default: `docs/system/examples/status-badge/default.tsx`.

Real uses, 99 call sites (`rg -n "<StatusBadge\b" app components lib -g '!components/app/**'` lists 91 lines, some holding 2 tags; the check counts tags).

- Sales list and sale panel, payment domain: `app/(app)/sales/page.tsx:63`, `app/(app)/sales/sale-detail-panel.tsx:91`, `app/(app)/customers/customer-purchases-tab.tsx:90`, `app/(app)/_dashboard/needs-attention.tsx:108`
- Stock table and product drawer, stock domain: `app/(app)/inventory/stock-tab.tsx:100`, `app/(app)/inventory/product-drawer.tsx:90`, `app/(app)/analytics/inventory-tab.tsx:121`
- Engagement, requests and supplier issues, work domain: `app/(app)/engagement/feedback-table.tsx:46`, `app/(app)/engagement/feedback-drawer.tsx:70`, `app/(app)/engagement/enquiry-table.tsx:50`, `app/(app)/engagement/enquiry-drawer.tsx:43`, `app/(app)/engagement/interaction-utils.tsx:41`, `app/(app)/inventory/requests-tab.tsx:104`, `app/(app)/inventory/request-drawer.tsx:31`, `app/(app)/suppliers/supplier-issues-tab.tsx:67`
- Batch expiry with a computed label and `expiryTone`: `app/(app)/inventory/stock-tab.tsx:118`, `app/(app)/inventory/movements-tab.tsx:110`
- Kitchen job stage and payment: `app/(app)/kitchen/kitchen-ui.tsx:40`, `app/(app)/kitchen/kitchen-ui.tsx:45`
- Customer grades and interaction history: `app/(app)/customers/customer-grades.tsx:29`, `app/(app)/customers/customer-interactions-tab.tsx:62`, `app/(app)/customers/customer-interactions-tab.tsx:81`, `app/(app)/customers/customer-interactions-tab.tsx:100`
- Customer import summary rows: `app/(app)/customers/customer-import-summary.tsx:65`
- Credit cards: `components/credits/credit-item-card.tsx:38`
- 71 more uses with a literal `tone`, mostly neutral category labels in tables and drawers, found by the same rg command

Tone use across the 96 tags: `domain` 16 (payment 4, stock 4, work 8), literal `tone` 55 (neutral 30, good 10, warning 12, danger 3, info 0), computed `tone` 25.

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/status-badge/default.tsx` | default | A sale's payment status from the payment domain: Overdue in the danger tone |
| `docs/system/examples/status-badge/tone-neutral.tsx` | tone=neutral | Neutral for a label that is not a state of concern, such as a feedback category |
| `docs/system/examples/status-badge/tone-good.tsx` | tone=good | Good for a finished or healthy state |
| `docs/system/examples/status-badge/tone-warning.tsx` | tone=warning | Warning for a state that needs attention soon |
| `docs/system/examples/status-badge/tone-danger.tsx` | tone=danger | Danger for overdue, out or failed |
| `docs/system/examples/status-badge/tone-info.tsx` | tone=info | Info, an outlined neutral badge; no call site uses it yet |
| `docs/system/examples/status-badge/domain-payment.tsx` | domain=payment | Every payment status in its domain tone |
| `docs/system/examples/status-badge/domain-stock.tsx` | domain=stock | Every stock status in its domain tone |
| `docs/system/examples/status-badge/domain-work.tsx` | domain=work | Every work status in its domain tone, for feedback, enquiries and requests |
| `docs/system/examples/status-badge/unknown-status.tsx` | state:unknown-status | A status the domain does not list falls back to neutral with its text unchanged |
| `docs/system/examples/status-badge/custom-label.tsx` | state:custom-label | A computed label with a tone the caller picks, such as days to expiry |
| `docs/system/examples/status-badge/matrix.tsx` | matrix:tone,domain | All five tones beside the three domains, light and dark |
| `docs/system/examples/status-badge/in-data-table.tsx` | composition:DataTable | In a DataTable status column, placed in the phone card's meta line |

## Variants
The two axes are exclusive: a call passes `domain` with `status`, or `tone` with children, never both (the props type is a union).

### tone
- `neutral`: a label that is not a state of concern, such as a category, a channel or "Voided". Used at 30 call sites.
- `good`: paid, in stock, resolved, approved, fulfilled. Used at 10 call sites.
- `warning`: pending, low, partial, unpaid, expiring soon. Used at 12 call sites.
- `danger`: overdue, out, expired, rejected, failed. Used at 3 call sites.
- `info`: an outlined badge on the page background. Used at 0 call sites.

25 more call sites compute the tone from the record, such as `expiryTone(b.expiryDate)` or `due.tone === 'overdue' ? 'danger' : 'warning'`.

### domain
- `payment`: a sale's or job's payment state: Paid, Partial, Credit, Unpaid, Overdue, Voided. Used at 4 call sites.
- `stock`: a product's stock state: In stock, Low, Out, Expiring, Expired. Used at 4 call sites.
- `work`: a ticket's or request's state: Open, Pending, In progress, Approved, Fulfilled, Resolved, Rejected, Closed. Used at 8 call sites.

## States
| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Known status | `domain` and a `status` listed in `STATUS_TONES` | Read it | The status word as text, such as "Overdue"; danger and warning add a border | screenshot |
| Unknown status | `domain` with a `status` the table does not list, such as "Part paid" | Read it | The status word as text, in the neutral tone with no warning (finding in the run report) | by hand |
| Custom label | `tone` with children | Read it | The caller's text, such as "Expires in 3 days" | screenshot |

### State precedence
Not applicable: a badge holds one status, and the props union lets a call pass a domain status or a custom label, never both.

### Motion
Not applicable: no motion.

## Props
gen-docs writes the table from the types.
- `domain` and `status` look the tone up in `STATUS_TONES`, exported beside the component.
- `tone` with `children` sets the tone and text directly.
- `className` is passed at 2 call sites, one of them `capitalize` at `app/(app)/customers/customer-import-summary.tsx:65`, which breaks sentence case.

## Usage

### When to use
- A row, card or drawer shows the state of one record, such as a sale's payment, a product's stock or a ticket's progress
- A short neutral tag beside a record names its category or channel

### When not to use
- A headline count of records in a state, such as "12 overdue". Use KpiStrip instead
- A whole list has nothing in a state. Use EmptyState instead
- A choice the person makes between states. Use Segmented instead

### Rules
- `rule/status-badge-domain-first`: When the status is a payment, stock or work word listed in `STATUS_TONES`, pass `domain` and `status` instead of `tone` with a local mapping, because the shared table keeps one tone per word on every screen. Evidence: app 16/20 call sites that show a `STATUS_TONES` word pass `domain`, with strays `app/(app)/customers/customer-interactions-tab.tsx:62`, `app/(app)/customers/customer-interactions-tab.tsx:81`, `app/(app)/customers/customer-interactions-tab.tsx:100` (a local `workTone`) and `app/(app)/kitchen/kitchen-ui.tsx:45` (a local `PAYMENT_TONE`). Check: review.
  - Don't: `<StatusBadge tone={f.status === 'Open' ? 'warning' : 'good'}>{f.status}</StatusBadge>`
  - Do: `<StatusBadge domain="work" status={f.status} />`
- `rule/status-badge-tone-meaning`: When picking a `tone`, use `danger` for overdue, out, expired or failed, `warning` for pending, low, partial or expiring, `good` for paid, in stock or resolved, and `neutral` for everything else, instead of choosing a tone for emphasis, because status colour is kept for real state and every other label stays neutral. Evidence: principle heuristic: consistency of signals, written as the visual rule at `app/globals.css:11` and the doc comment at `components/app/status-badge.tsx:15`; app 30/55 literal tones are neutral and the 25 others follow the mapping, read from the props of each `<StatusBadge` tag. Check: review.
  - Don't: `<StatusBadge tone="good">Retail</StatusBadge>`
  - Do: `<StatusBadge tone="neutral">Retail</StatusBadge>`

### Content
- `rule/status-badge-label-case`: When writing the label, use 1 to 3 words in sentence case, such as "In stock", "Part paid" or "Expires in 3 days", instead of capitals or Title Case, because the visual rules set every label in sentence case and the badge is read in a table scan. Evidence: app 19/19 `STATUS_TONES` keys are in sentence case (`components/app/status-badge.tsx:19`), with one stray `className="capitalize"` at `app/(app)/customers/customer-import-summary.tsx:65`. Check: review.
  - Don't: `<StatusBadge tone="warning" className="uppercase">PART PAID</StatusBadge>`
  - Do: `<StatusBadge tone="warning">Part paid</StatusBadge>`

### Anti-slop
- `rule/status-badge-no-colour-class`: When a badge needs a different colour, pick another `tone` instead of passing colour classes through `className`, because the five tones hold the only status colours and a hand-picked hue breaks the one-accent rule. Evidence: app 96/96 call sites pass no colour class, and the 2 `className` uses set case, or figures and size at `app/(app)/kitchen/board.tsx:310`, read from the props of each `<StatusBadge` tag. Check: review.
  - Don't: `<StatusBadge tone="neutral" className="bg-blue-100 text-blue-700">Online</StatusBadge>`
  - Do: `<StatusBadge tone="neutral">Online</StatusBadge>`
- `rule/status-badge-not-a-button`: When the person can change a record's state, put the control beside the badge, such as a `RowAction`, instead of making the badge clickable, because the badge is a `span` with no role, focus or keyboard path. Evidence: app 96/96 call sites render the badge as a plain label with no `onClick`. Check: review.
  - Don't: `<span onClick={resolve}><StatusBadge domain="work" status="Open" /></span>`
  - Do: `<><StatusBadge domain="work" status="Open" /><RowAction tone="primary" onClick={resolve}>Resolve</RowAction></>`

### Limits
- Not applicable: no break was measured this session. The badge sets `whitespace-nowrap` and `shrink-0`, so a label past the cell's width overflows instead of wrapping, and the longest real label was not probed at 390px.

## Accessibility
Rests on a plain `span`. The status word is the text, so a screen reader reads the state inline with no extra markup. Contrast: NEEDS REVIEW. The comment at `components/app/status-badge.tsx:8` says the warning tint keeps amber above 4.5:1 in light mode, and no tool measured it this session.

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| Tab | Before the badge | Skips it, because it is not focusable | The next control | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| Badge | none (generic `span`) | Its text | Not applicable: no states | The status word in reading order, such as "Overdue" | snapshot |

## Tokens
| Part | State | Token |
|---|---|---|
| Badge | neutral | `--muted` fill, `--muted-foreground` text |
| Badge | good | `--primary` at 10% fill, `--primary` text |
| Badge | warning | `--warning` at 5% fill, `--warning` at 40% border, `--warning` text |
| Badge | danger | `--destructive` at 5% fill, `--destructive` at 30% border, `--destructive` text |
| Badge | info | `--background` fill, `--border` border, `--foreground` text |

## Related
- DataTable: where most badges sit, in a status column that goes to the phone card's meta line.
- KpiStrip: a count of records in a state.
- EmptyState: a list with nothing in it.
