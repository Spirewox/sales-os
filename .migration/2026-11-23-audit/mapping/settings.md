# Token mapping: settings

Status: complete
Commit: none

## Summary
4 findings (raw and palette) on settings: allowlist candidate 3, mapped 1. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/settings/page.tsx:53 | `grid-cols-[12rem_minmax(0,1fr)]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/settings/page.tsx:53 | `grid-cols-[14rem_minmax(0,1fr)]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/settings/password-section.tsx:36 | `bg-yellow-500` | mapped | bg-warning | compares the meter class string; changes with settings-helpers.ts:43 | same change as settings-helpers.ts:43 |
| app/(app)/settings/password-section.tsx:48 | `max-w-[calc(50%-0.5rem)]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 4 of 4 rows classified (inventory/current.tsv, kinds raw and palette, surface settings).
