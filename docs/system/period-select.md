# PeriodSelect

## Description
PeriodSelect sets the date period a screen reports on, from a fixed preset list or a custom day range, in Lagos days.

`import { PeriodSelect } from "@/components/app"`, source `components/app/period-select.tsx`, status `ready-with-gaps`.
Foundation: `@base-ui/react Popover`, with the app's own `Calendar` (`components/app/calendar.tsx`) and the period vocabulary in `lib/period.ts`. Traps checked: `trap/overlay-title` (ARIA, finding), `trap/overlay-focus-return` (Keyboard), `trap/overlay-conditional-render` n/a because `Popover.Root` stays mounted and the component owns `open`, `trap/escape-nested` n/a because nothing inside the popup opens a layer, `trap/overlay-no-max-height` (States), `trap/open-trigger-unfocused` (States), `trap/select-value-lost` (State precedence), `trap/select-empty-value` (Variants), `trap/disabled-still-hovers` (States, finding), `trap/focus-ring-shape` (Keyboard, finding), `trap/field-label` (ARIA), `trap/current-unmarked` (ARIA), `trap/live-region-double` (ARIA), `trap/numbers-shift` (Tokens).

### Foundation
| Given by the foundation | Added by the team |
|---|---|
| `Popover.Root`, `Trigger`, `Portal`, `Positioner` and `Popup` from `@base-ui/react/popover`: outside click and Escape to close, focus return, `data-popup-open`, `--available-height` | A controlled `open` that closes on a preset pick or Apply, and resets the draft range to the current value each time it opens |
| `Calendar` in `mode="range"` (team component): grid, arrow, PageUp, PageDown, Home and End keys, `max` to disable future days | The preset column built from `PERIOD_PRESETS`, filtered by `allowAll` and `presets`, marked with `SEGMENT_ACTIVE` when selected |
| `lib/period.ts` (team): `periodLabel`, `periodRange`, `lagosDay`, `parsePeriod`, `periodToParams` | The trigger text from `periodLabel`, a polite hint line under the calendar, and an Apply button enabled only for a complete range that differs from the current one |

## Examples
Default: `docs/system/examples/period-select/default.tsx`, set to "Last 30 days".

Real uses, 8 call sites (`rg -n "<PeriodSelect\b" app components lib --glob '*.{tsx,jsx}' --glob '!components/app/**'`), all with `value` and `onChange` only:
- Analytics header: `app/(app)/analytics/page.tsx:91`, local state.
- Inventory, sales trends card: `app/(app)/inventory/sales-trends.tsx:36`, local state.
- Inventory, movements: `app/(app)/inventory/movements-tab.tsx:117`, written to the URL with `periodToParams`.
- Audit log: `app/(app)/audit/page.tsx:183`, URL with fallback `'all'`.
- POS tabs: `app/(app)/pos/pos-filter-bar.tsx:30`, shown when `withPeriod` is on.
- Sales list: `app/(app)/sales/sales-filter-bar.tsx:27`.
- Suppliers: `app/(app)/suppliers/page.tsx:189`.
- Customers: `app/(app)/customers/page.tsx:200`.

### Example files
| File | Covers | Caption |
|---|---|---|
| `docs/system/examples/period-select/default.tsx` | default | Period control set to Last 30 days, opening presets beside a range calendar |
| Not applicable: `allowCustom` defaults to true, so `default.tsx` shows it | allowCustom=true | none |
| `docs/system/examples/period-select/allow-custom-false.tsx` | allowCustom=false | Presets only, limited to Today, Last 7 days and Last 30 days, with no calendar |
| `docs/system/examples/period-select/custom-range.tsx` | state:custom-range | A custom range already applied, so the trigger reads "1 Nov to 20 Nov" |
| `docs/system/examples/period-select/all-time.tsx` | state:all-time | The audit log default, All time, where the range is open on both ends |
| `docs/system/examples/period-select/in-filter-bar.tsx` | composition:FilterBar | Inside the customers filter bar, beside search, writing the period to the URL |

## Variants

### allowCustom
- `true`: presets on the left and the range calendar with Apply on the right, stacked on phones. The default, used at 8 call sites.
- `false`: one column of presets, 12rem wide, no calendar. Used at 0 call sites; kept for compact cards.

## States
| State | Trigger | What the user can do | Shown by, besides color | Checked by |
|---|---|---|---|---|
| Closed | Default | Open with click, Enter or Space | Trigger text from `periodLabel`, such as "Last 30 days", with a calendar icon and a chevron | screenshot |
| Open | Trigger pressed | Pick a preset, pick days, Apply, or close with Escape or an outside click | `aria-expanded="true"`, popup below the trigger, trigger keeps a muted fill and a primary border | snapshot |
| Preset selected | `value.preset` matches a preset | Pick another preset | `aria-selected="true"` on the option, plus the `SEGMENT_ACTIVE` inset ring | a11y scan |
| Start picked | One day clicked in the draft range | Pick an end day, or another start | Hint "{day}, now pick an end date"; Apply stays disabled | by hand |
| Range ready | Start and end picked and different from the applied range | Apply | Hint "{from} to {to}"; Apply enabled | by hand |
| Apply disabled | No complete draft, or the draft equals the applied range | Keep picking days | `disabled` attribute and 40% opacity | by hand |
| Custom range applied | `value.preset` is `custom` | Reopen to change the range or pick a preset | Trigger text "{from} to {to}"; no preset option is selected | screenshot |
| Future day | A day after today in Lagos | Nothing | The day button is disabled by `max={today}` | by hand |
| Popup taller than the screen | Phone height below the stacked panel | Scroll inside the popup | Popup capped at `--available-height` with its own scroll | by hand |
| Trigger hover | Pointer over the trigger | Click | Pointer only, background changes to muted | by hand |

### State precedence
- Open and custom range applied: both show. The calendar opens on the applied range and no preset is selected.
- Start picked and closed: closed wins. Closing drops the draft, and the next open starts from the applied range, so the applied value is never lost.
- Range ready and apply disabled: Not applicable: range ready means the draft differs from the applied range, which is exactly when Apply is enabled.
- Apply disabled and hover: hover wins in the code today, since `hover:bg-primary/90` still applies to the disabled button (finding). The proposed fix makes apply disabled win.
- Open and trigger hover: open wins. The trigger keeps its open fill and border.
- Preset selected and custom range applied: Not applicable: `value.preset` holds one id, so a value is a preset or custom.

### Motion
| Trigger | Kind | Preset | Properties | Reduced motion |
|---|---|---|---|---|
| Pointer enters or leaves the trigger or a preset | input | `transition-colors` (Tailwind default 150ms, no app preset exists in `app/globals.css`) | background-color | Same 150ms colour change. Nothing moves |
| Popup opens or closes | announce | `instant`, the popup has no enter or exit animation class | none | Same, it appears at once |

## Props
- `value` is a `Period` from `lib/period.ts`: `{ preset }`, or `{ preset: 'custom', from, to }` with `YYYY-MM-DD` Lagos days.
- `onChange` fires once per preset pick or Apply, never while picking days.
- `allowAll` defaults to true. False drops "All time" from the list, for screens whose query needs a bounded range.
- `presets` limits the preset list, such as `['today', '7d', '30d']`. Order follows `PERIOD_PRESETS`, not this array.
- `allowCustom` defaults to true. False drops the calendar and Apply.
- `className` goes on the trigger.

## Usage

### When to use
- A report, dashboard card or list whose numbers depend on a date window, where people mostly want a standard window and sometimes a custom one.

### When not to use
- Entering one date on a record, such as a delivery date. Use DateField instead.
- Picking a day inside a form with no preset windows. Use Calendar inside DateField instead.
- Switching between two or three fixed windows on a small card where a popup is too heavy. Use Segmented instead.

### Rules
- `rule/period-select-url-params`: When the screen's period belongs in the URL, write it with `periodToParams` and read it with `parsePeriod` using the same fallback, because the default preset is left out of the URL and a mismatched fallback turns a shared link into a different window. Evidence: app 2/2 URL call sites pair them, `app/(app)/inventory/movements-tab.tsx:117` and `app/(app)/audit/page.tsx:183` with fallback `'all'`. Check: review the fallback argument on both calls.
  - Don't: `<PeriodSelect value={parsePeriod(params, 'all')} onChange={(p) => set(periodToParams(p))} />`
  - Do: `<PeriodSelect value={parsePeriod(params, 'all')} onChange={(p) => set(periodToParams(p, 'all'))} />`
- `rule/period-select-filter-slot`: When a screen has a FilterBar, put PeriodSelect in its `filters` slot instead of beside the bar, because the bar wraps it with search and the other filters on phones. Evidence: app 6/8 call sites sit inside a FilterBar `filters` slot, such as `app/(app)/customers/page.tsx:200`, and the other two sit on screens with no FilterBar, `app/(app)/analytics/page.tsx:91` and `app/(app)/inventory/sales-trends.tsx:36`. Check: review.
  - Don't: `<div className="flex"><FilterBar search={search} /><PeriodSelect value={period} onChange={setPeriod} /></div>`
  - Do: `<FilterBar search={search} filters={<PeriodSelect value={period} onChange={setPeriod} />} />`
- `rule/period-select-lagos-range`: When a query or a filter needs the period's bounds, compute them with `periodRange` or `inPeriod` from `lib/period.ts` instead of `new Date()` arithmetic, because every period is counted in Lagos days and a browser in another zone shifts the window by a day. Evidence: single use `lib/period.ts:16`; principle heuristic: one source of truth for date windows. Check: review `new Date(` near period code.
  - Don't: `const from = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10)`
  - Do: `const { from, to } = periodRange(period)`

### Content
- `rule/period-select-preset-labels`: When a period needs a name, take it from `PERIOD_PRESETS` or `periodLabel` ("Last 30 days", "This month", "1 Nov to 20 Nov") instead of writing new copy, because the same window must read the same on every screen. Evidence: app 8/8 call sites show `periodLabel` through the trigger; single use `lib/period.ts:4`. Check: review for period strings outside `lib/period.ts`.
  - Don't: `<span>Past month</span>`
  - Do: `<span>{periodLabel(period)}</span>`

### Anti-slop
- `rule/period-select-no-second-picker`: When a screen already has a PeriodSelect, keep one per screen instead of adding a second date picker for the same data, because two windows on one view make every KPI ambiguous. Evidence: app 8/8 files with a PeriodSelect render exactly one. Check: review.
  - Don't: `<><PeriodSelect value={period} onChange={setPeriod} /><DateField label="From" value={from} onChange={setFrom} /></>`
  - Do: `<PeriodSelect value={period} onChange={setPeriod} />`
- `rule/period-select-bounded-all`: When the screen's query cannot run unbounded, pass `allowAll={false}` instead of mapping "All time" to a hidden cap, because the label "All time" then promises rows the query never fetches. Evidence: single use `components/app/period-select.tsx:20`; principle heuristic: match between system and the real world. Check: review queries that clamp `from`.
  - Don't: `<PeriodSelect value={period} onChange={(p) => setPeriod(p.preset === 'all' ? { preset: '30d' } : p)} />`
  - Do: `<PeriodSelect value={period} onChange={setPeriod} allowAll={false} />`

### Limits
Not applicable: the preset list is fixed at 5 entries by `PERIOD_PRESETS` and the trigger label is at most "30 Nov to 30 Nov"; no count or length grows with data.

## Accessibility
Rests on the Base UI Popover dialog, native `<button>` elements, and the team `Calendar` grid.

### Keyboard
| Key | Where focus is | Effect | Focus after | Checked by |
|---|---|---|---|---|
| Enter or Space | Trigger | Opens the popup | Inside the popup, per Base UI | by hand |
| Tab | Inside the popup | Moves through each preset, the month buttons, the calendar grid and Apply. Every preset is its own tab stop | The next control | by hand |
| Arrow keys | Preset list | Nothing. The `listbox` role promises arrow keys the code does not handle (finding) | Stays | by hand |
| Enter or Space | A preset | Applies it and closes | The trigger | by hand |
| Arrows, PageUp, PageDown, Home, End | Calendar grid | Move a day, a week, a month, or to the week's start or end | The new day | by hand |
| Enter or Space | A calendar day | Sets the start, or the end when a start is set | Stays on that day | by hand |
| Enter or Space | Apply | Applies the range and closes | The trigger | by hand |
| Escape | Anywhere in the popup | Closes and drops the draft | The trigger | by hand |

### ARIA
| Part | Role | Accessible name from | States and properties | Announced | Checked by |
|---|---|---|---|---|---|
| Trigger | button | `aria-label` "Period: {label}" | `aria-expanded`, `aria-haspopup="dialog"` from Base UI | "Period: Last 30 days, button, collapsed" | snapshot |
| Popup | dialog | None. No `Popover.Title` or `aria-label` (finding) | none | "dialog" only | by hand |
| Preset list | listbox | `aria-label` "Quick periods" | none | "Quick periods, list box" | a11y scan |
| Preset | option | Its label text | `aria-selected` on the current preset | "Last 7 days, selected" | a11y scan |
| Calendar | grid | The month title, such as "November 2026" | Days carry `aria-pressed`, today `aria-current="date"` | "Friday 20 November 2026, today" | by hand |
| Hint line | none, live region | Its text | `aria-live="polite"` | "20 Nov, now pick an end date" after each pick. The month title is a second live region, read only on month change, so the two do not double up | by hand |
| Apply | button | Its text "Apply" | `disabled` until a changed range is ready | "Apply, button, dimmed" | a11y scan |

## Tokens
| Part | State | Token |
|---|---|---|
| Trigger | rest | `--border`, `--background`, `--muted-foreground` (icons) |
| Trigger | hover, open | `--muted`; open adds `--primary` at 60% on the border |
| Trigger | focus | `--ring` |
| Popup | open | `--popover`, `--popover-foreground`, `--foreground` at 10% (ring), `--border` (dividers) |
| Preset | selected | `SEGMENT_ACTIVE`: `--accent`, `--accent-foreground`, `--primary` at 45% (inset ring) |
| Preset | hover | `--muted` |
| Hint line | all | `--muted-foreground`, `tabular-nums` |
| Apply | enabled | `--primary`, `--primary-foreground`; hover `--primary` at 90% |
| Apply | disabled | 40% opacity |

## Related
- FilterBar: holds PeriodSelect in its `filters` slot on list screens.
- Calendar: the range grid PeriodSelect opens; use it alone for a day picker.
- DateField: one date on a record, not a reporting window.
- OverflowMenu: actions, never a choice of one period.
