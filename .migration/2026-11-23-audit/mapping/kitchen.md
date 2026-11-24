# Token mapping: kitchen

Status: complete
Commit: none

## Summary
12 findings (raw and palette) on kitchen: mapped 1, allowlist candidate 11. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/kitchen/board.tsx:256 | `rounded-[calc(var(--radius)-2px)]` | mapped | rounded-md | 6px vs --radius-md 6.4px (+0.4px); the kit Segmented uses the same calc for its inner pill | prefer swapping the control to the kit Segmented (component swap, gate G-06) |
| app/(app)/kitchen/ingredients.tsx:197 | `grid-cols-[1fr_6rem]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/kitchen/job-form-sections.tsx:112 | `grid-cols-[1fr_1fr_auto]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/kitchen/job-form-sections.tsx:198 | `grid-cols-[1fr_7rem_auto]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/kitchen/job-form-sections.tsx:225 | `grid-cols-[1fr_1fr_5rem_8rem_auto]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/kitchen/job-form-sections.tsx:267 | `grid-cols-[1fr_5rem_7rem_8rem_auto]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/kitchen/job-form-sections.tsx:286 | `grid-cols-[1fr_5rem_5rem_8rem_auto]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/kitchen/job-panel-tabs.tsx:145 | `min-w-[28rem]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |
| app/(app)/kitchen/job-panel-tabs.tsx:266 | `-left-[26px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |
| app/(app)/kitchen/recipes.tsx:234 | `grid-cols-[1fr_8rem_auto]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/kitchen/settings.tsx:224 | `grid-cols-[1fr_5rem_9rem_auto]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/kitchen/yield-guide.tsx:40 | `grid-cols-[2fr_1fr_1fr]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 12 of 12 rows classified (inventory/current.tsv, kinds raw and palette, surface kitchen).
