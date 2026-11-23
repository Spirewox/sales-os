# Design system build: Sales OS CRM (fudfarmer-crm-next)

## Frame

- Ask, in the person's words: "create a design system from the Ui update and put it on storybook". Received 2026-11-23 22:36 (design-system-boss brief `.design-system/boss/briefs/harden.1.md`).
- First visible change that answers it: Storybook (`npm run storybook`) showing the Foundations pages and every kit component and used primitive in light and dark.
- Mode: harden. Foundation: shadcn (style base-nova, base @base-ui/react). Base reference: build-design-system references/base-shadcn.md.
- Token source: `app/globals.css` (Tailwind v4 `@theme inline` plus `:root` and `.dark`). Its header comment holds the visual rules. No generator.
- Component layer: `components/ui` (primitives) and `components/app` (the redesign's kit).
- Pilot: `app/(app)/audit/` (Audit trail).
- Run branch: ds/2026-11-23-harden, named by the boss brief (already checked out). Commits stay local.
- Footprint: full (the person's own repo, no PR named). Check scripts copied into `scripts/`.
- Viewports: 390 and 1280 px. Themes: light and dark (next-themes, attribute="class").
- Design source: the UI redesign already on this branch (0123b26..fd336f4), reference only. Keep the current look.
- Predicate: "19 canonical kit components plus 7 used primitives cover the 10 inventoried families, every token has a role, the checks fail on seeded violations and exit 0 on a clean clone, and the pilot matches its baseline except for the listed intended changes." Measured parts below; the pilot baseline part is not measured (dev server down).
- Budget: phase cap 23:56 local. Workers used: 2 code (S1, S2), 5 docs (D1 to D5; D5 refilled a slot after D1 to D4 reported).

## Standing orders

1. Write only inside the brief's SCOPE. Scratch only in `.design-system/tmp/<worker>/`.
2. Use only the colors, fonts, shadows, gradients, motion, logos and product names the app already has.
3. Baselines, fixtures and checks stay as written. Fix the code instead.
4. Commit only to ds/2026-11-23-harden, locally. No merge, push, deploy, stash, reset or clean.
5. Questions become gates with defaults; apply the default and keep working.
6. Every claim names the command that proved it this session.
7. Small exact edits in the shared checkout.
8. Agents only as a coordinator, foreground.
- `.design-system/boss/` and `.migration/` belong to others: read only.
- AGENTS.md: "This is NOT the Next.js you know. ... Read the relevant guide in node_modules/next/dist/docs/ before writing any code."
- Memory: never remove information (KPIs, charts, sections, columns, fields) unless it is visibly available elsewhere, and say where.
- Bans: customers contacted by WhatsApp only (no Call buttons); markups are percentages; min text-xs; sentence case; one green accent; status colours only for state; no em-dashes in UI text.

## Phases

| Phase | Status | Artifact | Notes |
|---|---|---|---|
| 1 Frame | done | .design-system/run.md#frame | harden, shadcn, pilot /audit |
| 2 Inventory | done | .design-system/boss/triage/ (boss), .migration/2026-11-23-audit/ (migrate audit, read only) | before captures skipped (dev server not listening, curl http://localhost:3456/audit -> 000) |
| 3 Foundations | done | app/globals.css unchanged, stories/foundations/, AGENTS.md design-system block | every token already has a role (globals.css header and Foundations pages); 0 identical-value swaps landed (G-06) |
| 4 Components | done | stories/app-kit/ (19 files), stories/primitives/ (7 files), registry.json (26 entries), components/app/index.ts | no component code changed except the FilterSelect barrel export (G-01) |
| 5 Checks | done | scripts/check.mjs, scripts/check-system.mjs, scripts/check-spec.mjs, scripts/check-allowlist.json | check exit 0; both self-tests exit 0 |
| 6 Pilot, then surfaces | done | app/(app)/audit/ commits 787d50b and the G-08/G-12/G-14 commit | checks-only: no runtime capture (dev server down) |
| 7 Docs | done | docs/system/ (13 specs), public/system/, public/llms.txt, AGENTS.md index | 13 of 27 registry components have specs; rest are found-not-fixed |
| 8 Handoff | done | .design-system/close.md, this section | trial skipped (cap) |

## Decisions

| ID | Phase | Decision | Why | Evidence | Reversible |
|---|---|---|---|---|---|
| D-01 | 1 | Storybook 10.6.8 with @storybook/nextjs (webpack), addon-docs and addon-themes, webpack 5.106.0 | `npm view @storybook/nextjs peerDependencies` lists next ^16.0.0 and webpack ^5; the app's dev script is `next dev --webpack` | package.json, .storybook/main.ts | yes |
| D-02 | 4 | Global decorator: app/globals.css, Geist and Geist Mono via next/font/google (same variables as app/layout.tsx), withThemeByClassName light/dark on the `.dark` class, QueryClientProvider (retry off), sonner Toaster, `nextjs.appDirectory` navigation mocks, viewports phone 390 / tablet 768 / desktop 1280 | matches app/layout.tsx and next-themes attribute="class" | .storybook/preview.tsx | yes |
| D-03 | 4 | Stories live in stories/ (not beside components) | keeps story tags out of check-spec's call-site counts, which scan app, components, lib | scripts/check-system.config.json include | yes |
| D-04 | 3 | Token source stays app/globals.css with no generator; Foundations pages print its values from stories/foundations/token-data.ts | base-shadcn.md: no generator by default; shadcn writes that file | stories/foundations/token-data.ts | yes |
| D-05 | 5 | Existing 648 findings went to scripts/check-allowlist.json (`--init-allowlist`); 2 pruned after the pilot fixes, 646 left | the check ratchets new drift without migrating screens (no clearance) | `node scripts/check-system.mjs --no-self-test --left` in .design-system/close.md | yes |
| D-06 | 5 | Copied scripts/oklch.mjs beside check-system.mjs | without it the self-test failed 2 of 82 fixtures (nearest-token and --no-allowlist); with it 82 of 82 pass | `node scripts/check-system.mjs --self-test --fixtures <skills>/build-design-system/fixtures/check-system` exit 0 | yes |
| D-07 | 6 | Pilot: keep the last rows, counts and pagination while the next page or filter loads (rows={logs}, loading={isFetching}, aria-busy wrapper) | trap/loading-layout-shift: every refetch swapped 25 rows for 6 skeleton rows and dropped pagination and tab counts (S2 static measure). No information removed | commit 787d50b; .design-system/tmp/S2/static-measures.txt (deleted at close; numbers in the Ledger) | yes |
| D-08 | 6 | Pilot drawer JSON scrollers: 60vh to 60dvh, overscroll-contain, role="region" with names and tabIndex 0 | trap/viewport-height, trap/scroll-chain, adds-only accessibility | commit 787d50b | yes |
| D-09 | 6 | Pilot drawer Stage stat falls back to formatAuditAction(log.action), as the table's Status column does | consistency bug: raw action code in the drawer vs formatted label in the table | app/(app)/audit/audit-drawer.tsx:57 | yes |
| D-10 | 7 | Reciprocal Related lines added to data-table, entity-drawer, skeleton, button, period-select, filter-bar | `node scripts/gen-docs.mjs` warned docs/alternative-oneway 7 times; 0 after | gen-docs output | yes |
| D-11 | 7 | Spec citations into the pilot re-read after the pilot commit (data-table, filter-bar, period-select, section-tabs remapped; page-header, overflow-menu, section-error-boundary re-committed) | spec/stale-cite failed 12 times after the pilot commit; 0 after | `node scripts/check-spec.mjs docs/system` 13 specs, 0 failures | yes |
| D-12 | 4 | Button registry entry holds no `replaces` for SubmitButton | adding it flagged 10 rule/deprecated-import sites while Button cannot yet replace SubmitButton (G-03) | registry.json replacesNote | yes |

## Gates

| ID | Question | Default | Status | Commit | From |
|---|---|---|---|---|---|
| G-01 | Adopt components/filter-select.tsx (FilterSelect) into the kit? | adopt: export it from the components/app barrel, register it and spec it; the file and its 62 call sites stay where they are until a cleared migration | default (unanswered) | export and spec commits on this branch | migrate audit G-01 |
| G-02 | Fold ConfirmPreviewModal into ConfirmDialog? | keep it a composition: ConfirmDialog has no preview rows, warning or Back slots, and dropping them removes what the user checks | default (unanswered) | | migrate audit G-02 |
| G-03 | The app's de facto button is h-9 rounded-md with a solid destructive and a loading state; components/ui/button is h-8 rounded-lg with no loading prop. Add them to Button? | hold every Button migration until Button has the app's size, solid destructive and a pending state; documented in docs/system/button.md and registry.json | default (unanswered) | D-12 commit | migrate audit G-03, D4 finding 7 |
| G-04 | Add Checkbox and Textarea primitives (raw across forms)? | add them from shadcn base-nova | skipped (phase cap; no runtime to verify) | | migrate audit |
| G-05 | One chart text and axis constant beside CHART_TOOLTIP in lib/format.ts for 23 identical Recharts props? | add it and swap the 23 sites | skipped (an identical-value swap needs pixdiff at 0%, and no capture could run) | | migrate audit G-08 |
| G-06 | Identical-value swaps for the duplicate families the triage found | land each with a 0% pixdiff | skipped (dev server down, no captures) | | boss brief order 5 |
| G-07 | Pilot "Clear filters" is a raw button (10 copies app-wide). Give EmptyState an `onClear` rendering Button variant link? | yes, all 10 in one change | skipped (kit change, cap) | | S2 gate 1 |
| G-08 | Pilot file column `max-w-[220px]`: which scale step? | max-w-56 (224px, 4px wider) | default (unanswered) | pilot defaults commit | S2 gate 2 |
| G-09 | Drawer JSON scrollers `max-h-[60dvh]`: keep? | keep, allowlisted as a viewport-fraction cap | default (unanswered) | 787d50b | S2 gate 3 |
| G-10 | In-app "Open sale" link uses the ExternalLink glyph. Swap to ArrowRight? | ArrowRight, label unchanged | skipped (cap) | | S2 gate 4 |
| G-11 | One empty-value component for the 10 hand-typed "-" on the pilot (and app-wide)? | a kit EmptyValue showing "-" with an sr-only "None" | skipped (kit change, cap) | | S2 gate 5, D1 finding 6 |
| G-12 | Pilot dates shift width ("3 Nov" vs "23 Nov"). Make the whole When cell tabular? | tabular-nums on the outer span | default (unanswered) | pilot defaults commit | S2 gate 7 |
| G-13 | Long file names are only fully visible in a title tooltip. Let the drawer heading wrap? | entity-drawer.tsx:47 break-words instead of truncate | skipped (kit change, cap) | | S2 gate 6 |
| G-14 | Drawer Stage stat shows the raw action code | use formatAuditAction, as the table does (landed as D-09) | default (unanswered) | pilot defaults commit | S2 gate 9 |
| G-15 | ModalDialog uses the `open` attribute, not showModal: no Tab trap, no scroll lock behind it | add a focus trap and scroll lock, keeping toasts visible | skipped (kit change, cap) | | S2 and D4 finding 5 |
| G-16 | SectionTabs arrow-key focus may throw (e.currentTarget null inside requestAnimationFrame) and has no Home/End | save the list element before the frame; add Home and End | skipped (kit change, not reproduced live) | | D2 S1, S2 |
| G-17 | Does WhatsApp-only cover suppliers too? supplier-drawer.tsx:71 and supplier-columns.tsx:130 render tel: "Call" | leave suppliers as they are; reword the kit doc comments that suggest "Call" | skipped (outside scope; comment rewording is a kit edit) | | S1, D1, D3, D4 |

## Ledger

| Unit | Owner | Branch | Commit | Status | Verdict | Evidence |
|---|---|---|---|---|---|---|
| storybook | coordinator | ds/2026-11-23-harden | e15bb64 | done | verified | `npm run build-storybook` exit 0; storybook-static/index.json 252 entries (Foundations 7, App kit 169, Primitives 76) |
| stories:app-kit | S1 | ds/2026-11-23-harden | 27dce9d | done | verified with gaps | 19 files; S1 served its build and screenshot-checked 10 stories; SectionTabs URL mode does not switch on click under the navigation mock |
| stories:primitives | S2 | ds/2026-11-23-harden | 27dce9d | done | verified | 7 files; Playwright smoke over 69 stories: 0 page errors, 0 console errors |
| check | coordinator | ds/2026-11-23-harden | 3e7b771 | done | verified | `node scripts/check.mjs` exit 0; check-system self-test 82/82; check-spec self-test 56/56 |
| specs | D1 to D5 | ds/2026-11-23-harden | 1d6535b and later | done | verified with gaps | `node scripts/check-spec.mjs docs/system` 13 specs, 0 failures; Limits Not applicable in all (nothing measured), two_agent n/a |
| docs:generated | coordinator | ds/2026-11-23-harden | later regenerate commits | done | verified | `node scripts/gen-docs.mjs --check` 18 outputs, all fresh |
| pilot:/audit | S2, coordinator | ds/2026-11-23-harden | 787d50b and the pilot defaults commit | done | verified with gaps | checks-only: tsc 0, eslint 0, check-system --files 4 findings before, 3 after (all gated); no rendered capture |

## Handoff report

### Summary
Asked: "create a design system from the Ui update and put it on storybook". Answered: Storybook 10 runs the system (7 Foundations pages, 19 kit and 7 primitive story files, 252 stories), 13 components have specs that pass the spec check, and a check (`node scripts/check.mjs`) exits 0 and ratchets 646 existing findings.
Predicate: components met for the pilot's families (13 specs, 26 registered); token roles met (no new tokens, every role documented); checks met (self-tests pass, check exit 0 on this tree); pilot baseline not measured (dev server down), so the pilot part is checks-only.

### Gates, unanswered first
G-01 default (unanswered), FilterSelect exported from the kit. G-03 default (unanswered), Button migration held until Button gets the app's size, solid destructive and pending state. G-08, G-12, G-14 defaults landed on the pilot. G-02 and G-09 defaults keep things as they are. G-04 to G-07, G-10, G-11, G-13, G-15 to G-17 skipped at the cap.

### Checks
node scripts/check.mjs -> exit 0 (check-system 0 failing, 646 allowlisted in 151 files; check-spec 13 specs 0 failures; gen-docs --check 18 outputs fresh)
node scripts/check-system.mjs --self-test --fixtures <skills>/build-design-system/fixtures/check-system -> exit 0 (82 fixtures)
node scripts/check-spec.mjs --self-test --fixtures <skills>/build-design-system/fixtures/check-spec -> exit 0 (56 fixtures)
npm run build-storybook -> exit 0. npx tsc --noEmit -p tsconfig.json -> exit 0. npx eslint "app/(app)/audit" -> exit 0.
Clean clone: `git clone --branch ds/2026-11-23-harden` with the installed node_modules linked, `node scripts/check.mjs` -> exit 0 (it first failed on an untracked path cited in button.md, fixed). Not run: `npm run build` and production route status (no server could be started under the brief), montage.

### Screens
Changed: /audit (pilot: D-07, D-08, D-09, G-08, G-12). Unchanged: every other route; no clearance and no captures.

### What exists
- Token source app/globals.css (unchanged), Foundations pages in stories/foundations/
- Storybook: .storybook/main.ts, .storybook/preview.tsx, `npm run storybook`, `npm run build-storybook`
- Components components/app/ (kit, barrel now exports FilterSelect) and components/ui/, registry.json
- Specs docs/system/ with examples and rule-tests; twins, rules.md, index in public/system/, public/llms.txt (scripts/gen-docs.mjs)
- Checks: scripts/check.mjs, allowlist scripts/check-allowlist.json; AGENTS.md design-system block and generated index
- No migration map or codemod: no duplicate family was converged this run (G-03, G-06)

### Readiness
| Component | Grade | Reason |
|---|---|---|
| DataTable, EmptyState, StatusBadge, FilterBar, PeriodSelect, SectionTabs, PageHeader, OverflowMenu, SectionErrorBoundary, EntityDrawer, FilterSelect | ready with gaps | specs pass; Limits unmeasured; kit findings gated |
| Button | ready with gaps | 0 screen call sites; the app's buttons are hand-rolled (G-03) |
| Skeleton | ready with gaps | 17 of 19 loading regions unannounced |
| LocationSelect, KpiStrip, FormSheet, Segmented, Calendar, DateField, ConfirmDialog, UnsavedBar, Select, Switch, ModalDialog, PaginationControls, LoadingSkeletons | ready with gaps | story only, no spec (found, not fixed) |

### Trial
skipped (phase cap).

### The check cannot see
From `node scripts/check-system.mjs`: rendered contrast, behavior, layout, runtime class names, files outside the include folders, ui files missing from the drift list, by-hand rules.

### Next
From .design-system/close.md: 646 allowlisted findings in 151 files (trap/native-control 352, rule/arbitrary-value 110, rule/palette-use 104, rule/raw-value 33). Migration of the remaining screens is not run; hand it to migrate-design-system with .migration/2026-11-23-audit/.

### Found, not fixed
| ID | Severity | Route | What | Why not fixed | Fix |
|---|---|---|---|---|---|
| G-15 | blocking | shared | ModalDialog has no focus trap or scroll lock | gate | showModal or a trap plus scroll lock |
| G-16 | should-fix | shared | SectionTabs arrow-key focus may throw; no Home/End | gate | keep the list element before the frame |
| F-01 | should-fix | /audit | Pilot rendered before/after not captured | out of scope | capture /audit at 390 and 1280, both themes, once :3456 runs |
| F-02 | should-fix | shared | 14 registry components have no spec (LocationSelect, KpiStrip, FormSheet, Segmented, Calendar, DateField, ConfirmDialog, UnsavedBar, Select, Switch, ModalDialog, PaginationControls, LoadingSkeletons, plus usePagedList) | out of scope | component-docs per family |
| F-03 | should-fix | shared | DataTable refetch is silent to screen readers (no aria-busy), 6 skeleton rows whatever the page size, every checkbox "Select row" | gate | aria-busy, skeleton rows = page size, getRowLabel |
| F-04 | should-fix | shared | FilterBar chip remove and Clear all drop focus, no focus-visible style, 16px target | gate | focus next chip, focus-visible outline, 24px target |
| F-05 | should-fix | shared | PeriodSelect listbox has no arrow keys; Apply hovers when disabled; popup unnamed | gate | aria-pressed buttons, enabled:hover, aria-label |
| F-06 | should-fix | shared | SubmitButton spinner widens the box and drops focus | gate (G-03) | pending state on Button |
| F-07 | should-fix | shared | Select trigger has no open style, no light hover, popup ignores reduced motion | gate | data-popup-open style, hover:bg-muted, motion-reduce |
| F-08 | should-fix | shared | 646 allowlisted findings across 151 files | no clearance | migrate-design-system with the audit plan |
| F-09 | note | shared | components/ui files are not in a drift list (scripts/ui-drift.tsv) | out of scope | add rows and `--hash-stock` |
| F-10 | note | shared | check-spec call-site regex misses `<DataTable<T>`; example-export maps the barrel to one file | out of scope | report to the skill owner |

## Harden: system-prep for the migration (2026-11-23, 23:38 to 23:55 WAT)

Brief: close the gaps the migrate audit (.migration/2026-11-23-audit/plan.md) named for the system owner, so each duplicate family maps to a canonical member. Mode harden, foundation shadcn on base-ui, branch ds/2026-11-23-harden from 4f4f541. Workers: w-btn (Button spec, examples, stories) and w-ct (Checkbox, Textarea), both foreground, both closed.

### Decisions
| ID | Phase | Decision | Why | Proof |
|---|---|---|---|---|
| H-01 | 4 | Button gains size `control` (h-9 gap-2 rounded-md px-4), variant `destructive-solid` (bg-destructive text-destructive-foreground hover:bg-destructive/90) and a `loading` prop (disabled, focusableWhenDisabled, aria-busy, Loader2 before the label) | G-03 default: the app's de facto button is SubmitButton's h-9 rounded-md, solid destructive and pending state | esbuild + renderToStaticMarkup, old vs new Button: 192 variant x size x prop combos, 0 differing markup, so existing callers render unchanged |
| H-02 | 4 | `destructive-solid` uses `text-destructive-foreground`, not SubmitButton's `text-white` | `text-white` fails rule/palette-use; in light it is oklch(0.99 0 0), in dark #1A0306 on #F0707E (intended change, not measured for contrast) | Storybook measure: h 36, radius 6.4px, bg rgb(200,38,58) |
| H-03 | 4 | Registry: Button `replaces` components/submit-button.tsx; Checkbox and Textarea registered | G-03 closed, so D-12's hold lifts | node scripts/check.mjs exit 0 |
| H-04 | 5 | 16 findings the change surfaced are allowlisted as counted exceptions: 10 rule/deprecated-import (the SubmitButton importers, the migration's to move) and 6 trap/link-as-button or trap/button-clone (rounded-md now shared with Button) | an existing hand-rolled site is the migration's to move; scope bars app/** | check-system before: 21 failing; after: 0 failing, 661 allowlisted |
| H-05 | 4 | Checkbox (base-ui Checkbox.Root, rounded-sm) and Textarea (Input's classes, field-sizing-content min-h-16) with stories and specs | G-04 default | check-spec 15 specs 0 failures; Storybook: checkbox 16x16 role=checkbox aria-checked=true; textarea h 64 |
| H-06 | 3 | `CHART_TEXT` in lib/format.ts beside CHART_TOOLTIP: tick, legend, legendBelow, label, the exact values the Recharts props use (fontSize 12, fill or color var(--muted-foreground), paddingTop 8) | G-05/G-08 default; export only, call-site swaps are the migration's | tsc exit 0 |
| H-07 | 4 | ModalDialog traps Tab and Shift+Tab inside the topmost panel (popups portaled outside are left alone) and locks page scroll while any ModalDialog is open, restoring overflow and padding when the last closes | G-15 default (trap plus scroll lock, keeping the open attribute so toasts stay visible) | Playwright on primitives-modaldialog--closed: overflow visible, hidden while open, visible after; Tab order Confirm, Cancel, Confirm, Cancel, all inside the dialog; Escape returns focus to "Delete sale"; 0 page errors |
| H-08 | 4 | SectionTabs saves the list element before the frame and handles Home and End | G-16 default | Playwright on app-kit-sectiontabs--default: Right, Right, End, Home, Left move focus and selection together; 0 page errors. The old throw was not reproduced before the fix |

### Gates
| ID | Question | Default applied |
|---|---|---|
| H-G1 | Allowlist the 16 findings H-04 lists, or hold the `replaces` entry until the migration moves the 10 importers? | allowlisted; the migration burns them down |
| H-G2 | The loading spinner widens the button by 16px plus the gap (F-06 half fixed: focus kept, width not) | keep; measure in the verify pass |
| H-G3 | Checkbox radius rounded-sm renders 4.8px against shadcn's 4px | keep rounded-sm |
| H-G4 | Checkbox and Textarea specs hold no rules yet (0 call sites) | write rules after the 16 checkbox and 14 textarea raw sites move |
| H-G5 | Button `destructive-solid` and pending contrast not measured | measure in the verify pass |
| H-G6 | FilterSelect still lives at components/filter-select.tsx (G-01 move is outside this scope); hub-scope-filter has no canonical member (LocationSelect lacks the slot); confirm-preview-modal stays a composition (G-02) | no `replaces` for those three families |

### Families to canonical members
SubmitButton -> Button (size control; primary -> default, destructive -> destructive-solid; loading -> loading). FilterSelect -> FilterSelect (it is the canonical member, G-01). Raw checkbox -> Checkbox, raw textarea -> Textarea (new primitives, no `replaces` file). Recharts text props -> CHART_TEXT. ConfirmPreviewModal and HubScopeFilter: no canonical member (H-G6).

### Commands
- `node scripts/check.mjs`: exit 0 (check-system 0 failing, 661 allowlisted; check-spec 15 specs 0 failures; gen-docs --check fresh)
- `npm run build-storybook`: exit 0
- `npx tsc --noEmit -p .`: exit 0
- `capture.mjs --base http://localhost:3456 --status --routes` (20 static routes): 20 routes, 0 not as expected
