# Token mapping: shared

Status: complete
Commit: none

## Summary
112 findings (raw and palette) on shared: allowlist candidate 5, ambiguous 3, identical value, no class path 1, dead code 81, gap 20, mapped 2. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| components/layout/sidebar.tsx:152 | `transition-[transform,visibility,width]` | allowlist candidate | - | transition-property list, not a value | allowlist with reason |
| components/layout/sidebar.tsx:152 | `w-[260px]` | allowlist candidate | - | sidebar rail and panel widths; no width tokens | system owner: sidebar width tokens, or allowlist |
| components/layout/sidebar.tsx:154 | `w-[68px]` | allowlist candidate | - | sidebar rail and panel widths; no width tokens | system owner: sidebar width tokens, or allowlist |
| components/layout/sidebar.tsx:208 | `text-[13px]` | ambiguous | text-xs (12px, -1px) or text-sm (14px, +1px) | sidebar nav labels | gate G-09 |
| components/layout/sidebar.tsx:238 | `text-[13px]` | ambiguous | text-xs (12px, -1px) or text-sm (14px, +1px) | sidebar nav labels | gate G-09 |
| components/layout/sidebar.tsx:273 | `text-[13px]` | ambiguous | text-xs (12px, -1px) or text-sm (14px, +1px) | sidebar nav labels | gate G-09 |
| components/layout/sidebar.tsx:281 | `w-[244px]` | allowlist candidate | - | sidebar rail and panel widths; no width tokens | system owner: sidebar width tokens, or allowlist |
| contexts/crm-notifications-context.tsx:192 | `w-[min(22rem,calc(100vw-2rem))]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| lib/format.ts:66 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| lib/kitchen-types.ts:257 | `bg-green-100` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:257 | `bg-green-900` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:257 | `text-green-400` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:257 | `text-green-800` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:258 | `bg-yellow-100` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:258 | `bg-yellow-900` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:258 | `text-yellow-400` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:258 | `text-yellow-800` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:259 | `bg-orange-100` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:259 | `bg-orange-900` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:259 | `text-orange-400` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:259 | `text-orange-800` | dead code | - | paymentState().className is never read; PaymentBadge renders StatusBadge from the label (app/(app)/kitchen/kitchen-ui.tsx:44) | delete with the dead export |
| lib/kitchen-types.ts:264 | `bg-blue-100` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:264 | `bg-blue-900` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:264 | `text-blue-400` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:264 | `text-blue-800` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:265 | `bg-red-100` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:265 | `bg-red-900` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:265 | `text-red-400` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:265 | `text-red-800` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:266 | `bg-amber-100` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:266 | `bg-amber-900` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:266 | `text-amber-400` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:266 | `text-amber-800` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:267 | `bg-orange-100` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:267 | `bg-orange-900` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:267 | `text-orange-400` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:267 | `text-orange-800` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:268 | `bg-green-100` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:268 | `bg-green-900` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:268 | `text-green-400` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:268 | `text-green-800` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:269 | `bg-emerald-100` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:269 | `bg-emerald-900` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:269 | `text-emerald-400` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:269 | `text-emerald-800` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:270 | `bg-slate-100` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:270 | `bg-slate-800` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:270 | `text-slate-300` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:270 | `text-slate-700` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:271 | `bg-slate-100` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:271 | `bg-slate-800` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:271 | `text-slate-300` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:271 | `text-slate-700` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:272 | `bg-red-50` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:272 | `bg-red-900` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:272 | `text-red-400` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/kitchen-types.ts:272 | `text-red-700` | dead code | - | STAGE_BADGE has zero importers; StageBadge renders StatusBadge (kitchen-ui.tsx:40) | delete with the dead export |
| lib/product-categories.ts:27 | `#0891b2` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:28 | `#0e7490` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:29 | `#ea580c` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:30 | `#7c3aed` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:31 | `#b91c1c` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:32 | `#991b1b` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:33 | `#7f1d1d` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:34 | `#9f1239` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:35 | `#dc2626` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:36 | `#ca8a04` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:37 | `#16a34a` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:38 | `#15803d` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:39 | `#2563eb` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:40 | `#3b82f6` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:41 | `#1d4ed8` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:42 | `#1e40af` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:43 | `#f59e0b` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:44 | `#db2777` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:45 | `#a855f7` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/product-categories.ts:46 | `#6b7280` | gap | - | per-category hue; the token rules allow --brand-* for category tags (6 hues) and series-1..4 for charts, never a new hue; 20 categories | gate G-05 |
| lib/settings-helpers.ts:6 | `bg-red-100` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:6 | `bg-red-900` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:6 | `text-red-400` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:6 | `text-red-700` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:7 | `bg-blue-100` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:7 | `bg-blue-900` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:7 | `text-blue-400` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:7 | `text-blue-700` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:8 | `bg-emerald-100` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:8 | `bg-emerald-900` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:8 | `text-emerald-400` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:8 | `text-emerald-700` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:9 | `bg-purple-100` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:9 | `bg-purple-900` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:9 | `text-purple-400` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:9 | `text-purple-700` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:10 | `bg-amber-100` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:10 | `bg-amber-900` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:10 | `text-amber-400` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:10 | `text-amber-800` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:11 | `bg-orange-100` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:11 | `bg-orange-900` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:11 | `text-orange-400` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:11 | `text-orange-800` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:22 | `bg-slate-100` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:22 | `bg-slate-800` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:22 | `text-slate-300` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:22 | `text-slate-700` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:43 | `bg-yellow-500` | mapped | bg-warning | password strength meter fill, live (password-section.tsx:32); visual rules: warning = pending/low, primary = good | yellow-500 to --warning #8A6A05 light / #FFC40B dark: visible hue change |
| lib/settings-helpers.ts:44 | `bg-green-500` | mapped | bg-primary | password strength meter fill, live (password-section.tsx:32); visual rules: warning = pending/low, primary = good | green-500 to --primary oklch(0.48 0.17 150): visible shade change |
| lib/settings-helpers.ts:49 | `bg-yellow-500` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:49 | `text-yellow-400` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:49 | `text-yellow-600` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:50 | `text-green-400` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |
| lib/settings-helpers.ts:50 | `text-green-600` | dead code | - | ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass and getPasswordStrengthTextClass have zero callers outside the file | delete with the dead export |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 112 of 112 rows classified (inventory/current.tsv, kinds raw and palette, surface shared).
