# Token mapping: inventory

Status: complete
Commit: none

## Summary
7 findings (raw and palette) on inventory: allowlist candidate 3, mapped 1, gap 1, identical value, no class path 2. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/inventory/inventory-import-modal.tsx:52 | `max-h-[90vh]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| app/(app)/inventory/inventory-import-modal.tsx:130 | `max-w-[180px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |
| app/(app)/inventory/page.tsx:186 | `min-h-[60vh]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| app/(app)/inventory/product-drawer-panels.tsx:88 | `text-[#06140b]` | mapped | dark:text-primary-foreground | B2B label on a series-1 fill in dark; --primary-foreground dark is #040c06 | near, not identical: visible |
| app/(app)/inventory/product-drawer-panels.tsx:89 | `text-[#1a0610]` | gap | - | B2C label on a series-2 (plum) fill in dark; no on-series foreground token (--destructive-foreground dark #1A0306 is a red, wrong job) | system owner: on-series foreground tokens (G-07) |
| app/(app)/inventory/sales-trends.tsx:70 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/inventory/sales-trends.tsx:71 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 7 of 7 rows classified (inventory/current.tsv, kinds raw and palette, surface inventory).
