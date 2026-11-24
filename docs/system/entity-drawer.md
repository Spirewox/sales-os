# EntityDrawer

## Description
EntityDrawer shows one record, such as a customer, sale, product or supplier, beside the list it was opened from, with that record's identity, key figures, actions and sections.

`import { EntityDrawer } from "@/components/app"`, source `components/app/entity-drawer.tsx`, status `ready-with-gaps`.
Foundation: `hand-rolled`, on the team's `ModalDialog` (`components/ui/modal-dialog.tsx`, a native `<dialog open>`). Traps checked: `trap/overlay-title` (ARIA), `trap/overlay-focus-return` (Keyboard, finding when the opener is gone), `trap/overlay-conditional-render` (States, accepted: callers mount it, no exit motion exists to break), `trap/escape-nested` (Keyboard), `trap/overlay-pending-dismiss` (States, Rules), `trap/overlay-destructive` (Rules: destructive actions sit in `overflow` and confirm through their own step), `trap/overlay-no-max-height` (States: full-height panel, body scrolls), `trap/native-control` (Foundation, finding: the close control is a raw `<button>`), `trap/button-icon-name` (ARIA), `trap/color-only-status` (States, finding on stat tones), `trap/touch-autofocus` (Keyboard, finding), `trap/scroll-chain` (finding: no page scroll lock), `trap/viewport-height` n/a because the panel is `h-full` of a `fixed inset-0` dialog and uses no `vh`, `trap/open-trigger-unfocused` n/a because the drawer is modal and covers its opener, `trap/exit-eats-input`, `trap/motion-origin`, `trap/motion-restart`, `trap/motion-blocks-input` and `trap/reduced-motion-ignored` n/a because the drawer has no motion of its own (the loading bars are Skeleton's, answered there), `trap/gesture-drag`, `trap/gesture-axes` and `trap/motion-input-lag` n/a because it has no drag or swipe.

### Foundation
| Given by the foundation | Added by the team |
|---|---|
| `ModalDialog`: native `<dialog open>` with `aria-modal`, Escape handled by the topmost open dialog only, backdrop click to close, focus moved in on open and back to the opener on close, `dismissible` | `align="end"` side sheet at `sm:max-w-xl` (`md`) or `sm:max-w-3xl` (`lg`), full height, left border and `shadow-xl` |
| `labelledBy` naming the dialog from a visible heading | A sticky header: `h2` title wired to `labelledBy` through `useId`, `status` slot, muted `subtitle`, a close button, then an actions row with `overflow` pushed to the end |
| Nothing for figures or sections | A `stats` grid (`dl`, 2 columns on phones, 3 or 4 from `sm`), `tabs` through `SectionTabs` (inline up to 3 visible tabs on phones, a select past that), and a `loading` body of three `Skeleton` bars in a status region |
| Not applicable: the close control | The close control is a raw `<button>` with an `X` icon (`components/app/entity-drawer.tsx:52`), not the system `Button`, so it misses Button's focus ring (`trap/native-control`, finding) |

## Examples
Default: `docs/system/examples/entity-drawer/default.tsx`.

Real uses, 17 call sites (`rg -n "<EntityDrawer(\s|/|>|$)" app components lib --glob '*.tsx' --glob '!components/app/**'`):
- Customers, customer drawer, opened from a list row, md, with stats and tabs: `app/(app)/customers/customer-detail-panel.tsx:107`
- Credits, customer credit sheet, lg: `components/credits/customer-credit-sheet.tsx:85`
- Inventory, request drawer, md: `app/(app)/inventory/request-drawer.tsx:27`
- Inventory, product drawer, lg, with tabs: `app/(app)/inventory/product-drawer.tsx:77`
- Kitchen, job form loading or failed shell, md: `app/(app)/kitchen/job-form.tsx:99`
- Kitchen, recipe loading or failed shell, md: `app/(app)/kitchen/recipes.tsx:110`
- Kitchen, recipe drawer, md: `app/(app)/kitchen/recipes.tsx:151`
- Kitchen, job loading or failed shell, lg: `app/(app)/kitchen/job-panel.tsx:41`
- Kitchen, job drawer, lg, locked while a confirm is open: `app/(app)/kitchen/job-panel.tsx:134`
- Audit, audit entry drawer, md or lg for bulk uploads: `app/(app)/audit/audit-drawer.tsx:47`
- Sales, sale drawer, lg, with tabs: `app/(app)/sales/sale-detail-panel.tsx:87`
- POS, transaction drawer, md: `app/(app)/pos/transaction-drawer.tsx:11`
- Engagement, compensation drawer, md: `app/(app)/engagement/compensation-drawer.tsx:39`
- Suppliers, supplier drawer, md, locked while an issue is being resolved: `app/(app)/suppliers/supplier-drawer.tsx:63`
- Settings, location drawer, md: `app/(app)/settings/location-drawer.tsx:25`
- Engagement, feedback drawer, md, locked while dirty: `app/(app)/engagement/feedback-drawer.tsx:65`
- Engagement, enquiry drawer, md, locked while the note differs from the saved one: `app/(app)/engagement/enquiry-drawer.tsx:38`

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/entity-drawer/default.tsx` | default | Customer drawer at the default md width, with a WhatsApp action, three stats and three tabs |
| Not applicable: `md` is the default width, shown by `default.tsx` | width=md | none |
| `docs/system/examples/entity-drawer/width-lg.tsx` | width=lg | Sale drawer at the lg width, used where a tab holds a line-item table |
| `docs/system/examples/entity-drawer/loading.tsx` | state:loading | Drawer whose record is still loading, three skeleton bars in a status region |
| `docs/system/examples/entity-drawer/locked.tsx` | state:locked | Enquiry drawer holding an unsaved note, so Escape and a backdrop click do nothing |
| `docs/system/examples/entity-drawer/with-overflow-menu.tsx` | composition:OverflowMenu | Product drawer with one primary action up top and Edit and Deactivate in the overflow menu |

## Variants

### width
- `md`: the default. A record read as fields and short lists, such as a customer, supplier or enquiry. Used at 11 call sites by omission, plus `audit-drawer.tsx` for a single entry.
- `lg`: a record whose main tab holds a multi-column table, such as a sale's line items or a product's batches. Used at 5 call sites, plus `audit-drawer.tsx` for bulk uploads.

## States
| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Open | The caller mounts it, usually from a list row click | Read, run an action, switch tabs, close with the close button, Escape or a backdrop click | A full-height panel at the right edge with the record's title as an `h2`, `aria-modal="true"` | by hand |
| Loading | `loading` is true (0 call sites). Real screens reach it another way: title "Loading job…" with `PanelSkeleton` as children (`app/(app)/kitchen/job-panel.tsx:41`) | Close | Three skeleton bars in `role="status"` named "Loading", or the "Loading {object}…" title | by hand |
| Load failed | The caller's query failed: title "Job unavailable" with `ErrorPanel` as children (`app/(app)/kitchen/job-panel.tsx:41`) | Retry from the error panel, or close | The title text "Job unavailable" and the error message | by hand |
| Locked | `dismissible={false}`, set by callers while text is unsaved or a confirm is open (4 call sites) | Work in the drawer. Escape and a backdrop click do nothing. The close button still calls `onClose` | No visible cue. The drawer stays open on Escape | by hand |
| Stat in state | A stat with `tone` `good`, `warning` or `danger` | Read it | Nothing on the value besides color. The stat label names the figure and the header's StatusBadge names the state in text (`trap/color-only-status`, finding) | by hand |
| Long title | A title or subtitle wider than the header | Read the start of it | Truncated with an ellipsis on one line | by hand |
| Long body | Content taller than the viewport | Scroll the body. The header stays put | The header is `sticky top-0`, the body is `overflow-y-auto` | by hand |

### State precedence
- Loading and locked: both show. The skeleton fills the body and Escape still does nothing.
- Loading and stats or tabs: both show. Stats and tabs render above the skeleton, so a caller that passes stats before the record loads shows them with placeholder values such as "…".
- Locked and a close button press: the close button wins. `onClose` runs and unsaved text is lost unless the caller's `onClose` guards it (finding).
- Locked and a nested ModalDialog such as ConfirmDialog: the nested dialog wins Escape, because only the topmost open ModalDialog handles it.
- Stat in state and long title: both show.

### Motion
Not applicable: no motion. The drawer appears and leaves at once. The loading bars pulse through Skeleton, whose spec covers that motion.

## Props
gen-docs writes the table from `EntityDrawerProps` in `components/app/entity-drawer.tsx`.
- `dismissible`: defaults to `true`. Callers compute it from their own dirty state, such as `dismissible={!dirty}`.
- `loading`: replaces the children with skeleton bars. No call site passes it today.
- `actions`: the JSDoc names "Call" as an example action. Customers are contacted by WhatsApp only, so the example is wrong for customer drawers (finding).

## Usage

### When to use
- Someone opens one record from a list or table and needs its figures, actions and history without leaving the list.
- A record has two or more sections that each hold a list, such as Purchases and Credit for a customer.

### When not to use
- The person is creating or editing a record through a form with a submit. Use FormSheet instead.
- The person confirms one destructive step, such as voiding a sale. Use ConfirmDialog instead.

### Rules
- `rule/entity-drawer-dismissible-dirty`: When the drawer holds typed text that is not saved yet, pass `dismissible` computed from that state, such as `dismissible={!dirty}`, instead of the default `true`, because an Escape or a backdrop click would close the drawer and drop the text. Evidence: app 4/5 drawers with in-drawer text entry pass it, `app/(app)/engagement/enquiry-drawer.tsx:40`, `app/(app)/engagement/feedback-drawer.tsx:67`, `app/(app)/suppliers/supplier-drawer.tsx:65`, `app/(app)/kitchen/job-panel.tsx:137`, stray `app/(app)/sales/sale-detail-panel.tsx:87` (edit mode with no `dismissible`). Check: review.
  - Don't: `<EntityDrawer onClose={onClose} title={enquiry.subject}><textarea value={note} onChange={(e) => setNote(e.target.value)} /></EntityDrawer>`
  - Do: `<EntityDrawer onClose={onClose} dismissible={note === saved} title={enquiry.subject}><textarea value={note} onChange={(e) => setNote(e.target.value)} /></EntityDrawer>`
- `rule/entity-drawer-destructive-overflow`: When a drawer action deletes, voids, cancels or deactivates the record, put it in `overflow` as an `OverflowMenu` item with `destructive: true` instead of in `actions`, because the actions row holds the frequent task and one slip there would destroy the record. Evidence: app 4/4 drawers with a destructive action put it in the overflow menu, `app/(app)/kitchen/job-panel.tsx:110`, `app/(app)/suppliers/supplier-drawer.tsx:82`, `app/(app)/sales/sale-detail-panel.tsx:108`, found by `rg -n "destructive: true"` over the 17 call-site files. Check: review.
  - Don't: `<EntityDrawer onClose={onClose} title="Sale S-10482" actions={<RowAction onClick={voidSale}>Void sale</RowAction>}>{body}</EntityDrawer>`
  - Do: `<EntityDrawer onClose={onClose} title="Sale S-10482" overflow={<OverflowMenu items={[{ label: 'Void sale', destructive: true, onSelect: askToVoid }]} />}>{body}</EntityDrawer>`

### Content
- `rule/entity-drawer-loading-title`: When the record has not loaded, the title reads "Loading {object}…", and when it failed it reads "{Object} unavailable", instead of an empty title or the record id, because the title is the dialog's accessible name and is all a screen reader hears on open. Evidence: app 3/3 loading shells, `app/(app)/kitchen/job-form.tsx:99`, `app/(app)/kitchen/recipes.tsx:110`, `app/(app)/kitchen/job-panel.tsx:41`. Check: review.
  - Don't: `<EntityDrawer onClose={onClose} title="">{spinner}</EntityDrawer>`
  - Do: `<EntityDrawer onClose={onClose} title={job.isError ? 'Job unavailable' : 'Loading job…'}>{body}</EntityDrawer>`

### Anti-slop
- `rule/entity-drawer-whatsapp-not-call`: When the drawer shows a customer, put a "WhatsApp" action that opens `whatsappHref(phone)` in `actions` instead of a "Call" action on `tel:`, because customers are contacted by WhatsApp only and Call buttons were taken off every customer screen. Evidence: app 2/2 customer drawers carry WhatsApp and no Call, `app/(app)/customers/customer-detail-panel.tsx:114`, `components/credits/customer-credit-sheet.tsx:109`, the removal is the first left-out row of `docs/restoration/README.md`. Check: review, plus `rg -n "tel:" app/(app)/customers components/credits`.
  - Don't: `<EntityDrawer onClose={onClose} title="Mama Put Kitchen" actions={<RowAction href="tel:08031234567">Call</RowAction>}>{body}</EntityDrawer>`
  - Do: `<EntityDrawer onClose={onClose} title="Mama Put Kitchen" actions={<RowAction href={whatsappHref(phone)} external>WhatsApp</RowAction>}>{body}</EntityDrawer>`
- `rule/entity-drawer-stat-tone-state`: When a stat's value is not in a real state (overdue, out, low, pending), leave `tone` unset instead of setting `tone: 'good'` to make a figure stand out, because status colour is kept for state and one green accent. Evidence: app 8/8 stat tones in the call sites are conditions on state, such as `tone: overdue ? 'danger' : 'default'` at `app/(app)/customers/customer-detail-panel.tsx:130` and `tone: openIssues > 0 ? 'warning' : 'default'` at `app/(app)/suppliers/supplier-drawer.tsx:46`, found by `rg -n "tone: "` over the call-site files. Check: review.
  - Don't: `<EntityDrawer onClose={onClose} title="Mama Put Kitchen" stats={[{ label: 'Lifetime spend', value: '₦1,240,000', tone: 'good' }]}>{body}</EntityDrawer>`
  - Do: `<EntityDrawer onClose={onClose} title="Mama Put Kitchen" stats={[{ label: 'Outstanding', value: '₦45,000', tone: overdue ? 'danger' : 'default' }]}>{body}</EntityDrawer>`

### Limits
Not applicable: no limit was measured this session. The tab count where tabs turn into a select on phones (3) is a constant in `components/app/entity-drawer.tsx:76`, not a measured break, so it stays out of Limits until a probe at 390px measures it.

## Accessibility
Rests on the team's `ModalDialog`, a native `<dialog>` opened with the `open` attribute rather than `showModal()`, so toasts stay above it. The page behind is not inert.

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| None (open) | The opener, such as a table row | The drawer mounts | The first text field in the panel, else the first focusable control, which is the close button. On touch this still focuses a field and raises the keyboard (`trap/touch-autofocus`, finding) | by hand |
| Tab | Inside the drawer | Moves through the close button, actions, overflow, tabs and body | The next control. After the last one focus leaves into the page behind, since `open` does not trap focus (finding) | by hand |
| Escape | Inside the drawer, `dismissible` true | Closes the drawer | The opener, if it is still in the page. If the opener unmounted, focus falls to the page body (`trap/overlay-focus-return`, finding) | by hand |
| Escape | Inside an open select or combobox in the drawer | Closes that popup only | The popup's trigger | by hand |
| Escape | Inside the drawer, `dismissible` false | Nothing | Stays | by hand |
| Enter or Space | Close button | Calls `onClose`, even when not dismissible | The opener | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| Panel | dialog (native `<dialog>`) | The `h2` title through `aria-labelledby` and `useId` | `aria-modal="true"` | The title and "dialog" on open | by hand |
| Close button | button | `aria-label="Close"`, the `X` icon is `aria-hidden` | None | "Close, button" | by hand |
| Backdrop | button, out of the tab order (`tabIndex={-1}`) | `aria-label="Close dialog"` | None | Reachable by a screen reader's virtual cursor only | by hand |
| Stats | description list (`dl`, `dt`, `dd`) | Each `dt` label | None | Label then value per stat | by hand |
| Loading body | status | `aria-label="Loading"` | Polite live region | "Loading" when the bars mount | by hand |
| Tabs | tablist, or a select on phones past 3 tabs, through SectionTabs | `label="Record sections"` | Per SectionTabs | Per SectionTabs | by hand |

Contrast: NEEDS REVIEW. Stat values in `text-warning` on `bg-background` were not measured this session in either theme.

## Tokens
| Part | State | Token |
|---|---|---|
| Panel and header fill | all | `bg-background` (`--background`) |
| Panel left edge, header and stats rules | all | `border` (`--border`) |
| Stats grid hairlines | all | `bg-border` (`--border`) |
| Panel shadow | all | `shadow-xl` (Tailwind default, not a token) |
| Title | all | `text-foreground` (`--foreground`) |
| Subtitle, stat label, close icon | rest | `text-muted-foreground` (`--muted-foreground`) |
| Close button | hover | `bg-muted` (`--muted`), `text-foreground` |
| Stat value | tone default | `text-foreground` |
| Stat value | tone good | `text-primary` (`--primary`) |
| Stat value | tone warning | `text-warning` (`--warning`) |
| Stat value | tone danger | `text-destructive` (`--destructive`) |
| Backdrop (ModalDialog) | open | `bg-background/80` with `backdrop-blur-sm` |
| Loading bars | loading | Skeleton's `bg-muted/80` |

## Related
- FormSheet: creating or editing a record through a form with a submit.
- ConfirmDialog: the one confirm step a destructive overflow item opens.
- OverflowMenu: holds the drawer's secondary and destructive actions.
- SectionTabs: the drawer's section switcher.
- StatusBadge: the `status` slot beside the title.
- Skeleton: the bars the `loading` body draws.
- DataTable: the list whose `onRowClick` opens the drawer.
- PageHeader: the page title and actions behind the drawer; a record opens here, not as a page section.
