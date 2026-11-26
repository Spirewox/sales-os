# PageHeader

## Description
PageHeader names the page a person is on, says in one line what they do there, and holds the page's own actions and section tabs.

`import { PageHeader } from "@/components/app"`, source `components/app/page-header.tsx`, status `ready-with-gaps`.
Foundation: `hand-rolled`. Traps checked: `trap/text-measure` (Tokens: the description caps at `max-w-[65ch]`), `trap/control-height` (Rules: actions and the overflow trigger are both 36px at default size), `trap/button-clone` (Rules, a finding: every header with actions passes a hand-styled `<button>` or `Link` instead of `Button`), `trap/native-control` (same finding), `trap/link-as-button` (the Dashboard passes `Link`s with button classes, `app/(app)/_dashboard/dashboard-content.tsx:74`), `trap/button-label-wrap` (States, Narrow: the cluster wraps whole buttons, and a finding: the hand-styled call-site buttons set no `whitespace-nowrap`, so a long label can wrap inside its button), `trap/narrow-hidden-nav` n/a because nothing clips: the cluster uses `flex-wrap` and the Dashboard folds its secondaries into the overflow menu below 640px, `trap/current-unmarked` n/a because tabs mark their own current item (SectionTabs spec), `trap/safe-area` and `trap/viewport-height` n/a because the header sits in the scrolling `main`, never at a fixed edge.

### Foundation
Not applicable: hand-rolled. PageHeader is app code in `components/app/page-header.tsx` with no library primitive under it.

| Given by the foundation | Added by the team |
|---|---|
| Nothing: a plain `header`, `h1` and `p` | Title row with the action cluster on the right at 640px and up, stacked below it; `overflow` slot after `actions`; `tabs` slot under the title row |

## Examples
Default: `docs/system/examples/page-header/default.tsx`.

Real uses, 12 call sites (`rg -n "<PageHeader\b" app components lib --glob '!components/app/**'`):
- Analytics, title, description and tabs: `app/(app)/analytics/page.tsx:83`.
- Credits, title and description only: `app/(app)/credits/page.tsx:159`.
- Kitchen, one secondary and one primary button, tabs: `app/(app)/kitchen/page.tsx:109`.
- Dashboard, two secondary links and one primary link, two overflow menus split by width: `app/(app)/_dashboard/dashboard-content.tsx:68`.
- Sales, one primary hidden below 768px, overflow with import, templates and export: `app/(app)/sales/page.tsx:98`.
- Inventory, one primary that changes with the tab, overflow with four items gated by permissions, tabs: `app/(app)/inventory/page.tsx:222`.
- Customers, one primary, overflow with import, template and export: `app/(app)/customers/page.tsx:151`.
- Suppliers, one primary: `app/(app)/suppliers/page.tsx:167`.
- Settings, title and description only: `app/(app)/settings/page.tsx:52`.
- POS, one primary on the Tills tab, overflow with Refresh, tabs: `app/(app)/pos/page.tsx:69`.
- Engagement, description that changes with the tab, one primary, tabs: `app/(app)/engagement/page.tsx:57`.
- Audit trail, overflow with one export item, tabs: `app/(app)/audit/page.tsx:182`, the pilot screen.

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/page-header/default.tsx` | default | Settings header, a title and one line of description and nothing else |
| `docs/system/examples/page-header/with-actions.tsx` | state:with-actions | Customers header with one primary action and the secondary actions in the overflow menu |
| `docs/system/examples/page-header/with-tabs.tsx` | state:with-tabs | Analytics header with its section tabs under the title row |
| `docs/system/examples/page-header/overflow-all-hidden.tsx` | state:overflow-all-hidden | Inventory header for a person with no inventory permissions, every overflow item hidden |
| Not applicable: the narrow layout is the same markup below 640px, so `with-actions.tsx` at 390px shows it | state:narrow | none |
| `docs/system/examples/page-header/in-page.tsx` | composition:SectionTabs | Inventory page top, header with primary action, overflow menu and section tabs, then the page body |

## Variants
Not applicable: PageHeader has no variant prop. What changes between pages is which slots are filled (`actions`, `overflow`, `tabs`), and those are States below.

## States
| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Title and description | `title` and `description` set, no other slot (Credits, Settings) | Read where they are | `h1` text and one line of `p` text under it | screenshot |
| With actions | `actions` or `overflow` set (8 and 6 call sites) | Press the page's primary action, open the overflow menu | Cluster of controls right of the title at 640px and up | screenshot |
| With tabs | `tabs` set (6 call sites) | Switch section | Tab row under the title row, inside the same `header` | screenshot |
| Narrow | Viewport under 640px (`sm`) | Same as wide | Title block on top, cluster below it, left aligned and wrapping | by hand |
| Overflow all hidden | `overflow` set and every item `hidden`, so OverflowMenu returns null (Inventory with no inventory permissions, `app/(app)/inventory/page.tsx:227`) | Nothing in the cluster | No trigger. The empty cluster box still renders and adds a 12px gap below the title under 640px | by hand |

### State precedence
- With actions and Narrow: both show. The cluster moves under the title and wraps.
- With tabs and Narrow: both show. Tabs stay under everything else in the header.
- With actions and With tabs: both show. The cluster stays in the title row, tabs below it.
- Overflow all hidden and With actions: With actions wins. The cluster shows the `actions` controls only.
- Title and description and the others: Not applicable: it is the base every other state adds to.

### Motion
Not applicable: no motion. `page-header.tsx` has no transition or animation; motion inside the slots belongs to their own components.

## Props
gen-docs writes the table from `PageHeaderProps`.
- `title` is a string and renders as the page's only `h1`.
- `description` takes a node so the Dashboard can pass a date and a location, and Engagement a line per tab.
- `actions` renders before `overflow` in one cluster, so the overflow trigger is always the last control.
- `tabs` renders after the title row and never inside the cluster.
- `className` lands on the `header`. No call site passes it.

## Usage

### When to use
- A route under `app/(app)` needs its title, one line on what the page is for, and the page's own actions
- A page splits into sections that the person switches between from the top of the page

### When not to use
- A record opened over a list, such as a customer or a supplier. Use EntityDrawer instead, which carries its own title and overflow
- A side sheet with a form. Use FormSheet instead
- A section title inside a page. Use SectionTabs instead when the sections switch, or a plain heading in the section's card

### Rules
- `rule/page-header-one-primary`: When `actions` is set, pass 1 primary action, placed last, and at most 1 secondary before it, and put every further action in `overflow` as an `OverflowMenu` instead, because the cluster is `shrink-0` beside the title, so each extra button takes width from the title and description before anything wraps. Evidence: app 8/8 call sites with `actions` pass exactly 1 primary, 7/8 pass at most 1 secondary, stray `app/(app)/_dashboard/dashboard-content.tsx:71` passes 2 secondaries at 640px and up; single use `components/app/page-header.tsx:7`, the JSDoc on `actions` states the same limit. Check: review.
  - Don't: `<PageHeader title="Sales" actions={<><Button variant="outline">Import sales</Button><Button variant="outline">Export sales</Button><Button>Record sale</Button></>} />`
  - Do: `<PageHeader title="Sales" actions={<Button>Record sale</Button>} overflow={<OverflowMenu items={[{ label: 'Import sales', onSelect: importSales }, { label: 'Export sales', onSelect: exportSales }]} />} />`
- `rule/page-header-tabs-slot`: When a page has page-level sections, pass its `SectionTabs` through `tabs` instead of rendering it after `PageHeader` or inside `actions`, because `tabs` keeps the section switch inside the same `header` as the `h1`, under the title row at every width. Evidence: app 6/6 page-level `SectionTabs` on routes with a PageHeader go through `tabs` (Analytics, Kitchen, Inventory, POS, Engagement, Audit trail), and the other 2 `SectionTabs` are in-card filters at `app/(app)/_dashboard/needs-attention.tsx:45` and `app/(app)/engagement/interactions.tsx:207`. Check: review.
  - Don't: `<><PageHeader title="Inventory" /><SectionTabs label="Inventory sections" tabs={tabs} defaultTab="stock" /></>`
  - Do: `<PageHeader title="Inventory" tabs={<SectionTabs label="Inventory sections" tabs={tabs} defaultTab="stock" />} />`
- `rule/page-header-one-per-route`: When a route under `app/(app)` renders its main content, render 1 `PageHeader` as the first child of the page wrapper instead of a hand-written `<h1>`, because PageHeader holds the page's only `h1` and screen reader users jump to it by heading. Evidence: app 12/12 main routes render exactly 1 PageHeader first; principle wcag: 2.4.6 Headings and labels, one `h1` per page names its topic. Strays with their own `h1`: `app/(app)/kitchen/board.tsx:185` (full-screen kitchen display), `app/(app)/jobs/[id]/page.tsx:24` (job status page), and the access-required screens `app/(app)/kitchen/page.tsx:28` and `app/(app)/pos/page.tsx:33`. Check: review.
  - Don't: `<h1 className="text-2xl font-semibold tracking-tight">Suppliers</h1>`
  - Do: `<PageHeader title="Suppliers" description="Find a supplier, check spend and open issues, then reorder." />`

### Content
- `rule/page-header-title-nav-label`: When setting `title`, use the route's label from `components/layout/nav-config.ts`, in sentence case, 1 or 2 words, instead of a phrase or a verb, because the `h1` confirms the sidebar item the person pressed. Evidence: app 12/12 titles equal their nav label (Dashboard, Analytics, Sales, POS, Credits, Customers, Engagement, Inventory, Suppliers, Kitchen, Audit trail, Settings). Check: review against `components/layout/nav-config.ts`.
  - Don't: `<PageHeader title="Manage Your Customers" />`
  - Do: `<PageHeader title="Customers" />`
- `rule/page-header-description-sentence`: When setting a fixed `description`, write 1 sentence in sentence case that ends with a full stop and says what the person does on the page, instead of a slogan or a list of features, because the line is the page's only explanation and sits at `max-w-[65ch]`. Evidence: app 10/12 call sites pass one sentence with a full stop, and the 2 others are data, the Dashboard's date and location at `app/(app)/_dashboard/dashboard-content.tsx:70` and Engagement's line per tab at `app/(app)/engagement/page.tsx:59`. Check: review.
  - Don't: `<PageHeader title="Suppliers" description="Powerful supplier management" />`
  - Do: `<PageHeader title="Suppliers" description="Find a supplier, check spend and open issues, then reorder." />`

### Anti-slop
- `rule/page-header-no-eyebrow`: When a page needs extra context, such as the location or the period, put it in `description` or the FilterBar under the header instead of an uppercase eyebrow, a breadcrumb or a badge above `title`, because labels in this app are sentence case with no uppercase micro labels (`app/globals.css:10`). Evidence: app 12/12 call sites render nothing above the title, and the Dashboard carries its location in `description`, `app/(app)/_dashboard/dashboard-content.tsx:70`. Check: review.
  - Don't: `<><p className="text-xs uppercase tracking-wider">Lagos hub</p><PageHeader title="Dashboard" /></>`
  - Do: `<PageHeader title="Dashboard" description="Monday 23 November, Lagos hub" />`
- `rule/page-header-overflow-last`: When a page has secondary actions such as Import, Export, Template or Refresh, pass one `OverflowMenu` through `overflow` instead of a row of outline buttons, because the `⋯` trigger keeps the cluster to 2 or 3 controls and the restoration notes moved every such action there. Evidence: app 6/6 call sites with secondary file actions put them in `overflow`, and `docs/restoration/sales-credits.md` and `docs/restoration/customers-engagement.md` record Import and Export moving to the header `⋯` menu. Check: review.
  - Don't: `<PageHeader title="Customers" actions={<><Button variant="outline">Import customers</Button><Button variant="outline">Export customers</Button></>} />`
  - Do: `<PageHeader title="Customers" overflow={<OverflowMenu items={[{ label: 'Import customers', onSelect: importCustomers }, { label: 'Export customers', onSelect: exportCustomers }]} />} />`

### Limits
- Not applicable: no break was measured this session. The action count is held by `rule/page-header-one-primary` from call-site evidence, and the description width by `max-w-[65ch]` in code.

## Accessibility
Rests on native `header`, `h1` and `p`. PageHeader has no focusable part of its own; focus order is the slots' DOM order.

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| Tab | Before the header | Moves through `actions` in order, then the overflow trigger, then the tabs | Next control in that order | by hand |
| Shift+Tab | Any control in the header | Moves back through the same order | Previous control | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| `header` | generic (inside `main`, so no banner landmark) | none | none | Nothing | by hand |
| Title | heading, level 1 | `title` text | none | "{title}, heading level 1" when reached by heading navigation | by hand |
| Description | paragraph | its text | none | Read after the heading in reading order | by hand |

## Tokens
| Part | State | Token |
|---|---|---|
| Title | all | `--foreground` (inherited), `text-2xl font-semibold tracking-tight` |
| Description | all | `--muted-foreground`, `text-sm`, `max-w-[65ch]` |
| Header | all | `space-y-4` between title row and tabs |
| Title row | narrow | `gap-3` column |
| Action cluster | all | `gap-2`, `flex-wrap` |

## Related
- OverflowMenu: the `⋯` that goes in `overflow` for every action past the primary and one secondary.
- SectionTabs: the page's sections, passed through `tabs`.
- EntityDrawer: the title and actions of a record opened over a list.
- FilterBar: location, period and search controls, right under the header.
