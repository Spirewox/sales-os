# DataTable

## Description
DataTable lists records of one kind so someone can scan them, sort by a column, page through them and open one.

`import { DataTable, RowAction, type Column } from "@/components/app"`, source `components/app/data-table.tsx`, status `ready-with-gaps`.
Foundation: hand-rolled on the native `table` element, with `Skeleton` from `components/ui/skeleton.tsx`, `PaginationControls` from `components/ui/pagination-controls.tsx` and `FilterSelect` from `components/filter-select.tsx`. Traps checked: `trap/table-divs` (Accessibility), `trap/list-dead-gap` (Rules, `rule/data-table-row-padding`), `trap/narrow-hidden-nav` (Rules, `rule/data-table-mobile-slots`), `trap/numbers-shift` (Tokens and Rules, `rule/data-table-right-figures`), `trap/color-only-status` (Anti-slop, `rule/data-table-status-cell`), `trap/empty-value` (finding: cells are caller-rendered and no shared empty-value component exists, so blanks, dashes and "None" all occur; proposed gate in the run report), `trap/motion-blocks-input` (Motion: rows and actions only change colour, nothing enters), `trap/loading-layout-shift` (States: skeleton rows keep the header and column widths), `trap/loading-label-swap` n/a because RowAction has no pending state, `trap/submit-repeat` (finding: a RowAction that runs a request, such as Approve at `app/(app)/inventory/requests-tab.tsx:116`, has no pending block), `trap/disabled-drops-focus` n/a because RowAction has no disabled state, `trap/button-type` (RowAction and the sort and title buttons set `type="button"`), `trap/button-div` n/a because every control is a `button`, `a` or `Link`, `trap/link-as-button` (RowAction renders `Link` or `a` for `href` and `button` for `onClick`), `trap/button-label-wrap` (RowAction sets `whitespace-nowrap`), `trap/button-icon-name` (Accessibility: icons are `aria-hidden` and labels are text), `trap/control-height` (RowAction is `h-8`, 32px), `trap/icon-optical-size` and `trap/icon-optical-align` NEEDS REVIEW because no optical measurement ran this session, `trap/press-delayed` (Motion: colour only, Tailwind default duration).

### Foundation
| Given by the foundation | Added by the team |
|---|---|
| Native `table`, `thead`, `tbody`, `th scope="col"` and `ul` for phone cards | The whole component: one table for every list in the app, with card rows below 768px so a phone never scrolls sideways |
| `Skeleton` (`components/ui/skeleton.tsx`), a pulsing muted block | 6 skeleton rows on desktop and 4 on phones while `loading` is true and no rows exist yet, so the empty slot never flashes during a fetch |
| `PaginationControls` and `FilterSelect` | `TableFooter`: the rows-per-page picker, the "26 to 50 of 110" range and page buttons, hidden while loading, empty or on one page |
| Not applicable: no foundation sort or selection | Header sort buttons cycling descending, ascending, off; bulk selection with a sticky bar; the remembered page size per `label` (`hooks/use-page-size.ts`) |
| Not applicable: no foundation row button | `RowAction`, a 32px labelled row button that renders `Link`, `a` or `button` from `href` and `onClick` |

## Examples
Default: `docs/system/examples/data-table/default.tsx`.

Real uses, 35 call sites (`rg -n "<DataTable[\s/>]" app components lib -g '!components/app/**'`, the check's own pattern). Three more tags pass a type argument, `<DataTable<OverdueRow>`, `<DataTable<StockRow>` and `<DataTable<TicketRow>` at `app/(app)/_dashboard/needs-attention.tsx:48`, `app/(app)/_dashboard/needs-attention.tsx:63` and `app/(app)/_dashboard/needs-attention.tsx:80`, which the count misses, so 35 tables render in all.

- Credits, customers with credit, rows open the customer, WhatsApp and Record payment actions: `app/(app)/credits/page.tsx:177`
- Customers, server pages and server sort: `app/(app)/customers/page.tsx:219`
- Sales, server pages and sort, rows open the sale: `app/(app)/sales/page.tsx:168`
- Inventory stock, the one table with bulk selection: `app/(app)/inventory/stock-tab.tsx:231`
- Inventory movements and requests: `app/(app)/inventory/movements-tab.tsx:155`, `app/(app)/inventory/requests-tab.tsx:168`
- Suppliers list and a supplier's product performance (fixed 10 rows): `app/(app)/suppliers/page.tsx:234`, `app/(app)/suppliers/supplier-performance-tab.tsx:180`
- Engagement tables with row actions: `app/(app)/engagement/feedback-table.tsx:90`, `app/(app)/engagement/enquiry-table.tsx:84`, `app/(app)/engagement/compensation-table.tsx:55`, `app/(app)/engagement/churn.tsx:143`
- Kitchen: `app/(app)/kitchen/jobs.tsx:178` (server pages), `app/(app)/kitchen/ingredients.tsx:123`, `app/(app)/kitchen/recipes.tsx:74`, `components/kitchen-analytics-tab.tsx:124`
- POS: `app/(app)/pos/overview.tsx:77`, `app/(app)/pos/tills.tsx:70`, `app/(app)/pos/transactions.tsx:98`, `app/(app)/pos/shifts-reviews.tsx:60`, `app/(app)/pos/shifts-reviews.tsx:100`, `components/live-pos-panel.tsx:55` (fixed page size)
- Analytics tabs, rows from the Analytics page query: `app/(app)/analytics/customers-tab.tsx:152`, `app/(app)/analytics/sales-tab.tsx:217`, `app/(app)/analytics/credit-tab.tsx:127`, `app/(app)/analytics/inventory-tab.tsx:189`, `app/(app)/analytics/suppliers-tab.tsx:239`, `app/(app)/analytics/products-tab.tsx:132`, `app/(app)/analytics/products-tab.tsx:150`
- Settings and audit: `app/(app)/settings/locations-section.tsx:127`, `app/(app)/settings/users-section.tsx:149`, `app/(app)/audit/page.tsx:215`
- Dashboard needs attention, the three typed tables above

Prop use across the 32 counted tags, from the props of each `<DataTable` tag: `onRowClick` 24, `loading` 24, `empty` 28, `defaultSort` 22, `pageSize` 16, `rowActions` 14, `resetPageKey` 12, `pagination` 8, `manualSort` 3, `fixedPageSize` 2, `bulkActions` 1.

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/data-table/default.tsx` | default | Customers with credit, sortable, rows open a drawer, one WhatsApp action per row |
| Not applicable: `tone="default"` is RowAction's default and `default.tsx` shows it | tone=default | none |
| `docs/system/examples/data-table/tone-primary.tsx` | tone=primary | The row's main next step in the primary tone beside a default-tone action |
| `docs/system/examples/data-table/loading.tsx` | state:loading | First load: the header stays and skeleton rows hold the space, never the empty slot |
| `docs/system/examples/data-table/empty.tsx` | state:empty | Loaded with no rows: a compact EmptyState that names the filters behind it |
| `docs/system/examples/data-table/sorted.tsx` | state:sorted | Sorted by amount owed, largest first, with the arrow and aria-sort on the header |
| `docs/system/examples/data-table/selected.tsx` | state:selected | Rows picked for a bulk action, with the sticky bar and Clear selection |
| `docs/system/examples/data-table/paged.tsx` | state:paged | Server pages: rows are one page, the footer shows the range and page buttons |
| `docs/system/examples/data-table/in-overflow-menu.tsx` | composition:OverflowMenu | Row actions as the call sites write them: 1 or 2 labelled RowActions, the rest in an OverflowMenu |

## Variants

### tone
RowAction's only axis. DataTable itself has no variant prop: its modes come from which callbacks a call site passes (`onRowClick`, `rowActions`, `bulkActions`, `pagination`), counted under Examples.
- `default`: a secondary row action, such as WhatsApp, View, Edit or Transfer. Used at 19 RowAction call sites.
- `primary`: the one next step that moves the record forward, such as Record payment, Approve or Resolve. Used at 9 RowAction call sites with a literal, plus 1 that picks the tone from the record (`app/(app)/engagement/compensation-table.tsx:68`).

## States
| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Populated | `rows` has entries and the first load is done | Scan, sort, page, open a row, use row actions | The rows themselves; the footer range "1 to 25 of 110" when there is more than one page | screenshot |
| Loading | `loading` is true and `rows` is empty or `undefined` | Read the column headers; nothing else in the body | 6 skeleton rows on desktop and 4 on phones at the rows' height, `aria-hidden`; footer hidden | screenshot |
| Refreshing | `loading` is true and `rows` still holds the last result | Everything Populated allows | Nothing: the old rows stay with no busy cue (finding in the run report) | by hand |
| Empty | `loading` is false and no rows remain after filtering | Read why it is empty, take the EmptyState's action | The `empty` node, or the fallback text "Nothing to show."; footer hidden | screenshot |
| Load failed | The caller's query failed; DataTable has no error prop | Read the message the caller passes through `empty` | The caller's EmptyState text, such as "Couldn’t load churn" at `app/(app)/engagement/churn.tsx:174` | by hand |
| Sorted | A header button pressed, or `defaultSort` or `sort` set | Press again to flip to ascending, a third time to turn sorting off | Arrow up or down icon beside the header text, `aria-sort` on the `th`; idle sortable headers show a faint double arrow | snapshot |
| Row hover | Pointer over a row when `onRowClick` is set | Click anywhere on the row to open it | Pointer only, background change and `cursor-pointer`; the title text underlines on its own hover | by hand |
| Title focus | Tab reaches the title button of a clickable row | Enter or Space opens the record | Underline on the title text (`focus-visible:underline`) | by hand |
| Selected | A row checkbox ticked when `bulkActions` is set | Untick, tick the page, run a bulk action, Clear selection | Ticked checkbox and the sticky bar "{n} selected" with Clear selection | screenshot |
| Paged | More rows than the page size, or `pagination.totalPages` above 1 | Change page, change rows per page (unless `fixedPageSize`) | Footer range text, page buttons and the Rows per page picker | screenshot |
| Phone layout | Viewport below 768px (`md`) | The same actions; row actions sit on their own line under the title | Card rows from the `mobile` slots: title, subtitle, value, meta; columns with no `mobile` slot are not shown | screenshot |

### State precedence
- Loading and empty: loading wins. `isEmpty` needs `loading` false, so the empty slot never shows during the first fetch.
- Loading and populated: populated wins. With rows in hand the skeleton never replaces them, so a refetch shows the old rows with no cue.
- Loading and paged: loading wins. The footer hides while the skeleton shows.
- Empty and paged: empty wins. The footer hides, so no "0 to 0" range shows.
- Sorted and loading: both show. The header keeps its arrow over the skeleton rows.
- Selected and row hover: both show. The checkbox stays ticked; while the pointer is over the row the hover background shows instead of the selected tint.
- Selected and paged: both show. Selection is kept by row id across client pages, and the bar counts every selected row in the sorted list.
- Phone layout and any other state: both show. The phone list draws the same loading, empty and selected states with 4 skeleton cards.

### Motion
| Trigger | Kind | Preset | Properties | Reduced motion |
|---|---|---|---|---|
| Row hover in and out | announce | `transition-colors` (Tailwind default 150ms, no app preset) | background-color | same, colour only |
| RowAction hover in and out | announce | `transition-colors` (Tailwind default 150ms, no app preset) | background-color, border-color, color | same, colour only |
| Skeleton rows while loading | announce | `animate-pulse` with `skeleton-shimmer` | opacity | static muted blocks: `.skeleton-shimmer { animation: none }` under `prefers-reduced-motion: reduce` in `app/globals.css:299` |

## Props
gen-docs writes the tables for DataTable, RowAction and TableFooter from the types.
- `label` names the scroll region and the phone list for screen readers, and is the storage key for the remembered page size unless `pageSizeKey` is set.
- `rows` set to `undefined` with `loading` true is how 12 call sites write the first load. An empty array with `loading` false is the empty state.
- `empty` is shown only after loading ends with no rows. 22 of the 28 counted call sites that pass it pass `EmptyState` with `size="compact"`, and 6 pass a plain paragraph.
- `rowActions` returns the row's buttons: RowAction for labelled actions and OverflowMenu for the rest.
- `pagination` switches to server pages: `rows` is one page and the table stops slicing.
- `tone` on RowAction is `default` or `primary`.

## Usage

### When to use
- A screen lists records of one kind, such as customers, sales, stock or tills, that someone scans, sorts or opens
- A dashboard widget shows the top 5 or 10 records of a kind with a fixed page size

### When not to use
- A single number or a row of headline figures. Use KpiStrip instead
- A short list of a record's own history inside a drawer, such as price changes. Use EntityDrawer instead, with its own list
- Nothing to list yet and the whole section is empty. Use EmptyState instead, at `size="default"`

### Rules
- `rule/data-table-loading-prop`: When the rows come from a query, pass `loading={isLoading}` and `rows={data}` to DataTable instead of wrapping it in a spinner or a hand-made `Skeleton`, because the table keeps its header, draws 6 skeleton rows and holds back the empty slot until the fetch ends (`components/app/data-table.tsx:129`). Evidence: app 24/24 call sites with fetched rows pass `loading`, counted in the props of each `<DataTable` tag, and the 8 without it render rows handed down by a parent that shows its own loading state, such as the Analytics page. Check: review.
  - Don't: `{isLoading ? <Spinner /> : <DataTable label="Sales" columns={columns} rows={data} getRowId={(r) => r.id} />}`
  - Do: `<DataTable label="Sales" columns={columns} rows={data} loading={isLoading} getRowId={(r) => r.id} />`
- `rule/data-table-reset-page`: When the rows are filtered on the client, pass the active filters as `resetPageKey` instead of remounting the table with a `key`, because `resetPageKey` returns to page 1 and keeps the sort and selection, while a remount drops both. Evidence: app 12/14 client-filtered call sites pass `resetPageKey`, with strays `app/(app)/inventory/movements-tab.tsx:134` and `app/(app)/inventory/stock-tab.tsx:232` use `key` and are strays. Check: review.
  - Don't: `<DataTable key={filterKey} label="Stock movements" columns={columns} rows={rows} getRowId={(r) => r.id} />`
  - Do: `<DataTable resetPageKey={filterKey} label="Stock movements" columns={columns} rows={rows} getRowId={(r) => r.id} />`
- `rule/data-table-row-padding`: When a row needs more room or a divider, add padding inside the cells through `className` or `rowClassName` instead of a margin between rows, because the rows share `divide-y` borders and touch, so every pixel between two rows belongs to one of them and opens it. Evidence: principle heuristic: Fitts's law, the hit areas of adjacent rows touch with no dead gap (`trap/list-dead-gap`); app 32/32 call sites leave the row spacing to the component, and the 5 that pass `rowClassName` only mute, fade or tint the row. Check: review.
  - Don't: `<DataTable rowClassName={() => "mb-2"} label="Tills" columns={columns} rows={rows} getRowId={(r) => r.id} />`
  - Do: `<DataTable label="Tills" columns={[{ id: "name", header: "Till", cell: (r) => r.name, className: "py-4" }]} rows={rows} getRowId={(r) => r.id} />`
- `rule/data-table-mobile-slots`: When a column must stay visible on phones, give it a `mobile` slot (`title`, `subtitle`, `value` or `meta`) instead of leaving it out, because a column with no `mobile` slot is not drawn below 768px and nothing on screen says it is missing. Evidence: principle heuristic: visibility of system status, a hidden column leaves no cue (`trap/narrow-hidden-nav`), and 36 columns in 31 files already set `mobile: 'title'` (`grep -rln "mobile: 'title'" app components lib`). Check: review.
  - Don't: `{ id: "owed", header: "Owed", cell: (r) => money(r.owed), align: "right" }`
  - Do: `{ id: "owed", header: "Owed", cell: (r) => money(r.owed), align: "right", mobile: "value" }`
- `rule/data-table-right-figures`: When a column holds amounts, counts or percentages, set `align: "right"` on it instead of left-aligning figures, because right-aligned cells get `tabular-nums` (`components/app/data-table.tsx:202`), so digits line up down the column and do not jitter on re-sort. Evidence: principle platform: tabular figures in Geist, the visual rule "Figures use tabular-nums" in `app/globals.css:10`. Check: review.
  - Don't: `{ id: "owed", header: "Owed", cell: (r) => money(r.owed) }`
  - Do: `{ id: "owed", header: "Owed", cell: (r) => money(r.owed), align: "right", mobile: "value" }`
- `rule/data-table-whatsapp-contact`: When a row action contacts a customer, render `RowAction` with a WhatsApp `href`, `external` and the label "WhatsApp" instead of a `tel:` link labelled "Call", because customers are reached by WhatsApp only in this product. Evidence: app 2/2 customer-contact row actions use WhatsApp, `app/(app)/_dashboard/needs-attention.tsx:56` and `app/(app)/credits/page.tsx:190`, and the one `tel:` RowAction, `app/(app)/suppliers/supplier-drawer.tsx:72`, calls a supplier and is in the run report. Check: review.
  - Don't: `<RowAction href={`tel:${r.phone}`}>Call</RowAction>`
  - Do: `<RowAction href={whatsAppHref(r.phone)} external ariaLabel={`WhatsApp ${r.customerName}`}>WhatsApp</RowAction>`

### Content
- `rule/data-table-label-noun`: When setting `label`, write what the rows are as a sentence-case plural noun phrase, such as "Customers with credit" or "Stock movements", instead of a verb or "Table", because `label` is the accessible name of the scroll region and the phone list, and the key of the remembered page size. Evidence: app 32/32 call sites pass a noun phrase in sentence case, read from the `label=` values in the props of each `<DataTable` tag. Check: review.
  - Don't: `<DataTable label="Table" columns={columns} rows={rows} getRowId={(r) => r.id} />`
  - Do: `<DataTable label="Customers with credit" columns={columns} rows={rows} getRowId={(r) => r.id} />`
- `rule/data-table-action-verb`: When a RowAction has a visible label, write a sentence-case verb or verb phrase of 1 to 3 words, such as "Record payment", "Approve" or "View tills", instead of an icon alone, because the label is the button's only name unless `ariaLabel` is set. Evidence: app 28/29 RowAction tags carry a literal text label of 1 to 3 words and the 29th renders `next.label` from data, from each `<RowAction` tag in app, components and lib. Check: review.
  - Don't: `<RowAction onClick={pay}><Wallet aria-hidden /></RowAction>`
  - Do: `<RowAction tone="primary" onClick={pay}><Wallet aria-hidden /> Record payment</RowAction>`

### Anti-slop
- `rule/data-table-empty-compact`: When the table can end up with no rows, pass `empty={<EmptyState size="compact" title={...} description={...} />}` instead of leaving the fallback "Nothing to show.", because the fallback names neither the filter behind the empty result nor the way out. Evidence: app 22/32 call sites pass `empty` with a compact EmptyState, and the 3 typed tables at `app/(app)/_dashboard/needs-attention.tsx:48` do too, with 10 strays: 4 pass nothing (`app/(app)/analytics/inventory-tab.tsx:189`, `app/(app)/analytics/products-tab.tsx:150`, `app/(app)/analytics/suppliers-tab.tsx:238`, `app/(app)/suppliers/supplier-performance-tab.tsx:180`) and 6 pass a plain paragraph (`app/(app)/analytics/credit-tab.tsx:127`, `app/(app)/analytics/customers-tab.tsx:152`, `app/(app)/analytics/products-tab.tsx:132`, `app/(app)/analytics/sales-tab.tsx:217`, `components/kitchen-analytics-tab.tsx:124`, `components/live-pos-panel.tsx:55`). Check: review.
  - Don't: `<DataTable label="Suppliers" columns={columns} rows={rows} getRowId={(r) => r.id} />`
  - Do: `<DataTable label="Suppliers" columns={columns} rows={rows} getRowId={(r) => r.id} empty={<EmptyState size="compact" title="No suppliers match" description="Clear the filters to see every supplier." />} />`
- `rule/data-table-status-cell`: When a column shows a record's state, such as Paid, Overdue or Low, render `StatusBadge` in the cell instead of coloured text, because the badge carries the state word and its tone from one table, and colour alone does not tell the state. Evidence: principle wcag: 1.4.1 Use of colour, the badge text carries the state. Check: review.
  - Don't: `{ id: "status", header: "Status", cell: (r) => <span className="text-destructive">{r.status}</span> }`
  - Do: `{ id: "status", header: "Status", cell: (r) => <StatusBadge domain="payment" status={r.status} />, mobile: "meta" }`

### Limits
- Not applicable: no break was measured this session. The JSDoc cap of 2 labelled row buttons plus an OverflowMenu (`components/app/data-table.tsx:37`) has no measurement behind it, so it goes to the run report as a proposed gate with the app's current maximum, 2, as its default.

## Accessibility
Rests on the native `table` element with `th scope="col"` and `aria-sort`, a native `ul` for phone cards, and native `button`, `a` and checkbox `input` elements. Contrast: NEEDS REVIEW, not measured this session.

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| Tab | Before the table | Moves to the scroll region (`tabIndex={0}`), then into header sort buttons, title buttons, checkboxes and row actions in reading order | The next control | by hand |
| Left and Right Arrow | Scroll region, on a table wider than its box | Scrolls the table sideways | Scroll region | by hand |
| Enter or Space | Sort button in a header | Sorts descending, then ascending, then off | Same sort button | by hand |
| Enter or Space | Title button of a clickable row | Calls `onRowClick`, which opens the record's drawer at every call site | Into the drawer, which EntityDrawer manages | by hand |
| Space | Row or page checkbox | Ticks or unticks; the bulk bar appears at the first tick | Same checkbox | by hand |
| Enter | RowAction | Runs the action or follows the link | Where the action sends it; a new tab for `external` | by hand |
| Enter or Space | Page buttons and the Rows per page picker in the footer | Changes page or page size; page size also returns to page 1 | Same control | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| Scroll box | region | `aria-label` from `label` | `tabIndex=0` | "Customers with credit, region" on entry | snapshot |
| Table | table | Not applicable: inside the named region | Native rows and cells | Row and column counts by the screen reader | snapshot |
| Header cell | columnheader | Its text | `aria-sort="ascending"` or `"descending"` on the sorted column only | The sort direction when the sorted column is read | snapshot |
| Sort button | button | Header text; the arrow icon is `aria-hidden` | Not applicable: no pressed state | The header text only, nothing says it sorts | by hand |
| Actions header | columnheader | `sr-only` text "Actions" | Not applicable: no states | "Actions" | snapshot |
| Skeleton rows | none | Not applicable: `aria-hidden` | `aria-hidden="true"` | Nothing: loading is silent (finding in the run report) | by hand |
| Row checkbox | checkbox | `aria-label` "Select row"; the page box reads "Select all on this page" | `checked` | "Select row, checkbox", the same on every row (finding in the run report) | snapshot |
| Phone list | list | `aria-label` from `label` | Not applicable: no states | List name and item count | snapshot |
| Footer range | status text | Its text | `aria-live="polite"` | "26 to 50 of 110" after a page change | by hand |
| RowAction | link or button | Its text, or `ariaLabel` when set | Not applicable: no states | The label, such as "WhatsApp Mama Put Kitchen, link" | snapshot |

## Tokens
| Part | State | Token |
|---|---|---|
| Frame | all | `--card` |
| Frame and row dividers | all | `--border` |
| Header row | all | `--muted` at 40% |
| Header text | all | `--muted-foreground` |
| Sorted header text | sorted | `--foreground` |
| Row | hover | `--muted` at 40% |
| Row | selected | `--accent` at 60% |
| Bulk bar | selected | `--accent` |
| Checkbox | checked | `--primary` |
| Skeleton | loading | `--muted` at 80% |
| Footer text | all | `--muted-foreground` |
| RowAction default | all | `--background`, `--border` |
| RowAction default | hover | `--muted` |
| RowAction primary | all | `--primary` text, `--primary` at 30% border, `--primary` at 5% fill |
| RowAction primary | hover | `--primary` at 10% fill |

## Related
- EmptyState: what the table shows in its `empty` slot, at `size="compact"`.
- StatusBadge: the state of a record inside a cell.
- OverflowMenu: row actions past the labelled ones, destructive last.
- EntityDrawer: what `onRowClick` opens.
- KpiStrip: the headline figures above a table.
- Button: standalone actions above or beside the table, not inside rows (RowAction there).
