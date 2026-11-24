# Token mapping: sales

Status: complete
Commit: none

## Summary
19 findings (raw and palette) on sales: allowlist candidate 18, gap 1. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/sales/page.tsx:40 | `max-w-[240px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |
| app/(app)/sales/page.tsx:96 | `max-w-[1400px]` | gap | - | page content max width; 6 places repeat it and no token or kit container holds it (max-w-7xl is 1280px) | system owner: a page-width token or container (G-07) |
| app/(app)/sales/sale-detail-tabs.tsx:477 | `max-w-[350px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |
| app/(app)/sales/sale-receipt.ts:19 | `#111` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:19 | `font:14px` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:19 | `margin:24px` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:20 | `#555` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:20 | `font-size:12px` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:20 | `font-size:18px` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:20 | `margin:0 0 2px` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:21 | `margin-top:16px` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:21 | `padding:4px` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:22 | `#999` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:22 | `margin:12px` | allowlist candidate | - | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sale-receipt.ts:37 | `#b91c1c` | allowlist candidate | --destructive (#C8263A light) if tokens are inlined | printed receipt written into a new window with its own <style>; app CSS variables do not load there | gate G-11 |
| app/(app)/sales/sales-import-modal.tsx:70 | `max-h-[90vh]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| app/(app)/sales/sales-import-modal.tsx:194 | `min-w-[200px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |
| app/(app)/sales/sales-import-modal.tsx:207 | `max-w-[180px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |
| app/(app)/sales/sales-import-modal.tsx:229 | `max-w-[280px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 19 of 19 rows classified (inventory/current.tsv, kinds raw and palette, surface sales).
