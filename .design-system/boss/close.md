# Close: Sales OS design system (harden + Storybook)

Run branch ds/2026-11-23-harden, from fd336f4. Measured 2026-11-23 23:2x by the boss.

| # | Figure | Value | Unit | Source |
|---|---|---|---|---|
| 1 | Storybook stories | 226 | stories (index.json type=story) | http://localhost:6006/index.json, boss fetch |
| 2 | Storybook titles | 27 | component/foundation pages | same |
| 3 | Stories rendering with errors | 0 | stories, of 226 | iframe render sweep, boss, sb-show-main vs sb-show-errordisplay |
| 4 | Foundations pages | 7 | pages | stories/foundations (Overview, Colour, Status, Charts, Type, Radius, Spacing) |
| 5 | Component specs | 13 | specs | triage/after/signals.tsv component_specs |
| 6 | Specs failing check-spec | 0 | specs | clean clone `node scripts/check.mjs` exit 0 |
| 7 | Design-system check on clean clone | 0 | exit code | clean clone of ds/2026-11-23-harden, `node scripts/check.mjs` |
| 8 | Generated docs outputs, stale | 0 of 18 | outputs | same run, gen-docs --check |
| 9 | Registry entries | 27 | components | registry.json |
| 10 | Storybook build | 0 | exit code | harden return, `npm run build-storybook` |
| 11 | Pilot /audit axe violations | 0 | violations, light and dark | boss, axe 4.10.2 WCAG 2 A/AA |
| 12 | Pilot rows kept during page change | 25 of 25 | rows, while aria-busy | boss, sampled every 60ms |
| 13 | Raw colour lines in product code | 30 before, 30 after | lines | triage vs triage/after raw-colors.txt, stories/ excluded |
| 14 | Raw colour lines in stories/foundations/token-data.ts | 40 | lines (token value documentation) | triage/after/raw-colors.txt |
| 15 | Families with 2+ members | 7 before, 7 after | families | signals.tsv |
| 16 | Migration offer | 17 surfaces, 6 families, ~4h | surfaces | .migration/2026-11-23-audit/plan.md |

## Found, not fixed
| Rank | Item | Why not | Where |
|---|---|---|---|
| 1 | Button: app uses h-9 rounded-md with solid destructive and loading; components/ui/button is h-8 rounded-lg, no loading (blocks SubmitButton convergence) | gate G-03, system change | .design-system/run.md G-03 |
| 2 | 14 components have stories but no spec: LocationSelect, KpiStrip, FormSheet, Segmented, Calendar, DateField, ConfirmDialog, UnsavedBar, Select, Switch, ModalDialog, PaginationControls, LoadingSkeletons, usePagedList | cap | run.md Handoff |
| 3 | ModalDialog has no focus trap or scroll lock | G-15, skipped at cap | run.md |
| 4 | SectionTabs arrow-key focus may throw | G-16 | run.md |
| 5 | Kit accessibility gaps in DataTable, FilterBar, PeriodSelect, Select | cap | run.md Handoff |
| 6 | No Checkbox or Textarea primitive | G-04, skipped at cap | run.md, plan.md |
| 7 | 23 identical Recharts number props, no shared chart text constant | G-05/G-08, needs pixel proof | plan.md G-08 |
| 8 | 7 duplicate families not converged (FilterSelect adopted into kit; ConfirmPreviewModal kept as composition) | migration needs clearance | plan.md |
| 9 | 646 allowlisted check findings in 151 files | migration scope | scripts/check-allowlist.json |
| 10 | Migration audit pinned at e15bb64, before harden's commits; product paths changed after pin only in app/(app)/audit and components/app/index.ts | re-pin at migration start | inventory/pin.txt |
| 11 | Supplier Call actions vs WhatsApp-only rule | G-17; person limited the rule to customers | run.md G-17 |
| 12 | SectionTabs URL mode does not switch tabs under the Storybook router mock | Storybook mock limit | stories/app-kit |
