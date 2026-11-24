# Token mapping: customers

Status: complete
Commit: none

## Summary
4 findings (raw and palette) on customers: allowlist candidate 2, identical value, no class path 2. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/customers/customer-import-modal.tsx:60 | `max-h-[90vh]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| app/(app)/customers/customer-import-summary.tsx:20 | `max-h-[90vh]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| app/(app)/customers/customer-overview-tab.tsx:106 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/customers/customer-overview-tab.tsx:107 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 4 of 4 rows classified (inventory/current.tsv, kinds raw and palette, surface customers).
