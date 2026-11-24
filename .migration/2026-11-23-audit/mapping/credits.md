# Token mapping: credits

Status: complete
Commit: none

## Summary
1 findings (raw and palette) on credits: gap 1. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/credits/page.tsx:146 | `max-w-[1400px]` | gap | - | page content max width; 6 places repeat it and no token or kit container holds it (max-w-7xl is 1280px) | system owner: a page-width token or container (G-07) |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 1 of 1 rows classified (inventory/current.tsv, kinds raw and palette, surface credits).
