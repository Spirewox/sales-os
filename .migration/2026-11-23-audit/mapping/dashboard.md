# Token mapping: dashboard

Status: complete
Commit: none

## Summary
8 findings (raw and palette) on dashboard: gap 1, allowlist candidate 3, identical value, no class path 4. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/_dashboard/dashboard-content.tsx:67 | `max-w-[1400px]` | gap | - | page content max width; 6 places repeat it and no token or kit container holds it (max-w-7xl is 1280px) | system owner: a page-width token or container (G-07) |
| app/(app)/_dashboard/sales-panel.tsx:59 | `h-[220px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/_dashboard/sales-panel.tsx:68 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/_dashboard/sales-panel.tsx:69 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/_dashboard/sales-panel.tsx:88 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/_dashboard/sales-panel.tsx:89 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/_dashboard/top-customers.tsx:120 | `max-h-[260px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/_dashboard/top-customers.tsx:137 | `max-w-[220px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 8 of 8 rows classified (inventory/current.tsv, kinds raw and palette, surface dashboard).
