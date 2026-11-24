# Token mapping: audit

Status: complete
Commit: none

## Summary
3 findings (raw and palette) on audit: allowlist candidate 3. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/audit/audit-drawer.tsx:90 | `max-h-[60vh]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| app/(app)/audit/audit-drawer.tsx:91 | `max-h-[60vh]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| app/(app)/audit/page.tsx:153 | `max-w-[220px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 3 of 3 rows classified (inventory/current.tsv, kinds raw and palette, surface audit).
