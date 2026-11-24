Pinned at e15bb64b1172 (ds/2026-11-23-harden; product paths identical to fd336f4).

# Migration plan: Sales OS CRM to its kit (components/app + components/ui, app/globals.css tokens)

System: components/app (19 exports) + components/ui (shadcn base-nova on @base-ui/react), tokens app/globals.css, at e15bb64b1172, doing (the harden step is writing specs, registry items and Storybook beside this audit; registry.json has 0 items and docs/system/ has no component spec yet at the pin)
Counts: imports 0, raw 133, palette 96, files 0, unassigned 0 (inventory/counts.txt, run twice with identical output). Report-only: candidates 50, bypasses 404, allowlisted 0, scanned files 245.
Why imports and files are 0: nothing is confirmed legacy. No registry entry lists `replaces` and no migration map exists, so every duplicate the triage found is a report-only candidate in legacy.txt until its gate (G-01 to G-03) is decided (inventory.md, Reconcile with the build's registry).
Blind spots: 56 template-literal classNames (`className={\`...${...}\`}`) and 15 `style={{...}}` objects with runtime widths, which static search cannot resolve; category colours chosen at runtime through categoryColor(); toast styling inside sonner's richColors CSS; the printed receipt and kitchen quote documents; 6 `text-white` / `bg-black` style classes, which name a value but are not palette steps, so they are not counted (same rule as the triage). The verifier's visual check covers these.

## Surfaces

| surface | paths | raw | palette | candidates | bypasses | states | depends_on | notes |
|---|---|---|---|---|---|---|---|---|
| shared | app/layout.tsx, app/(app)/layout.tsx, contexts/**, providers/**, hooks/**, lib/**, types, components/layout/** | 29 | 83 | 0 | 7 | default, collapsed-sidebar, notifications-open | - | 20 category hues (G-05), 81 dead palette rows (G-13), sidebar sizes (G-07, G-09) |
| shared-components | components/*.{tsx,ts}, components/credits/**, components/brand/** | 21 | 0 | 3 | 41 | per caller | shared | FilterSelect, SubmitButton, ConfirmPreviewModal live here (G-01 to G-03) |
| analytics | app/(app)/analytics/** | 18 | 0 | 0 | 25 | default, empty, loading, error, drill | shared | proposed pilot |
| sales | app/(app)/sales/** | 19 | 0 | 3 | 48 | list, empty, loading, error, form, import, receipt | shared | 12 receipt values (G-11) |
| kitchen | app/(app)/kitchen/** | 12 | 0 | 6 | 100 | board, empty, loading, error, form | shared | most raw controls; 4 local class constants |
| dashboard | app/(app)/page.tsx, app/(app)/_dashboard/** | 8 | 0 | 0 | 2 | default, empty, loading, error | shared | |
| inventory | app/(app)/inventory/** | 7 | 0 | 16 | 56 | list, empty, loading, error, drawer, form, import | shared | on-series text (G-07) |
| suppliers | app/(app)/suppliers/** | 5 | 0 | 2 | 28 | list, empty, loading, error, drawer, form | shared | |
| customers | app/(app)/customers/** | 4 | 0 | 3 | 19 | list, empty, loading, error, drawer, form, import | shared | |
| audit | app/(app)/audit/** | 3 | 0 | 1 | 1 | list, empty, loading, error, drawer | shared | harden pilot; do not migrate here until harden lands |
| engagement | app/(app)/engagement/** | 3 | 0 | 6 | 28 | list, empty, loading, error, drawer | shared | |
| settings | app/(app)/settings/** | 3 | 1 | 5 | 37 | default, form, dirty, saving | shared | password meter (G-15) |
| credits | app/(app)/credits/** | 1 | 0 | 0 | 1 | list, empty, loading, error | shared | |
| kitchen-quote | app/kitchen-quote/** | 0 | 12 | 0 | 1 | default, not-found, print | - | public print page (G-14) |
| pos | app/(app)/pos/** | 0 | 0 | 2 | 4 | default, empty, loading, error, drawer | shared | |
| auth | app/{login,forgot-password,reset-password}/** | 0 | 0 | 3 | 5 | default, invalid, submitting | - | |
| kitchen-job | app/(app)/jobs/** | 0 | 0 | 0 | 1 | default, not-found | shared | |
| redirects | app/(app)/{compensations,enquiries,feedback,interactions,insights}/** | 0 | 0 | 0 | 0 | redirect | shared | nothing to migrate |
| total | 18 surfaces | 133 | 96 | 50 | 404 | | | |

## Shared layer work

- Adopt FilterSelect into the kit (G-01 A): move components/filter-select.tsx into components/app, export it from components/app/index.ts, keep a re-export at the old path until the 34 call sites move. Files: components/filter-select.tsx, components/app/index.ts, components/app/location-select.tsx. System owner's change, since components/app is the system.
- One chart text constant (G-08 A) beside the tooltip style in lib/format.ts:66 (fontSize 12 = --text-xs, legend paddingTop 8 = spacing 2). Files: lib/format.ts.
- Delete the dead palette maps (G-13 A): lib/kitchen-types.ts:256-272 (STAGE_BADGE and the unused class strings in paymentState), lib/settings-helpers.ts:5-30 and 47-51. 81 palette rows go with them.
- Allowlist rows with reason and owner for the decided exceptions (G-05 B, G-07 B, G-09 C, G-10 B, G-11 A, grid templates and viewport limits): 69 allowlist-candidate rows plus 20 category hues, 3 sidebar labels and 1 logo green. Each needs its gate out of `gate` first.
- The rule that blocks new legacy usage (none yet; audit mode adds none): an ESLint no-restricted-imports entry for the specifiers that become `module` lines, and the raw-value check, with a committed ignore list of today's files.

## Parity

parity.tsv, 104 rows: gap: blocking 52, parity with change 29, untested 12, gap: cosmetic 6, parity 3, gap: degrading 2.

- gap: blocking, components/filter-select.tsx (34 call sites): no kit Select exists, and the kit's own LocationSelect renders FilterSelect (components/app/location-select.tsx). Replacing it with components/ui/select loses the options mapping and the compact 36px size. Closed by G-01 A (adopt it), which makes it the system component.
- gap: blocking, components/confirm-preview-modal.tsx (6 call sites, inventory 5, suppliers 1): ConfirmDialog (components/app/confirm-dialog.tsx:8) has no preview rows, subtitle, warning or Back label, so a swap removes what the user checks before confirming a batch update. Closed by G-02 A (it is a product composition, not legacy).
- gap: blocking, components/submit-button.tsx (10 call sites, auth 3, kitchen 4, sales 2, confirm-preview-modal 1): components/ui/button has no loading prop, so the spinner and the double-submit guard go. Its size (h-8 rounded-lg) and destructive tint also differ from the app rule (parity with change). Held by G-03 A until the system has the app's button.
- gap: degrading, components/hub-scope-filter.tsx (1 call site, pos/overview.tsx:6): LocationSelect has no slot for scope chips or the location type tag.
- Coexistence (shared): one toast region either way, but app/layout.tsx:61 mounts sonner's Toaster directly while components/ui/sonner.tsx sits unused (parity with change if swapped). Nested overlays (a Select or DateField popup inside a FormSheet; DateField sets z-[60]) are untested.

Fan-out waits on every blocking row; with the defaults of G-01, G-02 and G-03 applied, all 52 close (adopted, kept as a composition, or held on legacy), so fan-out can start after the shared layer.

## Gaps for the system owner

- A button matching the app's control rule (h-9, rounded-md, primary, secondary, ghost, solid destructive, loading). Blocks G-03 and the 192 raw <button> and 12 local class constants on every surface (kitchen-ui.tsx:9-13, settings-ui.tsx:13-14, sales-utils.ts:15-18).
- A kit Select (FilterSelect adopted, G-01). Blocks 34 call sites and the 38 native <select> elements that open a white system menu in dark mode (components/filter-select.tsx:14; kitchen/settings.tsx 7, analytics/explore-build.tsx 5, sales 8, suppliers 6, kitchen/job-form-sections.tsx 4).
- Checkbox and Textarea primitives (components/ui has neither): 148 raw <input> include checkboxes styled with accent-[var(--primary)]; 14 raw <textarea>.
- A page-width container or token: max-w-[1400px] at analytics/page.tsx:74,108,119, credits/page.tsx:146, _dashboard/dashboard-content.tsx:67, sales/page.tsx:96 (G-07).
- On-series foreground tokens for labels on series fills in dark: inventory/product-drawer-panels.tsx:88-89 (G-07).
- An exported chart text constant (G-08), 23 rows on 8 surfaces.
- Sidebar width tokens, or allowlist: components/layout/sidebar.tsx:152,154,281 (G-07).
- A logo colour token, or allowlist: components/brand/brand-mark.tsx:22 (G-10).

## Docs coverage

| component the mapping names | page (docs/system/) | .md twin | sections in order |
|---|---|---|---|
| Segmented (components/app) | missing | missing | no |
| FilterSelect (to adopt) | missing | missing | no |
| LocationSelect (components/app) | missing | missing | no |
| ConfirmDialog (components/app) | missing | missing | no |
| Button (components/ui) | missing | missing | no |
| Select (components/ui) | missing | missing | no |
| Input / fieldClass | missing | missing | no |
| ModalDialog (components/ui) | missing | missing | no |
| StatusBadge (components/app) | missing | missing | no |

At the pin, docs/system/ holds spec-template.md and examples for filter-bar and page-header only. Every row is a gap for the system owner; the harden step is writing them. Reread at re-pin.

## Pilot

analytics. It carries the most raw values of any route (18), exercises both codemod candidates that change no pixels (the chart text constant, 3 rows; the page-width gap, 3 rows), the allowlist path (12 chart heights and layout limits), 25 raw controls, and has empty, loading, error and drill states behind SectionErrorBoundary. audit is the harden pilot and stays out of the migration until harden lands.

## Codemod candidates

| rewrite | findings it covers | share |
|---|---|---|
| Recharts `fontSize: 12` / `paddingTop: 8` to the shared chart constant (G-08 A) | 23 raw | 17% of raw |
| Delete dead palette maps in lib (G-13 A) | 81 palette | 84% of palette |
| Import path `@/components/filter-select` to `@/components/app` after the move (G-01 A) | 33 candidate imports | 66% of candidates |
| `rounded-[calc(var(--radius)-2px)]` segmented buttons to the kit Segmented (G-06 A, after a capture proves it) | 8 raw | 6% of raw |
| slate palette to neutral roles on kitchen-quote (G-14 A) | 12 palette | 13% of palette |
| Allowlist rows, not a code rewrite (G-05 B, G-07 B, G-09 C, G-10 B, G-11 A, layout templates) | 93 raw | 70% of raw |

## Gates

gates.md holds 15 entries: 14 read `gate` with a default, G-04 reads `skipped (decided: kit primitive)`. The ones that change what a screen shows: G-05 (category colours, default keep), G-15 (password meter, default warning and primary), G-14 (quote page, default keep), G-09 (sidebar 13px, default keep). The ones that need the system owner first: G-01, G-03, G-07, G-08. No build gate exists in .design-system/boss/state.md at the pin to merge with.

## Estimate

Assumptions: the defaults above; window of 2 workers (memory 35% free, one dev server); about 15 minutes per verified small surface and 40 for the pilot; no owner work for G-03 inside the run (raw buttons stay).
- Shared layer: 45 minutes (FilterSelect move, chart constant, dead-code deletion, allowlist, the blocking rule with its ignore list).
- Pilot (analytics) and codemod: 60 minutes.
- 15 remaining surfaces with findings (redirects has none) in a window of 2: about 2 hours.
- Close and recapture: 20 minutes.
Total: about 4 hours for 17 surfaces and 6 families (Select, Button, Input, Segmented, ConfirmDialog, LocationSelect). After it, raw reaches 0 outside the allowlist and palette 0; the 404 raw controls stay until the system has a Button, Checkbox and Textarea (G-03, G-12).

## Found, not fixed

| ID | Severity | Route | What | Why not fixed | Fix |
|---|---|---|---|---|---|
| G-01 | blocking | shared | FilterSelect has no kit counterpart; 34 call sites, and the kit's LocationSelect depends on it | gate | Adopt it into components/app and repoint the imports |
| G-02 | blocking | /inventory, /suppliers | ConfirmDialog cannot show preview rows, warning or Back; 6 call sites | gate | Keep ConfirmPreviewModal as a composition, or add those slots to the kit |
| G-03 | blocking | shared | components/ui/button has no loading state and differs from the app's h-9 rounded-md buttons; 10 SubmitButton sites, 12 class constants, 192 raw buttons | gate | The system owner adds the app's button, then migrate |
| F-01 | should-fix | shared | 29 raw values (20 category hues, sidebar sizes, notification width, tooltip font size) and 83 palette uses (81 dead) | no clearance | Shared layer: delete dead maps, chart constant, allowlist rows |
| F-02 | should-fix | shared | 21 raw values (segmented radius, chart sizes, logo green, PIN tracking) | no clearance | Migrate shared-components with the mapping file |
| F-03 | should-fix | /sales | 19 raw values (12 in the printed receipt) | no clearance | Allowlist the receipt (G-11), migrate the rest |
| F-04 | should-fix | /analytics | 18 raw values (chart heights, page width, chart text) | no clearance | Pilot surface |
| F-05 | should-fix | /kitchen | 12 raw values, 100 raw controls | no clearance | Migrate with the mapping file; controls wait on G-03 |
| F-06 | should-fix | / | 8 raw values | no clearance | Migrate the dashboard with the mapping file |
| F-07 | should-fix | /inventory | 7 raw values incl. 2 dark-mode label colours on series fills | no clearance | Migrate after G-07 |
| F-08 | should-fix | /suppliers | 5 raw values | no clearance | Migrate with the mapping file |
| F-09 | should-fix | /customers | 4 raw values | no clearance | Migrate with the mapping file |
| F-10 | should-fix | /audit | 3 raw values | no clearance | Migrate after the harden pilot lands |
| F-11 | should-fix | /engagement | 3 raw values | no clearance | Migrate with the mapping file |
| F-12 | should-fix | /settings | 3 raw values, 1 live palette use | no clearance | Migrate with the mapping file, G-15 |
| F-13 | should-fix | /credits | 1 raw value (page width) | no clearance | Migrate after G-07 |
| G-12 | should-fix | shared | 38 native selects open a white system menu in dark mode | gate | Swap to the kit Select after G-01 |
| G-07 | should-fix | shared | No page-width, chart-height, on-series text or sidebar width tokens | gate | System owner adds them, or allowlist |
| G-08 | should-fix | shared | Chart text sizes written as numbers in 23 places | gate | Export one chart text constant |
| G-05 | should-fix | shared | 20 per-category hues against the one-accent rule | gate | Keep allowlisted, or map onto brand and series tokens |
| G-15 | should-fix | /settings | Password meter uses yellow-500 and green-500 | gate | bg-warning and bg-primary |
| G-13 | note | shared | 81 dead palette rows in lib helpers with zero callers | gate | Delete the dead exports |
| G-14 | note | /kitchen-quote | 12 slate palette uses on the public quote page | gate | Map to neutral roles, or keep |
| F-14 | note | /kitchen-quote | Palette only, no raw values | no clearance | Covered by G-14 |
| F-15 | note | /pos | 2 candidate imports, 4 raw controls, no raw values | no clearance | Follows G-01 and G-03 |
| F-16 | note | /login, /forgot-password, /reset-password | 3 SubmitButton imports, 5 raw controls | no clearance | Follows G-03 |
| G-06 | note | shared | 8 hand-built segmented buttons | gate | Swap to the kit Segmented after a capture |
| G-09 | note | shared | Sidebar labels at 13px, between text-xs and text-sm | gate | Keep, or pick a step |
| G-10 | note | shared | Logo green #00A228 not in the token list | gate | Allowlist as a logo literal |
| G-11 | note | /sales | Receipt print styles cannot read app tokens | gate | Allowlist |
Rows past 30: 1 (found-not-fixed.tsv)

Next: To migrate the 17 surfaces (6 families, about 4 hours), reply "Go, 4h".
