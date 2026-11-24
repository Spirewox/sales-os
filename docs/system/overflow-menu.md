# OverflowMenu

## Description
OverflowMenu holds the secondary and destructive actions of a page, a record or a row behind one `⋯` button, so the primary action can stand alone.

`import { OverflowMenu, type OverflowItem } from "@/components/app"`, source `components/app/overflow-menu.tsx`, status `ready-with-gaps`.
Foundation: `@base-ui/react` Menu, wrapped in `components/app/overflow-menu.tsx`. Traps checked: `trap/button-icon-name` (ARIA: the trigger's name comes from `label`), `trap/open-trigger-unfocused` (States, Open: `data-[popup-open]:bg-muted`), `trap/overlay-focus-return` (Keyboard: Base UI returns focus to the trigger, and a finding for menus whose item removes the row), `trap/menu-navigation` (Rules: `href` items render `Link` or `a`, and a finding for items that call `router.push`), `trap/menu-only-path` (Rules: the trigger is a visible button, never hover or right-click), `trap/menu-diagonal` n/a because OverflowMenu has no submenus, `trap/list-dead-gap` (Tokens: items pad with `py-1.5` and touch, the popup's `p-1` is outside them), `trap/escape-nested` (Keyboard: by hand inside EntityDrawer), `trap/exit-eats-input` n/a because the popup has no exit animation, `trap/scroll-chain` n/a because the longest menu, 7 items in `app/(app)/kitchen/job-panel.tsx:104`, never scrolls, `trap/touch-hover-flash` (Tokens: Tailwind 4 `hover:` applies only under `@media (hover: hover)`), `trap/loading-label-swap` (States, a finding: 4 items swap their label while pending), `trap/control-height` (Rules: the two sizes match the buttons beside them), `trap/weight-shift` n/a because no state changes weight, `trap/motion-transition-all` n/a because the trigger names `transition-colors`.

### Foundation
| Given by the foundation | Added by the team |
|---|---|
| `Menu.Root`, `Menu.Trigger`, `Menu.Portal`, `Menu.Positioner`, `Menu.Popup`, `Menu.Item`, `Menu.Separator`: open state, keyboard model, typeahead, focus return, ARIA wiring | One prop, `items: OverflowItem[]`, instead of composed parts, so every `⋯` in the app looks and orders the same |
| `Menu.Item` `render` prop | Items with `href` render Next `Link` for in-app paths and `a` with `target="_blank"` and `rel="noopener noreferrer"` when `external` is set or the path does not start with `/` |
| `Menu.Positioner` placement | Fixed `align="end"` and `sideOffset={4}`, so the popup lines up with the trigger's right edge |
| Nothing for empty menus | Items with `hidden` drop out, and the component returns null when none are left |
| Nothing for item order | Destructive items move last, after a `Menu.Separator`, in `text-destructive` |
| Nothing for trigger size | `size` of `default` (36px) or `sm` (32px), and `label` (default "More actions") as the trigger's `aria-label` and `title` |

## Examples
Default: `docs/system/examples/overflow-menu/default.tsx`.

Real uses, 25 call sites (`rg -n "<OverflowMenu\b" app components lib --glob '!components/app/**'`):
- Page headers, default size: Sales `app/(app)/sales/page.tsx:103`, Inventory `app/(app)/inventory/page.tsx:210`, Customers `app/(app)/customers/page.tsx:154`, Audit trail `app/(app)/audit/page.tsx:174`, POS `app/(app)/pos/page.tsx:78`, Dashboard phones `app/(app)/_dashboard/dashboard-content.tsx:93` and wider `app/(app)/_dashboard/dashboard-content.tsx:101`.
- Drawer and panel headers: customer `app/(app)/customers/customer-detail-panel.tsx:121` (sm), sale `app/(app)/sales/sale-detail-panel.tsx:103` (sm), supplier `app/(app)/suppliers/supplier-drawer.tsx:77`, product `app/(app)/inventory/product-drawer.tsx:90`, job `app/(app)/kitchen/job-panel.tsx:102`, location `app/(app)/settings/locations-section.tsx:163`, customer credit `components/credits/customer-credit-sheet.tsx:115`.
- Table rows, all `sm`: customers `app/(app)/customers/customer-columns.tsx:105`, suppliers `app/(app)/suppliers/supplier-columns.tsx:125`, stock `app/(app)/inventory/stock-tab.tsx:130`, requests `app/(app)/inventory/requests-tab.tsx:120`, feedback `app/(app)/engagement/feedback-table.tsx:105`, churn `app/(app)/engagement/churn.tsx:162`, tills `app/(app)/pos/tills.tsx:77`, roles matrix `app/(app)/settings/roles-matrix.tsx:54` (with `className="size-6 border-0 bg-transparent"`).
- Section and settings menus: kitchen jobs export `app/(app)/kitchen/jobs.tsx:212`, roles reset `app/(app)/settings/roles-section.tsx:129`, the settings list wrapper `app/(app)/settings/settings-ui.tsx:25` (sm).

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/overflow-menu/default.tsx` | default | Customers header menu at the default 36px size with import, template and export items |
| Not applicable: `default` is the size `default.tsx` shows | size=default | none |
| `docs/system/examples/overflow-menu/size-sm.tsx` | size=sm | Row menu at 32px for one supplier, named after the record, with Edit and a destructive Deactivate |
| `docs/system/examples/overflow-menu/destructive.tsx` | state:destructive | Job menu, then Archive and Cancel job after the separator in destructive text |
| `docs/system/examples/overflow-menu/item-disabled.tsx` | state:item-disabled | Audit trail menu whose only item is disabled because the page has no rows to export |
| `docs/system/examples/overflow-menu/item-link.tsx` | state:item-link | Job menu whose Open client quote item is a link that opens in a new tab |
| `docs/system/examples/overflow-menu/all-hidden.tsx` | state:all-hidden | Request row for someone who did not raise the request, the only item hidden so nothing renders |
| Not applicable: open, hover and highlighted are pointer and keyboard states of any example, opened by hand | state:open | none |
| `docs/system/examples/overflow-menu/in-page-header.tsx` | composition:PageHeader | Sales page header, one primary button and the overflow menu as the last control |

## Variants

### size
- `default`: 36px square trigger (`size-9`), for page headers and drawer headers, beside 36px buttons. Used at 14 call sites.
- `sm`: 32px square trigger (`size-8`), for table rows and settings lists, beside the 32px `RowAction`. Used at 11 call sites.

## States
| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Rest | Menu closed | Press the trigger | `⋯` icon in a bordered square, `title` tooltip with the label on pointer rest | screenshot |
| Hover | Pointer over the trigger, hover-capable devices only | Press | Pointer only, color change | by hand |
| Focus visible | Keyboard focus on the trigger | Enter, Space or Down Arrow to open | 2px outline in `--ring` | by hand |
| Open | Trigger pressed or opened by key | Move through items, select one, close with Escape or an outside press | Popup under the trigger, right edges aligned; trigger keeps the `bg-muted` fill; `aria-expanded="true"` | by hand |
| Item highlighted | Pointer over an item, or arrow keys | Select it with Enter or a press | `data-highlighted` fill behind the row | by hand |
| Item disabled | `disabled: true`, such as Export on an empty pilot page at `app/(app)/audit/page.tsx:179` | Nothing: the item takes no selection | 50% opacity, `aria-disabled="true"`, `data-disabled` | by hand |
| Destructive | `destructive: true` on 14 items across 10 menus | Select it, which opens a confirm at 13 of 14 | Listed last, after a separator line | screenshot |
| Item link | `href` set, `app/(app)/kitchen/job-panel.tsx:107` | Open it, or open it in a new tab from the browser | Renders `a`; `external` adds `target="_blank"` | by hand |
| All hidden | Every item has `hidden: true`, such as the request row at `app/(app)/inventory/requests-tab.tsx:120` for someone else's request | Nothing | No trigger renders at all | by hand |
| Item pending | A call site sets the label to "Exporting…" or "Preparing template…" and `disabled` while a file builds, `app/(app)/customers/page.tsx:159` | Wait | Label text changes and the item dims (`trap/loading-label-swap`, see findings) | by hand |

### State precedence
- Open and Hover: Open wins. The trigger keeps the open fill when the pointer leaves.
- Open and Focus visible: both show. Focus moves into the popup and the trigger keeps its open fill.
- Item highlighted and Item disabled: Item disabled wins. The row dims and a press does nothing.
- Destructive and Item highlighted: both show. Destructive text on the `bg-destructive/10` fill.
- Destructive and Item disabled: both show. Destructive text at 50% opacity.
- Item pending and Item disabled: both show. The call site sets both at once.
- All hidden and any other state: All hidden wins. Nothing renders, so no other state can be reached.

### Motion
| Trigger | Kind | Preset | Properties | Reduced motion |
|---|---|---|---|---|
| Trigger rest to hover, and rest to open | announce | `transition-colors`, Tailwind default 150ms | background-color, color | Same: a color change has no movement to remove |
| Popup closed to open, and open to closed | announce | None: the popup mounts and unmounts with no enter or exit animation | none | Same |

## Props
gen-docs writes the table from the props type and `OverflowItem`.
- `items` is the whole menu. Order inside each group is the array order; destructive items always follow the rest.
- `label` defaults to "More actions" and becomes the trigger's `aria-label` and `title`.
- `size` is `default` or `sm`.
- `className` lands on the trigger. One call site uses it to shrink the trigger to 24px with no border.
- Each `OverflowItem` takes `onSelect` or `href`, not both; `external` only matters with `href`; `hidden` removes the item; items are keyed by `label`, so two items with the same label collide (finding).

## Usage

### When to use
- A page, drawer or row has actions beyond its one primary action, such as Import, Export, Template, Edit, Duplicate or Refresh
- A record has destructive actions (Void, Deactivate, Delete, Archive, Cancel) that should sit behind one more press than the everyday ones

### When not to use
- The action is the page's or record's main next step, such as Record sale or Add customer. Use Button instead, in PageHeader `actions`
- The person picks one value from a set, such as a period or a location. Use Segmented instead, or PeriodSelect and LocationSelect
- A row has 1 or 2 everyday actions that people use on most visits. Use DataTable's `RowAction` instead, shown inline in the row

### Rules
- `rule/overflow-menu-destructive-confirm`: When an item has `destructive: true`, its `onSelect` opens ConfirmDialog naming the record instead of acting at once, because the menu closes on select and nothing offers an undo. Evidence: app 13/14 destructive items confirm first, through ConfirmDialog, a confirm panel or `window.confirm`, and the stray `app/(app)/inventory/requests-tab.tsx:128` cancels the request at once. Check: review.
  - Don't: `<OverflowMenu items={[{ label: 'Cancel request', destructive: true, onSelect: () => cancelRequest.mutateAsync(r._id) }]} />`
  - Do: `<OverflowMenu items={[{ label: 'Cancel request', destructive: true, onSelect: () => confirm('cancelRequest', r._id) }]} />`
- `rule/overflow-menu-size-by-place`: When the menu sits in a table row or a settings list, pass `size="sm"`, and in a page header use the default size instead, because the trigger then matches the controls beside it: 32px `RowAction` in rows and 36px (`h-9`) buttons in headers. Evidence: app 8/8 table-row menus pass `size="sm"`, app 7/7 page-header menus use the default size. Check: review.
  - Don't: `<DataTable columns={[{ id: 'actions', header: '', cell: (s) => <OverflowMenu label={`Actions for ${s.name}`} items={items(s)} /> }]} />`
  - Do: `<DataTable columns={[{ id: 'actions', header: '', cell: (s) => <OverflowMenu size="sm" label={`Actions for ${s.name}`} items={items(s)} /> }]} />`
- `rule/overflow-menu-hidden-flag`: When an item depends on a permission or the record's state, set `hidden` on it instead of building the array with conditions, because OverflowMenu then returns null when nothing is left and no empty `⋯` reaches the screen. Evidence: app 18/25 call sites gate items with `hidden`, and none builds its `items` with a spread or `.filter()`; single use `components/app/overflow-menu.tsx:25`, the null return. Check: review.
  - Don't: `<OverflowMenu items={[...(canVoid ? [{ label: 'Void sale', destructive: true, onSelect: voidSale }] : [])]} />`
  - Do: `<OverflowMenu items={[{ label: 'Void sale', destructive: true, onSelect: voidSale, hidden: !canVoid }]} />`

### Content
- `rule/overflow-menu-record-label`: When the menu acts on one record, pass `label` as "Actions for {name}" or "More actions for {name}" instead of leaving the default "More actions", because in a table every trigger would otherwise share one accessible name. Evidence: app 10/11 per-record menus in rows and drawers name the record in `label`, and the stray `app/(app)/inventory/requests-tab.tsx:122` reads "More request actions" in every row. Check: review.
  - Don't: `<OverflowMenu size="sm" items={items(r)} />`
  - Do: `<OverflowMenu size="sm" label={`Actions for ${r.name}`} items={items(r)} />`
- `rule/overflow-menu-item-sentence-case`: When writing an item `label`, use sentence case, such as "Export sales" or "Void sale", instead of Title Case, because the label is the item's only name and the app's labels are sentence case (`app/globals.css:10`). Evidence: app 25/25 call sites use sentence-case item labels. Check: review.
  - Don't: `<OverflowMenu items={[{ label: 'Export Sales', onSelect: exportSales }]} />`
  - Do: `<OverflowMenu items={[{ label: 'Export sales', onSelect: exportSales }]} />`

### Anti-slop
- `rule/overflow-menu-no-hand-menu`: When a screen needs a `⋯` menu, render `OverflowMenu` instead of composing `DropdownMenu` or Base UI `Menu` with a `MoreHorizontal` trigger, because the hand-built one skips the hidden-item filter, the destructive group and the trigger sizes. Evidence: app 25/25 `⋯` menus outside `components/app/` render OverflowMenu, and `rg -n "MoreHorizontal|DropdownMenu" app components lib` finds no other. Check: lint `rg -n "MoreHorizontal" app components lib --glob '!components/app/overflow-menu.tsx'` prints nothing.
  - Don't: `<DropdownMenu><DropdownMenuTrigger><MoreHorizontal /></DropdownMenuTrigger><DropdownMenuContent>{items}</DropdownMenuContent></DropdownMenu>`
  - Do: `<OverflowMenu label="More sales actions" items={items} />`
- `rule/overflow-menu-primary-outside`: When an action is the page's or record's main next step, render it as a `Button` beside the menu instead of as the menu's first item, because inside the menu it takes 2 presses and gives no visible cue. Evidence: app 8/8 page headers with a primary keep it in PageHeader `actions`, and `docs/restoration/kitchen-pos-settings-audit.md` keeps the job's advance step as the primary button with the rest in the `⋯` menu. Check: review.
  - Don't: `<OverflowMenu items={[{ label: 'Record sale', onSelect: openSale }, { label: 'Export sales', onSelect: exportSales }]} />`
  - Do: `<PageHeader title="Sales" actions={<Button onClick={openSale}>Record sale</Button>} overflow={<OverflowMenu items={[{ label: 'Export sales', onSelect: exportSales }]} />} />`

### Limits
- Not applicable: no break was measured this session. The longest menu holds 7 items (`app/(app)/kitchen/job-panel.tsx:104`) and the popup has no max height; a probe on a 320px-tall screen is listed in the report.

## Accessibility
Rests on the `@base-ui/react` Menu. The trigger is a `button`; the popup is a menu in a portal.

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| Enter or Space | Trigger | Opens the menu | First item | by hand |
| Down Arrow | Trigger | Opens the menu | First item | by hand |
| Down Arrow and Up Arrow | An item | Moves the highlight, skipping hidden items | Next or previous item | by hand |
| Home and End | An item | Jumps to the first or last item | That item | by hand |
| A letter | An item | Typeahead to the next item whose label starts with it | That item | by hand |
| Enter | An item | Runs `onSelect` or follows `href`, then closes | Trigger, unless the action opens a dialog, which takes focus | by hand |
| Escape | An item | Closes the menu only, even inside EntityDrawer | Trigger | by hand |
| Tab | An item | Closes the menu | Next control after the trigger | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| Trigger | button | `label` through `aria-label` (default "More actions") | `aria-haspopup="menu"`, `aria-expanded` | "{label}, button, collapsed" on focus, "expanded" when open | by hand |
| Popup | menu | none | Set by Base UI, nothing added by the app | "menu" on open, then the highlighted item | by hand |
| Item | menuitem | its `label` text; the icon is decoration | `aria-disabled` when disabled | "{label}, menu item", with "dimmed" or "unavailable" when disabled | by hand |
| Separator | separator | none | none | Nothing, or "separator" in some readers | by hand |
| Trigger icon | none | none | `aria-hidden` | Nothing | by hand |

Contrast: NEEDS REVIEW. Destructive text on `bg-destructive/10` was not measured in either theme this session.

## Tokens
| Part | State | Token |
|---|---|---|
| Trigger | rest | `--card` fill, `--border` edge, `--muted-foreground` icon, `rounded-md` |
| Trigger | hover, open | `--muted` fill, `--foreground` icon |
| Trigger | focus visible | `--ring`, 2px outline |
| Popup | open | `--popover`, `--popover-foreground`, `shadow-md`, `ring-foreground/10`, `rounded-lg`, `min-w-44` |
| Item | highlighted | `--muted` |
| Item | destructive | `--destructive` text, `bg-destructive/10` when highlighted |
| Item | disabled | `opacity-50` |
| Separator | all | `--border` |

## Related
- PageHeader: holds the page's menu in `overflow`, after the primary action.
- DataTable: its `RowAction` shows 1 or 2 everyday row actions inline, with OverflowMenu for the rest.
- ConfirmDialog: what a destructive item opens before it acts.
- EntityDrawer: holds a record's menu in its own `overflow` slot.
