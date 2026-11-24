# Token mapping: suppliers

Status: complete
Commit: none

## Summary
5 findings (raw and palette) on suppliers: allowlist candidate 1, identical value, no class path 4. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/suppliers/supplier-details-tab.tsx:11 | `grid-cols-[8rem_1fr]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/suppliers/supplier-performance-tab.tsx:168 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/suppliers/supplier-performance-tab.tsx:169 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/suppliers/supplier-purchases-tab.tsx:65 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/suppliers/supplier-purchases-tab.tsx:66 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 5 of 5 rows classified (inventory/current.tsv, kinds raw and palette, surface suppliers).
