# Gates

Audit mode applies nothing, so every gate reads `gate` with its default listed. A later full run applies each default on its run branch unless the person answers. Defaults follow SKILL.md (Boundaries): a token or component the system lacks leaves the code as it is.

## G-01. FilterSelect and HubScope filters live outside the kit
Default: A. Status: gate. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner (harden step).
Blocks: 34 call sites on 10 surfaces (inventory/current.tsv kind candidate, G-01). Everything else continues.
Options:
  A. Adopt FilterSelect into the kit as is (move components/filter-select.tsx to components/app, export it from the barrel, keep a re-export at the old path until callers move). The kit's own LocationSelect already renders it. HubScopeFilterBar stays a product composition.
  B. Treat both as legacy and replace them with components/ui/select at each call site (34 rewrites, loses the compact size and options mapping; parity.tsv gap: blocking).
Default if no answer by close: A, done by the system owner in the shared layer; until then the call sites stay as they are and are not counted as legacy.

## G-02. ConfirmPreviewModal versus the kit ConfirmDialog
Default: A. Status: gate. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 6 call sites (inventory 5, suppliers 1).
Options:
  A. Keep ConfirmPreviewModal as a product composition (a preview-and-confirm step, a different job from ConfirmDialog); the owner may adopt it into the kit.
  B. Replace it with ConfirmDialog (drops the preview rows, warning and Back label: removes information the user checks, against the person's rule on never removing information).
Default if no answer by close: A, not legacy.

## G-03. SubmitButton, local button class constants and raw buttons versus components/ui/button
Default: A. Status: gate. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 10 SubmitButton call sites, 12 local class constants, 192 raw <button> elements (report-only bypasses).
Options:
  A. The owner adds the app's button (h-9, rounded-md, primary/secondary/ghost/destructive, loading) to the system, as a customized components/ui/button or a kit Button, before any swap. Then SubmitButton, btnPrimary/btnSecondary/BTN_PRIMARY and raw buttons migrate to it.
  B. Swap to components/ui/button as it ships (h-8 rounded-lg, destructive is a tint, no loading): a visible change on every screen and a lost double-submit guard (parity.tsv gap: blocking).
Default if no answer by close: A; nothing moves until the system has that button.

## G-04. PaginationControls listed as a candidate
Default: drop. Status: skipped (decided: kit primitive). Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:47. Its only importer is the kit's own DataTable (components/app/data-table.tsx:7), so it is a system primitive, not legacy. decisions.tsv row 2026-11-23T22:47.

## G-05. Product category colours (lib/product-categories.ts, 20 hex values)
Default: B. Status: gate. Commit: -. From: migrate-audit (mapping/shared.md).
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 20 raw values on shared; every category tag and the category chart.
Options:
  A. Map categories onto the token rules (--brand-* for tags, series-1..4 plus series-other for charts): a visible colour change on every category tag.
  B. Keep the 20 hues, allowlisted with an owner and a removal date, as a known exception to "no per-feature hues".
Default if no answer by close: B.

## G-06. Hand-built segmented controls (rounded-[calc(var(--radius)-2px)])
Default: B. Status: gate. Commit: -. From: migrate-audit (mapping/shared-components.md, kitchen.md).
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 8 raw values in components/analytics-compare-tab.tsx, components/hub-scope-filter.tsx and app/(app)/kitchen/board.tsx.
Options:
  A. Swap each to the kit Segmented (component swap; same calc radius, so likely 0 px change, needs captures).
  B. Leave as is until a capture proves the swap is identical.
Default if no answer by close: B in audit; A is the pilot's codemod candidate.

## G-07. Gaps for the system owner: page width, chart heights, on-series text, sidebar widths
Default: allowlist. Status: gate. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 6 max-w-[1400px] (analytics 3, credits, dashboard, sales), 15 chart and list heights, 2 on-series text colours (inventory), 3 sidebar widths.
Options:
  A. The owner adds a page-width container or token, size tokens for charts, on-series foreground tokens and sidebar width tokens; then identical swaps.
  B. Allowlist each with reason and owner (layout dimensions are not token jobs).
Default if no answer by close: B for chart heights and sidebar widths, A for the page width (6 copies of one value) and on-series text.

## G-08. Chart text and legend spacing written as numbers (fontSize: 12, paddingTop: 8)
Default: A. Status: gate. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 23 rows on 8 surfaces.
Options:
  A. Export one chart text constant beside the tooltip style at lib/format.ts:66 (12 = --text-xs, 8 = spacing 2) and swap every Recharts tick, label and legend to it: identical values, no visible change.
  B. Allowlist them.
Default if no answer by close: A, the first codemod candidate.

## G-09. Sidebar label size text-[13px]
Default: B. Status: gate. Commit: -. From: migrate-audit (mapping/shared.md).
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 3 raw values in components/layout/sidebar.tsx.
Options:
  A. text-sm (14px, +1px).
  B. text-xs (12px, -1px), the smallest allowed size.
  C. Keep 13px, allowlisted.
Default if no answer by close: C (any change is visible on every page).

## G-10. Logo green #00A228 in components/brand/brand-mark.tsx
Default: B. Status: gate. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: the person (brand).
Options:
  A. Add a logo token to app/globals.css (token owner).
  B. Allowlist it as a logo literal; components/brand is outside the system and the harden scope.
Default if no answer by close: B.

## G-11. Printed sale receipt styles (app/(app)/sales/sale-receipt.ts)
Default: A. Status: gate. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 12 raw values on sales.
Options:
  A. Allowlist: the receipt is a separate document opened in a new window, where app CSS variables do not load.
  B. Inline the token values at print time from getComputedStyle (behaviour change in the print path).
Default if no answer by close: A.

## G-12. Raw form elements and buttons in the done predicate
Default: B. Status: gate. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 404 report-only bypass rows (192 <button>, 148 <input>, 38 <select>, 14 <textarea>, 12 local class constants).
Options:
  A. Count bypasses in the predicate (every raw control must become a system component; needs G-03 and a Checkbox, Textarea and Select decision first).
  B. Report them only; migrate the 38 native <select> first, since they open a white system menu in dark mode (components/filter-select.tsx:14).
Default if no answer by close: B.

## G-13. Dead palette maps in lib (81 palette rows with zero callers)
Default: A. Status: gate. Commit: -. From: migrate-audit (mapping/shared.md).
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 81 of the 96 palette uses.
Options:
  A. Delete STAGE_BADGE, the class strings in paymentState(), ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass (zero callers in the repo; StageBadge and PaymentBadge already render StatusBadge).
  B. Keep them.
Default if no answer by close: A, as one Delete-legacy unit, after a repo-wide caller check at that commit.

## G-14. Kitchen quote print page uses slate palette (12 uses)
Default: B. Status: gate. Commit: -. From: migrate-audit (mapping/kitchen-quote.md).
Opened: 2026-11-23T22:50. Asked: the person.
Options:
  A. Map to text-foreground, text-muted-foreground, bg-muted, border-foreground (green-tinted neutrals instead of slate: visible on a customer-facing page).
  B. Leave as is.
Default if no answer by close: B.

## G-15. Password strength meter colours (bg-yellow-500, bg-green-500)
Default: A. Status: gate. Commit: -. From: migrate-audit (mapping/shared.md, settings.md).
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 3 live palette uses (lib/settings-helpers.ts:43-44, app/(app)/settings/password-section.tsx:36).
Options:
  A. bg-warning for Medium and bg-primary for Strong (the status colour rule: warning = pending/low, primary = good): a visible shade change.
  B. Keep the palette steps.
Default if no answer by close: A.
