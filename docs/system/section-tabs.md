# SectionTabs

## Description
SectionTabs switches between the sections of one page, keeps the chosen section in the URL so it can be linked, and turns into a select on phones.

`import { SectionTabs, useSectionTab, type SectionTab } from "@/components/app"`, source `components/app/section-tabs.tsx`, status `ready-with-gaps`.
Foundation: hand-rolled tablist on native `<button>` elements, with `FilterSelect` (`components/filter-select.tsx`) as the phone fallback and `useUrlState` (`hooks/use-url-state.ts`) for `?tab=`. Traps checked: `trap/tabs-routes` (Usage, Accessibility), `trap/current-unmarked` (ARIA), `trap/weight-shift` (States), `trap/narrow-hidden-nav` (States), `trap/list-dead-gap` (Tokens), `trap/focus-ring-shape` (Keyboard), `trap/link-as-button` n/a because every tab is a `<button>` and none navigates to another route, `trap/touch-hover-flash` n/a because Tailwind v4 wraps `hover:` in `@media (hover: hover)`, `trap/numbers-shift` (Tokens).

### Foundation
Not applicable: hand-rolled.

| Given by the foundation | Added by the team |
|---|---|
| Not applicable: hand-rolled, no tabs primitive underneath | `role="tablist"` with `role="tab"` buttons, roving `tabIndex`, ArrowLeft and ArrowRight that wrap, Home and End, an underline for the active tab, count badges with three tones, `hidden` tabs, URL mode through `useUrlState`, controlled mode through `value` and `onChange`, and a `FilterSelect` below `md` unless `inlineOnMobile` |
| Not applicable: hand-rolled | `useSectionTab`, which reads `?tab=` (or `param`) and falls back to `defaultTab` when the value is missing, unknown or hidden |

## Examples
Default: `docs/system/examples/section-tabs/default.tsx`, kitchen sections synced to `?tab=`.

Real uses, 8 call sites (`rg -n "<SectionTabs\b" app components lib --glob '*.{tsx,jsx}' --glob '!components/app/**'`):
- Analytics header: `app/(app)/analytics/page.tsx:86`, URL mode, default "sales".
- Engagement header: `app/(app)/engagement/page.tsx:63`, URL mode, `inlineOnMobile`, a tab hidden by permission.
- Engagement, interactions: `app/(app)/engagement/interactions.tsx:207`, URL mode on `param="view"`, warning counts.
- Kitchen header: `app/(app)/kitchen/page.tsx:124`, URL mode, default "board".
- Dashboard, needs attention card: `app/(app)/_dashboard/needs-attention.tsx:45`, controlled, danger, warning and neutral counts.
- Inventory header: `app/(app)/inventory/page.tsx:236`, URL mode, warning count on Requests.
- POS header: `app/(app)/pos/page.tsx:79`, controlled, so a tab change also clears the tab's filters.
- Audit log header: `app/(app)/audit/page.tsx:185`, URL mode, default "all".

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/section-tabs/default.tsx` | default | Kitchen sections synced to ?tab=, with the board as the default tab |
| `docs/system/examples/section-tabs/inline-on-mobile-true.tsx` | inlineOnMobile=true | Two short tabs that stay a tab bar on phones instead of becoming a select |
| Not applicable: `inlineOnMobile` is off by default, so `default.tsx` shows the phone select | inlineOnMobile=false | none |
| `docs/system/examples/section-tabs/with-counts.tsx` | state:with-counts | Needs attention tabs whose counts carry danger, warning and neutral tones |
| `docs/system/examples/section-tabs/hidden-tab.tsx` | state:hidden-tab | A tab the person may not see is passed with hidden, so it is left out of the bar |
| `docs/system/examples/section-tabs/nested-param.tsx` | state:nested-param | A second bar inside a section writes ?view= so it does not fight the page's ?tab= |
| `docs/system/examples/section-tabs/in-page-header.tsx` | composition:PageHeader | The Inventory page header with its section tabs in the tabs slot |

## Variants

### inlineOnMobile
- `true`: the tab bar shows at every width and scrolls sideways when it overflows. For 2 to 3 short tabs, per the JSDoc. Used at 1 call site, `app/(app)/engagement/page.tsx:63`.
- `false`: below `md` (768px) the bar hides and a `FilterSelect` named by `label` takes its place, with counts in the option text as "{label} ({count})". Used at 7 call sites by default.

## States
| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Active tab | Its id equals the URL value, the `defaultTab` fallback, or `value` | Read the section | 2px underline in primary, `aria-selected="true"`, the only tab with `tabIndex=0` | a11y scan |
| Inactive tab | Any other visible tab | Click, or reach it with the arrow keys | No underline, muted text | screenshot |
| Inactive hover | Pointer over an inactive tab | Click | Pointer only, a `--border` underline appears and the text turns foreground. Weight stays `font-medium`, so labels do not widen | by hand |
| Focus visible | Keyboard focus on a tab | Arrow to a neighbour, Enter or Space | 2px `outline-ring` inset by 2px so the scroll box does not clip it | by hand |
| With count | `count` above 0 | Open the tab to act on the items | A round badge with the number; `warning` and `danger` add a tinted border | screenshot |
| Hidden tab | `hidden: true` | Nothing; the tab is not rendered and `?tab=` with its id falls back to `defaultTab` | Absent from the bar and the phone select | by hand |
| Unknown URL value | `?tab=` holds an id not in the visible tabs | Pick a tab | The `defaultTab` shows as active | by hand |
| Phone select | Width below 768px and `inlineOnMobile` off | Open the select and pick a section | A select named by `label`, showing the current section | screenshot |
| Overflow | Tabs wider than the bar, at widths where the bar shows | Scroll the bar sideways | The last tab is cut at the edge; there is no fade or arrow (finding) | by hand |

### State precedence
- Active tab and hover: active wins. The primary underline and foreground text stay under the pointer.
- Active tab and focus visible: both show. The outline draws over the underline.
- Hidden tab and active: hidden wins. A hidden id in the URL is treated as unknown, so `defaultTab` becomes active.
- With count and active: both show. The badge keeps its tone on the active tab.
- Phone select and overflow: phone select wins. Below `md` the bar is hidden, so it cannot overflow there.
- Inactive tab and active tab: Not applicable: each tab is one or the other.

### Motion
| Trigger | Kind | Preset | Properties | Reduced motion |
|---|---|---|---|---|
| Hover, or a tab becoming active | input | `transition-colors` (Tailwind default 150ms, no app preset exists in `app/globals.css`) | color, border-color | Same 150ms colour change. Nothing moves |

## Props
- `tabs` is a list of `SectionTab`: `id`, `label`, optional `count`, `countTone` ("neutral", "warning" or "danger") and `hidden`.
- `label` names the tablist and the phone select. It is required.
- URL mode: pass `defaultTab` and optionally `param` (default "tab"). Picking the default tab removes the param from the URL. Read the same value with `useSectionTab(tabs, defaultTab, param)`.
- Controlled mode: pass `value` and `onChange`. The types forbid mixing the two modes.
- `inlineOnMobile` keeps the bar on phones.
- `className` goes on the outer wrapper that draws the bottom border.

## Usage

### When to use
- A page with two or more sections under one title, where each section is a separate view the person may link to or reload into.
- A card or drawer that splits its content into a few groups with counts, such as the dashboard's needs attention card.

### When not to use
- Narrowing the rows of one list by a field. Use FilterBar instead.
- Two or three views of the same data in a small space, such as a chart's range. Use Segmented instead.
- Moving to another route. Use a link in the sidebar or page header instead, since a tab here is a button that never navigates (`trap/tabs-routes`). Use PageHeader `actions` for that link instead.

### Rules
- `rule/section-tabs-same-default`: When a bar uses URL mode, read the active tab with `useSectionTab` passing the same `defaultTab` and `param` as the bar, because the bar and the panel otherwise disagree on which section is open when the URL has no tab. Evidence: app 6/6 URL-mode bars pair them, such as `app/(app)/kitchen/page.tsx:55` with `app/(app)/kitchen/page.tsx:124`. Check: review both calls side by side.
  - Don't: `const tab = useSectionTab(tabs, 'stock'); <SectionTabs label="Inventory sections" tabs={tabs} defaultTab="movements" />`
  - Do: `const tab = useSectionTab(tabs, 'stock'); <SectionTabs label="Inventory sections" tabs={tabs} defaultTab="stock" />`
- `rule/section-tabs-nested-param`: When a URL-mode bar sits inside a section of another URL-mode bar, pass a distinct `param` such as "view", because both default to `?tab=` and the inner bar would switch the page's section. Evidence: single use `app/(app)/engagement/interactions.tsx:185`. Check: review pages with two `SectionTabs` tags.
  - Don't: `<SectionTabs label="Interaction types" tabs={views} defaultTab="feedback" />`
  - Do: `<SectionTabs label="Interaction types" tabs={views} param="view" defaultTab="feedback" />`
- `rule/section-tabs-local-controlled`: When tabs sit inside a card or drawer, or a tab change must also reset other URL params, pass `value` and `onChange` instead of `defaultTab`, because URL mode writes only its own param. Evidence: app 2/2 controlled bars, `app/(app)/_dashboard/needs-attention.tsx:45` (a card) and `app/(app)/pos/page.tsx:50` (clears the tab's filters in one `set`). Check: review.
  - Don't: `<SectionTabs label="Needs attention" tabs={tabs} defaultTab="overdue" />`
  - Do: `<SectionTabs label="Needs attention" tabs={tabs} value={tab} onChange={setPicked} />`
- `rule/section-tabs-hide-not-remove`: When a person may not see a section, pass the tab with `hidden: true` instead of filtering the array at the call site, because `useSectionTab` then treats a linked `?tab=` for it as unknown and falls back to `defaultTab`. Evidence: single use `app/(app)/engagement/page.tsx:36`; single use `components/app/section-tabs.tsx:30`. Check: review.
  - Don't: `<SectionTabs label="Engagement sections" tabs={canSee ? tabs : tabs.slice(0, 1)} defaultTab="overview" />`
  - Do: `<SectionTabs label="Engagement sections" tabs={[{ id: 'interactions', label: 'Interactions', hidden: !canSee }]} defaultTab="overview" />`

### Content
- `rule/section-tabs-label`: When rendering SectionTabs, set `label` to the name of the group, "{Page} sections" for a page header bar, because it names the tablist and the phone select, and a screen reader hears it before the first tab. Evidence: app 6/6 page header bars use "{Page} sections", such as `app/(app)/audit/page.tsx:185`. Check: review.
  - Don't: `<SectionTabs label="Tabs" tabs={tabs} defaultTab="all" />`
  - Do: `<SectionTabs label="Audit sections" tabs={tabs} defaultTab="all" />`

### Anti-slop
- `rule/section-tabs-count-tone`: When a tab count stands for items that need action, set `countTone` to "warning" for pending or low and "danger" for overdue or out, and leave other counts "neutral", because status colour is reserved for real state. Evidence: single use `app/globals.css:11`; app 9/9 `countTone` values follow it, such as `app/(app)/_dashboard/needs-attention.tsx:29`. Check: review `countTone` values.
  - Don't: `{ id: 'recipes', label: 'Recipes', count: 12, countTone: 'warning' }`
  - Do: `{ id: 'recipes', label: 'Recipes', count: 12 }`
- `rule/section-tabs-no-hand-tablist`: When a page needs sections under its title, render `SectionTabs` in the PageHeader `tabs` slot instead of a hand-built `role="tablist"` row, because the hand-built row misses the URL sync, the phone select and the count tones. Evidence: app 6/7 section tab rows under a title use it, stray `app/(app)/kitchen/board.tsx:248` (board stage). Check: lint `rg -n 'role="tablist"' app components lib` outside `components/app/`.
  - Don't: `<div role="tablist"><button role="tab" aria-selected={tab === 'stock'}>Stock</button></div>`
  - Do: `<PageHeader title="Inventory" tabs={<SectionTabs label="Inventory sections" tabs={tabs} defaultTab="stock" />} />`

### Limits
Not applicable: the JSDoc says `inlineOnMobile` suits 2 to 3 short tabs, but no overflow width was measured this session, so the cap is reported as a finding with a proposed gate instead of a rule.

## Accessibility
Rests on native `<button>` elements with `role="tab"` inside a `role="tablist"`, and on the Base UI Select inside `FilterSelect` below `md`.

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| Tab | Before the bar | Enters the bar on the active tab only (roving `tabIndex`) | The active tab | by hand |
| ArrowRight or ArrowLeft | A tab | Selects the next or previous visible tab, wrapping at the ends (automatic activation) | The new tab, through `requestAnimationFrame`. The list element is saved before the frame, since React resets `e.currentTarget` to null once the handler returns (was a finding, fixed for G-16; driven in Storybook `app-kit-sectiontabs--default` with 0 page errors) | by hand |
| Home or End | A tab | Selects the first or last visible tab (G-16; before this, not handled) | The selected tab | by hand |
| Enter or Space | A tab | Selects it | Stays on it | by hand |
| Tab | A tab | Leaves the bar to the section content | The next focusable element after the bar | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| Bar | tablist | `aria-label` from `label` | none | "Inventory sections, tab list" | a11y scan |
| Tab | tab | Its label text plus the count | `aria-selected`; no `aria-controls`, and sections carry no `role="tabpanel"` (finding) | "Requests 2, tab, selected, 3 of 3" | a11y scan |
| Phone select | combobox, from Base UI Select | `ariaLabel` from `label` | `aria-expanded` | "Inventory sections, Stock" | by hand |
| Count badge | none | Read as part of the tab name | Tone is colour plus a tinted border; the number carries the meaning | The number after the label | by hand |

## Tokens
| Part | State | Token |
|---|---|---|
| Bar | all | `--border` (bottom rule) |
| Tab | active | `--primary` (underline), `--foreground` |
| Tab | inactive | `--muted-foreground`, transparent underline |
| Tab | hover | `--border` (underline), `--foreground` |
| Tab | focus visible | `--ring` |
| Count badge | neutral | `--muted`, `--muted-foreground`, `tabular-nums` |
| Count badge | warning | `--warning` (text), `--warning` at 40% (border), `--warning` at 5% (fill) |
| Count badge | danger | `--destructive` (text), `--destructive` at 30% (border), `--destructive` at 5% (fill) |

Tabs sit 4px apart (`gap-1`); the gap is dead space between hit areas (`trap/list-dead-gap`), left as is since each tab is 40px tall and at least 24px wide.

## Related
- PageHeader: holds SectionTabs in its `tabs` slot on 6 pages.
- FilterBar: filters the list inside one section once SectionTabs has picked it.
- Segmented: two or three views of one dataset inside a card.
