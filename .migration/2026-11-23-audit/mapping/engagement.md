# Token mapping: engagement

Status: complete
Commit: none

## Summary
3 findings (raw and palette) on engagement: identical value, no class path 3. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/engagement/interaction-insights.tsx:42 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/engagement/interaction-insights.tsx:56 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/engagement/interaction-insights.tsx:57 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 3 of 3 rows classified (inventory/current.tsv, kinds raw and palette, surface engagement).
