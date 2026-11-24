# Gates

Audit mode applied nothing. Re-pinned at 97369ef (2026-11-24 00:05) and reconciled with .design-system/run.md (Gates; Harden: system-prep) and registry.json; the edit run (clearance "Go, 4h", 23:38) applies each default on ds/2026-11-23-harden unless the person answers. Rows changed at the re-pin: G-01 (done), G-02 (merged with build G-02), G-03 (done), G-08 (system half done), G-12 (Checkbox, Textarea exist), every other `gate` to `default (unanswered)`; new G-16 and G-17. Defaults follow SKILL.md (Boundaries): a token or component the system lacks leaves the code as it is.

## G-01. FilterSelect and HubScope filters live outside the kit
Default: A. Status: done. Commit: e8e79e2 (barrel export, registry filter-select). From: migrate-audit; build G-01 and H-G6.
Re-pin: the build adopted FilterSelect (registry.json filter-select, import @/components/app, source components/filter-select.tsx), so it is the canonical member, not legacy; the file stays where it is (build G-01). HubScopeFilter has no canonical member (H-G6) and stays a product composition. Call sites repoint their deep import to "@/components/app" as an identical swap.
Opened: 2026-11-23T22:50. Asked: system owner (harden step).
Blocks: 34 call sites on 10 surfaces (inventory/current.tsv kind candidate, G-01). Everything else continues.
Options:
  A. Adopt FilterSelect into the kit as is (move components/filter-select.tsx to components/app, export it from the barrel, keep a re-export at the old path until callers move). The kit's own LocationSelect already renders it. HubScopeFilterBar stays a product composition.
  B. Treat both as legacy and replace them with components/ui/select at each call site (34 rewrites, loses the compact size and options mapping; parity.tsv gap: blocking).
Default if no answer by close: A, done by the system owner in the shared layer; until then the call sites stay as they are and are not counted as legacy.

## G-02. ConfirmPreviewModal versus the kit ConfirmDialog
Default: A. Status: default (unanswered). Merged with build G-02 (same question, same default, default (unanswered) in run.md). Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 6 call sites (inventory 5, suppliers 1).
Options:
  A. Keep ConfirmPreviewModal as a product composition (a preview-and-confirm step, a different job from ConfirmDialog); the owner may adopt it into the kit.
  B. Replace it with ConfirmDialog (drops the preview rows, warning and Back label: removes information the user checks, against the person's rule on never removing information).
Default if no answer by close: A, not legacy.

## G-03. SubmitButton, local button class constants and raw buttons versus components/ui/button
Default: A. Status: done. Commit: 97369ef (H-01 size control, destructive-solid, loading; H-03 registry Button replaces components/submit-button.tsx).
Re-pin: SubmitButton is legacy (legacy.txt `module @/components/submit-button`, `path components/submit-button.tsx`); the 10 imports migrate to Button size="control" (primary -> default, destructive -> destructive-solid, loading -> loading). The 12 local class constants and 192 raw buttons stay report-only (G-12). From: migrate-audit.
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
Default: B. Status: default (unanswered). Commit: -. From: migrate-audit (mapping/shared.md).
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 20 raw values on shared; every category tag and the category chart.
Options:
  A. Map categories onto the token rules (--brand-* for tags, series-1..4 plus series-other for charts): a visible colour change on every category tag.
  B. Keep the 20 hues, allowlisted with an owner and a removal date, as a known exception to "no per-feature hues".
Default if no answer by close: B.

## G-06. Hand-built segmented controls (rounded-[calc(var(--radius)-2px)])
Default: B. Status: default (unanswered). Commit: -. From: migrate-audit (mapping/shared-components.md, kitchen.md).
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 8 raw values in components/analytics-compare-tab.tsx, components/hub-scope-filter.tsx and app/(app)/kitchen/board.tsx.
Options:
  A. Swap each to the kit Segmented (component swap; same calc radius, so likely 0 px change, needs captures).
  B. Leave as is until a capture proves the swap is identical.
Default if no answer by close: B in audit; A is the pilot's codemod candidate.

## G-07. Gaps for the system owner: page width, chart heights, on-series text, sidebar widths
Default: allowlist. Status: default (unanswered). Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 6 max-w-[1400px] (analytics 3, credits, dashboard, sales), 15 chart and list heights, 2 on-series text colours (inventory), 3 sidebar widths.
Options:
  A. The owner adds a page-width container or token, size tokens for charts, on-series foreground tokens and sidebar width tokens; then identical swaps.
  B. Allowlist each with reason and owner (layout dimensions are not token jobs).
Default if no answer by close: B for chart heights and sidebar widths, A for the page width (6 copies of one value) and on-series text.

## G-08. Chart text and legend spacing written as numbers (fontSize: 12, paddingTop: 8)
Default: A. Status: default (unanswered). System half done at 97369ef (H-06: CHART_TEXT in lib/format.ts, merged with build G-05); the call-site swaps land per surface, each proven by pixdiff at 0. Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 23 rows on 8 surfaces.
Options:
  A. Export one chart text constant beside the tooltip style at lib/format.ts:66 (12 = --text-xs, 8 = spacing 2) and swap every Recharts tick, label and legend to it: identical values, no visible change.
  B. Allowlist them.
Default if no answer by close: A, the first codemod candidate.

## G-09. Sidebar label size text-[13px]
Default: B. Status: default (unanswered). Commit: -. From: migrate-audit (mapping/shared.md).
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 3 raw values in components/layout/sidebar.tsx.
Options:
  A. text-sm (14px, +1px).
  B. text-xs (12px, -1px), the smallest allowed size.
  C. Keep 13px, allowlisted.
Default if no answer by close: C (any change is visible on every page).

## G-10. Logo green #00A228 in components/brand/brand-mark.tsx
Default: B. Status: default (unanswered). Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: the person (brand).
Options:
  A. Add a logo token to app/globals.css (token owner).
  B. Allowlist it as a logo literal; components/brand is outside the system and the harden scope.
Default if no answer by close: B.

## G-11. Printed sale receipt styles (app/(app)/sales/sale-receipt.ts)
Default: A. Status: default (unanswered). Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 12 raw values on sales.
Options:
  A. Allowlist: the receipt is a separate document opened in a new window, where app CSS variables do not load.
  B. Inline the token values at print time from getComputedStyle (behaviour change in the print path).
Default if no answer by close: A.

## G-12. Raw form elements and buttons in the done predicate
Default: B. Status: default (unanswered). Re-pin: Checkbox and Textarea now exist (H-05) and Button has the app size (H-01), so option A is possible later; this run keeps bypasses report-only and does not swap the 38 native selects (budget; found-not-fixed). Commit: -. From: migrate-audit.
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 404 report-only bypass rows (192 <button>, 148 <input>, 38 <select>, 14 <textarea>, 12 local class constants).
Options:
  A. Count bypasses in the predicate (every raw control must become a system component; needs G-03 and a Checkbox, Textarea and Select decision first).
  B. Report them only; migrate the 38 native <select> first, since they open a white system menu in dark mode (components/filter-select.tsx:14).
Default if no answer by close: B.

## G-13. Dead palette maps in lib (81 palette rows with zero callers)
Default: A. Status: default (unanswered). Commit: -. From: migrate-audit (mapping/shared.md).
Opened: 2026-11-23T22:50. Asked: system owner.
Blocks: 81 of the 96 palette uses.
Options:
  A. Delete STAGE_BADGE, the class strings in paymentState(), ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass (zero callers in the repo; StageBadge and PaymentBadge already render StatusBadge).
  B. Keep them.
Default if no answer by close: A, as one Delete-legacy unit, after a repo-wide caller check at that commit.

## G-14. Kitchen quote print page uses slate palette (12 uses)
Default: B. Status: default (unanswered). Commit: -. From: migrate-audit (mapping/kitchen-quote.md).
Opened: 2026-11-23T22:50. Asked: the person.
Options:
  A. Map to text-foreground, text-muted-foreground, bg-muted, border-foreground (green-tinted neutrals instead of slate: visible on a customer-facing page).
  B. Leave as is.
Default if no answer by close: B.

## G-15. Password strength meter colours (bg-yellow-500, bg-green-500)
Default: A. Status: default (unanswered). Commit: -. From: migrate-audit (mapping/shared.md, settings.md).
Opened: 2026-11-23T22:50. Asked: the person.
Blocks: 3 live palette uses (lib/settings-helpers.ts:43-44, app/(app)/settings/password-section.tsx:36).
Options:
  A. bg-warning for Medium and bg-primary for Strong (the status colour rule: warning = pending/low, primary = good): a visible shade change.
  B. Keep the palette steps.
Default if no answer by close: A.

## G-16. Button default variant has no hover tint on a <button>
Default: A. Status: default (unanswered). Commit: -. From: migrate edit run (re-pin parity, parity.tsv submit-button rows).
Opened: 2026-11-24T00:05. Asked: system owner.
Blocks: nothing; applies to the 10 SubmitButton call sites.
Options:
  A. Accept Button as the system ships it: default is `bg-primary` with `[a]:hover:bg-primary/80` only, so the primary submit loses SubmitButton's `hover:bg-primary/90`; it gains the focus ring and the active nudge. destructive-solid keeps hover:bg-destructive/90.
  B. The owner adds a hover to Button's default variant (system change, outside this run).
Default if no answer by close: A, a mapped change shown by captures; no call-site className patches.

## G-17. Layout dimensions and fixed literals with no token
Default: allowlist. Status: default (unanswered). Commit: -. From: migrate edit run (re-pin).
Opened: 2026-11-24T00:05. Asked: system owner.
Blocks: nothing.
Covers: grid templates, viewport caps (max-h-[90vh], max-h-[60dvh], min-h-[60vh]), truncation widths, the timeline offset -left-[26px], the PIN tracking, the notifications panel width, the sidebar transition list, and the CHART_TEXT and CHART_TOOLTIP definitions in lib/format.ts (the constant itself, H-06).
Options:
  A. The owner adds size tokens for them.
  B. Allowlist each with reason and owner (G-07 B: layout dimensions are not token jobs).
Default if no answer by close: B.
