# Skeleton

## Description
Skeleton holds the place of content that is still loading, at the size and shape that content will take, so the screen does not jump when it arrives.

`import { Skeleton } from "@/components/ui/skeleton"`, source `components/ui/skeleton.tsx`, status `ready-with-gaps`.
Foundation: `shadcn skeleton (base-nova, base)`. Traps checked: `trap/loading-layout-shift` (Rules), `trap/reduced-motion-ignored` (Motion: `skeleton-shimmer` stops the pulse), `trap/motion-layout-property` (Motion: opacity only), `trap/motion-linear` n/a because the pulse eases with `cubic-bezier(0.4, 0, 0.6, 1)`, `trap/loop-offscreen` (Motion, NEEDS REVIEW: the pulse is a CSS loop that is not paused off screen, not measured), `trap/live-region-double` (ARIA: Skeleton announces nothing, its wrapper does), `trap/illustration-announced` (ARIA: an empty `div` is read as nothing), `trap/loader-small-dots` n/a because Skeleton draws bars, not dots, `trap/loading-label-swap` n/a because Skeleton carries no label, `trap/decor-pointer` n/a because Skeleton sits in flow, never over a control, `trap/color-only-status`, `trap/numbers-shift`, `trap/toast-errors`, `trap/toast-timer`, `trap/motion-restart`, `trap/motion-blocks-input` and `trap/demo-on-timers` n/a because Skeleton holds no status, number, message, trigger or demo.

### Foundation
| Given by the foundation | Added by the team |
|---|---|
| shadcn `skeleton` for style `base-nova` (`components.json`), base `base`: a `div` with `data-slot="skeleton"` and `animate-pulse rounded-md bg-muted`, forwarding every `div` prop | The fill is `bg-muted/80` instead of `bg-muted`, a lighter bar on the app's tinted surfaces. Found by diffing against `npx shadcn@latest view skeleton` this session |
| No reduced-motion handling of its own | The `skeleton-shimmer` class, a hook that `app/globals.css:256` stops under `prefers-reduced-motion: reduce`. It carries no styles otherwise |
| The `cn` import from the registry's `cn` | Rewritten to `@/lib/utils`, single quotes and semicolons, from the project's formatting |

## Examples
Default: `docs/system/examples/skeleton/default.tsx`.

Real uses, 32 call sites (`rg -n "<Skeleton(\s|/|>|$)" app components lib --glob '*.tsx' --glob '!components/ui/**'`):
- Analytics, Inventory tab, chart and ranked-bar placeholders: `app/(app)/analytics/inventory-tab.tsx:132`, `app/(app)/analytics/inventory-tab.tsx:148`, `app/(app)/analytics/inventory-tab.tsx:154`, `app/(app)/analytics/inventory-tab.tsx:157`, `app/(app)/analytics/inventory-tab.tsx:163`
- Analytics, Suppliers tab, chart and ranked-bar placeholders: `app/(app)/analytics/suppliers-tab.tsx:183`, `app/(app)/analytics/suppliers-tab.tsx:201`, `app/(app)/analytics/suppliers-tab.tsx:204`, `app/(app)/analytics/suppliers-tab.tsx:211`
- KpiStrip, value and detail line per cell: `components/app/kpi-strip.tsx:59`, `components/app/kpi-strip.tsx:60`
- Engagement, churn customer detail, avatar, name, meta, four stat cards and a panel: `app/(app)/engagement/churn.tsx:198`, `app/(app)/engagement/churn.tsx:200`, `app/(app)/engagement/churn.tsx:201`, `app/(app)/engagement/churn.tsx:205`, `app/(app)/engagement/churn.tsx:207`
- DataTable, one bar per cell on desktop and two lines per card on phones: `components/app/data-table.tsx:186`, `components/app/data-table.tsx:223`, `components/app/data-table.tsx:224`
- EntityDrawer, the `loading` body: `components/app/entity-drawer.tsx:83`, `components/app/entity-drawer.tsx:84`, `components/app/entity-drawer.tsx:85`
- Dashboard, top customers and its detail rows: `app/(app)/_dashboard/top-customers.tsx:63`, `app/(app)/_dashboard/top-customers.tsx:114`
- Dashboard, sales chart: `app/(app)/_dashboard/sales-panel.tsx:61`
- Dashboard, category bars: `app/(app)/_dashboard/category-panel.tsx:23`
- Inventory, sales trends chart: `app/(app)/inventory/sales-trends.tsx:48`

The composites in `components/ui/loading-skeletons.tsx` (TableSkeleton, CardSkeleton, ChartSkeleton, PanelSkeleton, AnalyticsPageSkeleton, CreditSheetSkeleton) build on Skeleton inside the ui folder and are specced as LoadingSkeletons.

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/skeleton/default.tsx` | default | Two text-line skeletons, a 16px title bar and a 12px meta bar, inside a status region |
| `docs/system/examples/skeleton/avatar-and-cards.tsx` | state:shaped | Skeletons that take the radius of what they stand for: a round avatar and rounded-xl stat cards |
| `docs/system/examples/skeleton/chart-block.tsx` | state:block | One block skeleton at the chart's own height, h-40, while ranked bars load |
| Not applicable: the OS setting, not a prop, turns it on, so a static example would look like `default.tsx`; the rule lives at `app/globals.css:256` | state:reduced-motion | none |
| `docs/system/examples/skeleton/in-card.tsx` | composition:Card | Skeleton rows inside a Card while a dashboard panel loads, the way the top customers panel does |

## Variants
Not applicable: Skeleton has no variant props. Size, width and radius come from `className` at each call site.

## States
| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Pulsing | Mounted while its content loads | Wait. Nothing in it is interactive | Opacity pulses between 100% and 50% every 2s (`animate-pulse`) | screenshot |
| Reduced motion | The OS asks for reduced motion | Wait | A still bar at full opacity, since `.skeleton-shimmer { animation: none }` | by hand |
| Shaped | The caller passes the target's radius, such as `rounded-full` or `rounded-xl` | Wait | The bar's outline matches the avatar or card it stands for | screenshot |
| Replaced | The data arrives and the caller renders the content | Use the content | The bar is gone. Whether the box keeps its height depends on the caller's height class (`trap/loading-layout-shift`) | by hand |

### State precedence
- Pulsing and reduced motion: reduced motion wins. The bar stays still at full opacity.
- Shaped and pulsing: both show.
- Replaced and any other state: replaced wins, since the caller unmounts the Skeleton.

### Motion
| Trigger | Kind | Preset | Properties | Reduced motion |
|---|---|---|---|---|
| Mounted, loops until unmounted | announce | `animate-pulse`, Tailwind's 2s `cubic-bezier(0.4, 0, 0.6, 1)` infinite, no named preset | opacity | No animation, a still bar (`app/globals.css:256`) |

## Props
gen-docs writes the table from `React.ComponentProps<'div'>`. Skeleton adds no props of its own.
- `className`: sets the height, width and radius of the bar. Every call site passes at least a height.

## Usage

### When to use
- A region whose content is still loading and whose size is known in advance, such as a chart, a KPI value, a table row or a list of cards.

### When not to use
- A whole table, card, chart or panel that already has a loading layout. Use LoadingSkeletons instead.
- A record drawer that is loading. Use EntityDrawer with `loading` instead.

### Rules
- `rule/skeleton-set-height`: When a Skeleton stands in for content, pass a height class in `className`, such as `h-40 w-full` for a 160px chart or `h-4 w-24` for a line of text, instead of a bare `<Skeleton />`, because Skeleton is an empty `div` and draws 0px tall without one, so nothing shows and the content pushes the layout when it lands. Evidence: app 27/27 call sites pass a height or size class (`h-*` or `size-*`), found by `rg -n "<Skeleton" app components lib --glob '!components/ui/**'`; principle platform: an empty block `div` has a content height of 0. Check: review.
  - Don't: `{loading ? <Skeleton /> : <RankedBars rows={bestSellers} format={formatMoneyShort} />}`
  - Do: `{loading ? <Skeleton className="h-40 w-full" /> : <RankedBars rows={bestSellers} format={formatMoneyShort} />}`
- `rule/skeleton-shape-radius`: When a Skeleton stands for an avatar or a card, give it that element's radius, `rounded-full` for an avatar and `rounded-xl` for a card, instead of the default `rounded-md`, because the bar should outline what replaces it and the app's radius rule gives cards `rounded-xl` and avatars `rounded-full`. Evidence: app 3/3 avatar or card skeletons carry the target radius, `app/(app)/engagement/churn.tsx:198`, `app/(app)/engagement/churn.tsx:205`, `app/(app)/engagement/churn.tsx:207`. Check: review.
  - Don't: `<Skeleton className="size-12" />`
  - Do: `<Skeleton className="size-12 rounded-full" />`

### Content
Not applicable: Skeleton renders no text. The loading name, such as "Loading customer details", belongs to the wrapping status region, which is the caller's.

### Anti-slop
- `rule/skeleton-not-raw-pulse`: When a screen needs a loading placeholder, render `Skeleton` instead of a hand-made `div` with `animate-pulse bg-muted`, because a raw copy misses the `skeleton-shimmer` hook and keeps pulsing under reduced motion. Evidence: app 27/28 pulse placeholders outside the ui folder use Skeleton, stray `app/(app)/pos/overview.tsx:103`, found by `rg -n "animate-pulse" app components lib`. Check: review, plus `rg -n "animate-pulse" app components lib --glob '!components/ui/**'`.
  - Don't: `<div className="h-8 animate-pulse rounded-md bg-muted" />`
  - Do: `<Skeleton className="h-8" />`

### Limits
Not applicable: no bar count or size limit was measured this session. Real call sites draw 1 to 5 bars per region.

## Accessibility
Rests on a plain `div` with no role. Skeleton is silent by itself, so the caller's wrapper announces loading. Today 2 of the 19 loading regions outside the ui folder wrap their Skeletons in `role="status"` with a name (`components/app/entity-drawer.tsx:83`, `app/(app)/engagement/churn.tsx:198`), and 1 sets `aria-busy` only (`app/(app)/_dashboard/sales-panel.tsx:61`); the rest are silent (finding).

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| Tab | Before the loading region | Skips it, since Skeleton is not focusable | The next control | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| Skeleton | none (generic `div`) | None | None | Nothing | by hand |
| Caller's wrapper, where present | status | `aria-label`, such as "Loading customer details" | `aria-busy="true"` on some | The label once, when the region mounts | by hand |

## Tokens
| Part | State | Token |
|---|---|---|
| Bar fill | all | `bg-muted/80` (`--muted` at 80%) |
| Bar radius | default | `rounded-md` (`--radius-md`) |
| Bar radius | shaped | `rounded-full`, or `rounded-xl` (`--radius-xl`) from the caller |

## Related
- LoadingSkeletons: ready-made table, card, chart and panel loading layouts built from Skeleton.
- EntityDrawer: draws three Skeleton bars when `loading` is set.
- KpiStrip: draws Skeleton bars per cell while figures load.
- DataTable: draws Skeleton cells while rows load.
- EmptyState: what replaces the skeleton when loading ends with no rows.
