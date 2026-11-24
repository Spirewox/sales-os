# EmptyState

## Description
EmptyState tells someone why a list, panel or section has nothing in it and what would fill it.

`import { EmptyState } from "@/components/app"`, source `components/app/empty-state.tsx`, status `ready-with-gaps`.
Foundation: hand-rolled. Traps checked: `trap/illustration-announced` (ARIA: the icon slot is `aria-hidden`), `trap/decor-pointer` n/a because the icon and text take no pointer events of their own and only the caller's action is interactive, `trap/surface-double-edge` (Rules, `rule/empty-state-compact-inside`: EmptyState draws no border or fill, so it adds no edge inside a DataTable or card), `trap/surface-matches-parent` n/a because it has no surface, `trap/loading-layout-shift` and `trap/loading-label-swap` n/a because EmptyState has no loading state and DataTable never shows it during a load, `trap/toast-errors`, `trap/toast-timer`, `trap/live-region-double` n/a because it is not a toast and has no live region (finding: nothing is announced when filters empty a list), `trap/numbers-shift` n/a because it shows no figures, `trap/color-only-status` n/a because it is neutral and its state is the title text, `trap/icon-optical-size` and `trap/icon-optical-align` NEEDS REVIEW because no optical measurement ran this session, `trap/loader-small-dots`, `trap/demo-on-timers`, `trap/reduced-motion-ignored`, `trap/loop-offscreen`, `trap/motion-restart`, `trap/motion-layout-property`, `trap/motion-blocks-input` n/a because it has no motion, `trap/viewport-height`, `trap/safe-area`, `trap/scroll-chain`, `trap/gesture-drag`, `trap/gesture-axes`, `trap/overflow-scrollbar` n/a because it never sizes to the viewport or scrolls.

### Foundation
Not applicable: hand-rolled. The component is 10 lines of flex layout in `components/app/empty-state.tsx` with no library underneath.

## Examples
Default: `docs/system/examples/empty-state/default.tsx`.

Real uses, 53 call sites (`rg -n "<EmptyState\b" app components lib -g '!components/app/**'`). 25 of them sit in a DataTable `empty` slot, the rest in drawer panels, tabs and whole sections.

- Analytics page, whole section, default size: no access `app/(app)/analytics/page.tsx:77`, needs the API `app/(app)/analytics/page.tsx:112`, load failed `app/(app)/analytics/page.tsx:145`
- Kitchen analytics, whole tab, default size: `components/kitchen-analytics-tab.tsx:34`
- Analytics Ask, compact first-run prompt: `app/(app)/analytics/explore-ask.tsx:81`
- DataTable empty slots, compact, filtered or first-run: `app/(app)/customers/page.tsx:225`, `app/(app)/credits/page.tsx:185`, `app/(app)/sales/page.tsx:182`, `app/(app)/suppliers/page.tsx:232`, `app/(app)/inventory/stock-tab.tsx:218`, `app/(app)/inventory/movements-tab.tsx:143`, `app/(app)/inventory/requests-tab.tsx:169`, `app/(app)/settings/locations-section.tsx:144`, `app/(app)/settings/users-section.tsx:157`, `app/(app)/engagement/churn.tsx:176`, `app/(app)/engagement/enquiry-table.tsx:104`, `app/(app)/engagement/feedback-table.tsx:119`, `app/(app)/engagement/compensation-table.tsx:74`, `app/(app)/kitchen/jobs.tsx:232`, `app/(app)/kitchen/ingredients.tsx:135`, `app/(app)/kitchen/ingredients.tsx:137`, `app/(app)/kitchen/recipes.tsx:85`, `app/(app)/kitchen/recipes.tsx:87`, `app/(app)/pos/overview.tsx:86`, `app/(app)/pos/tills.tsx:82`, `app/(app)/pos/transactions.tsx:82`, `app/(app)/pos/shifts-reviews.tsx:67`, `app/(app)/pos/shifts-reviews.tsx:108`, `app/(app)/_dashboard/needs-attention.tsx:58`
- Load failed inside a list: `app/(app)/engagement/churn.tsx:174`
- Drawer and tab panels, compact: `app/(app)/inventory/product-drawer-panels.tsx:26`, `app/(app)/inventory/product-drawer-panels.tsx:65`, `app/(app)/inventory/product-drawer-panels.tsx:157`, `app/(app)/inventory/product-drawer-panels.tsx:215` (title only, no description), `app/(app)/inventory/product-drawer.tsx:164`, `app/(app)/customers/customer-credit-tab.tsx:55`, `components/credits/customer-credit-sheet.tsx:140`, `app/(app)/kitchen/recipes.tsx:227`, `app/(app)/kitchen/job-panel-tabs.tsx:285`, `app/(app)/kitchen/job-form-sections.tsx:175`, `app/(app)/_dashboard/top-customers.tsx:79`
- Settings without the API or the permission, compact inside a bordered card: `app/(app)/settings/roles-section.tsx:138`, `app/(app)/settings/roles-section.tsx:140`

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/empty-state/default.tsx` | default | A whole section with nothing in it: the Analytics tab before any kitchen job in the period |
| Not applicable: `size="default"` is the default and `default.tsx` shows it | size=default | none |
| `docs/system/examples/empty-state/size-compact.tsx` | size=compact | Compact, inside a drawer panel: a supplier with no purchases yet |
| `docs/system/examples/empty-state/filtered.tsx` | state:filtered | Filters hide every row: the description names them and the action clears them |
| `docs/system/examples/empty-state/first-run.tsx` | state:first-run | Nothing recorded yet: the description says what makes rows appear and the action is that first step |
| `docs/system/examples/empty-state/no-access.tsx` | state:no-access | The person lacks the permission: the description names it and who can grant it |
| `docs/system/examples/empty-state/load-failed.tsx` | state:load-failed | A load failed and the caller shows it in the empty slot, with what to try |
| `docs/system/examples/empty-state/in-data-table.tsx` | composition:DataTable | In the DataTable empty slot, shown only after loading ends with no rows |

## Variants

### size
- `default`: a whole section or tab with nothing in it, 56px of space above and below (`py-14`). Used at 4 call sites, `app/(app)/analytics/page.tsx:77`, `app/(app)/analytics/page.tsx:112`, `app/(app)/analytics/page.tsx:145` and `components/kitchen-analytics-tab.tsx:34`.
- `compact`: inside a DataTable, a drawer panel or a card, 32px above and below (`py-8`). Used at 49 call sites.

## States
EmptyState renders the same parts in every case. Its states are the reasons a caller shows it, told by the title and description.

| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Filtered | Filters or a search leave no rows | Clear the filters from the action, or change them | Title "No {records} match" or "No {records} to show", description "Nothing matches these filters." or the filter names, action "Clear filters" | screenshot |
| First run | Nothing of this kind recorded yet | Take the first step from the action when the person may, such as "Add ingredient" | Title "No {records} yet", description saying what makes rows appear | screenshot |
| Nothing due | A queue the person works through is clear, such as overdue credit | Read it and move on | Title such as "Nothing owed", "Stock is healthy" or "Nothing to review" | screenshot |
| No access | The person lacks the permission for the section | Read who can grant it | Title "No access" or "No access to {section}", description naming the permission | by hand |
| Needs the API | The app runs without its API, so the section has no data source | Read it | Title "{Section} needs the API" | by hand |
| Load failed | The caller's query failed | Read what to try; no retry action exists today | Title "Couldn’t load {thing}" or "Could not load {thing}", description "Check your connection and try again." | by hand |

### State precedence
Not applicable: each call site passes one title and description for one reason, and the caller picks the reason before rendering, as in `app/(app)/engagement/churn.tsx:174` where load failed and filtered are separate branches.

### Motion
Not applicable: no motion.

## Props
gen-docs writes the table from the types.
- `title` is the only required prop and the only one every call site passes.
- `description` takes a node so a caller can name the active filters inline.
- `icon` takes a lucide icon, sized to 24px and muted by the component.
- `action` takes the caller's own control. 22 call sites pass one.
- `size` is `default` or `compact`.

## Usage

### When to use
- A list, table or panel loaded and has nothing to show, and the person needs to know why
- A whole section cannot show data because the person lacks access or the API is not connected

### When not to use
- A list is still loading. Use DataTable instead, with `loading`, which shows skeleton rows and holds the empty slot back
- A single field or cell has no value. Use StatusBadge instead when the blank is a state such as "Unpaid", else leave it to the cell
- A section crashed while rendering. Use SectionErrorBoundary instead

### Rules
- `rule/empty-state-compact-inside`: When EmptyState sits inside a DataTable `empty` slot, a drawer panel or a card, set `size="compact"` instead of the default, because the default's 56px of space above and below suits a whole section and pushes a panel's other content down. Evidence: app 49/53 call sites pass `size="compact"`, and the 4 default ones fill a whole Analytics section or tab. Check: review.
  - Don't: `<DataTable label="Tills" columns={columns} rows={[]} getRowId={(r) => r.id} empty={<EmptyState title="No tills" />} />`
  - Do: `<DataTable label="Tills" columns={columns} rows={[]} getRowId={(r) => r.id} empty={<EmptyState size="compact" title="No tills" description="Register a till to start selling from a device at this location." />} />`
- `rule/empty-state-filtered-clear`: When filters or a search caused the empty result, pass an `action` labelled "Clear filters" that clears them, instead of no action, because the filters often sit above the fold on a phone and the empty slot is where the person is looking. Evidence: app 12/22 filtered empty states pass a "Clear filters" action, the 10 strays listed in `docs/system/rule-tests/empty-state.tsv`. Check: review.
  - Don't: `<EmptyState size="compact" title="No suppliers match" description="Nothing matches these filters." />`
  - Do: `<EmptyState size="compact" title="No suppliers match" description="Nothing matches these filters." action={<button type="button" onClick={clearAll} className="text-sm font-medium text-primary hover:underline">Clear filters</button>} />`
- `rule/empty-state-action-link`: When passing an `action`, render a text button with `text-sm font-medium text-primary hover:underline` instead of a filled primary Button, because the screen's one filled primary action lives in its page header and a second filled green button competes with it. Evidence: app 16/22 actions use the text button classes, read at each call site listed in the props of each `<EmptyState` tag; principle heuristic: one primary action per screen, the one-green-accent rule in `app/globals.css:11`. Check: review.
  - Don't: `<EmptyState title="No recipes yet" action={<Button>New recipe</Button>} />`
  - Do: `<EmptyState size="compact" title="No recipes yet" action={<button type="button" onClick={add} className="text-sm font-medium text-primary hover:underline">New recipe</button>} />`

### Content
- `rule/empty-state-title-no`: When writing `title`, start with "No {records}" and end on "yet", "match" or "to show" for first-run, filtered and plain empty cases, in sentence case with no full stop, instead of "Empty" or "No data", because the title is the one line every call site shows and it names what is missing. Evidence: app 47/53 titles start with "No" or "Nothing", from the props of each `<EmptyState` tag. Check: review.
  - Don't: `<EmptyState size="compact" title="No data." />`
  - Do: `<EmptyState size="compact" title="No suppliers match" />`
- `rule/empty-state-description-why`: When writing `description`, say in 1 or 2 full sentences why it is empty or what makes rows appear, such as "Purchases recorded against this supplier show up here.", ending with a full stop, instead of repeating the title, because the title already says what is missing and the description is the only place for the reason. Evidence: app 52/53 call sites pass a `description`, the stray `app/(app)/inventory/product-drawer-panels.tsx:215` passes the title only. Check: review.
  - Don't: `<EmptyState size="compact" title="No purchases yet" description="There are no purchases." />`
  - Do: `<EmptyState size="compact" title="No purchases yet" description="Purchases recorded against this supplier show up here." />`

### Anti-slop
- `rule/empty-state-icon-only`: When adding art, pass one lucide icon through `icon` instead of an illustration, an emoji or a tinted circle behind the icon, because the component draws the icon at 24px in `--muted-foreground` and the visual rules keep the brand palette out of state. Evidence: app 32/53 call sites pass a lucide icon and 0 pass an image or emoji, from the props of each `<EmptyState` tag. Check: review.
  - Don't: `<EmptyState title="No sales yet" icon={<div className="rounded-full bg-primary/10 p-3"><img src="/empty.svg" alt="" /></div>} />`
  - Do: `<EmptyState size="compact" title="No sales yet" icon={<Receipt />} description="Retail sales of this product appear here." />`
- `rule/empty-state-whatsapp-contact`: When an empty state's action reaches a customer, set its `href` to `whatsAppHref(phone)` instead of a `tel:` call link, because customers are contacted by WhatsApp only in this product. Evidence: app 2/2 customer-contact actions in the row kit use WhatsApp, `app/(app)/_dashboard/needs-attention.tsx:56` and `app/(app)/credits/page.tsx:177`, and 0 of 22 EmptyState actions place a call. Check: review.
  - Don't: `<EmptyState size="compact" title="Nothing owed" action={<a href={`tel:${phone}`}>Call customer</a>} />`
  - Do: `<EmptyState size="compact" title="Nothing owed" action={<a href={whatsAppHref(phone)} target="_blank" rel="noopener noreferrer" className="text-sm font-medium text-primary hover:underline">WhatsApp</a>} />`

### Limits
- Not applicable: no break was measured this session. The description wraps inside `max-w-sm` (384px), and the longest real description, at `app/(app)/kitchen/ingredients.tsx:137`, was not measured at 390px.

## Accessibility
Rests on plain `div` and `p` elements. The title is a paragraph, not a heading, and the icon is `aria-hidden`. Contrast: NEEDS REVIEW, not measured this session.

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| Tab | Before the empty state | Skips the title, description and icon, which are not focusable, and lands on the caller's `action` when one is passed | The action | by hand |
| Enter | The caller's action | Runs it, such as clearing the filters | Stays on the action's position; after "Clear filters" the action unmounts as rows return and focus falls to the page body (finding in the run report) | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| Icon slot | none | Not applicable: decorative | `aria-hidden="true"` | Nothing | snapshot |
| Title | paragraph | Its text | Not applicable: no states | Read in order; not announced when it appears, because there is no live region (finding in the run report) | by hand |
| Description | paragraph | Its text | Not applicable: no states | Read after the title | by hand |
| Action | the caller's button or link | Its text | The caller's | Its name, such as "Clear filters, button" | snapshot |

## Tokens
| Part | State | Token |
|---|---|---|
| Icon | all | `--muted-foreground` |
| Title | all | `--foreground` |
| Description | all | `--muted-foreground` |
| Action, as call sites write it | all | `--primary` |

## Related
- DataTable: shows EmptyState in its `empty` slot after loading ends with no rows.
- SectionErrorBoundary: a section that crashed, rather than one with no data.
- StatusBadge: a single record's state, not a whole empty list.
