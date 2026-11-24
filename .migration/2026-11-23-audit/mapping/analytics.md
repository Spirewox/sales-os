# Token mapping: analytics

Status: complete
Commit: none

## Summary
18 findings (raw and palette) on analytics: identical value, no class path 3, allowlist candidate 12, gap 3. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/(app)/analytics/analytics-ui.tsx:13 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/analytics/analytics-ui.tsx:16 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| app/(app)/analytics/credit-tab.tsx:77 | `h-[280px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/credit-tab.tsx:86 | `paddingTop: 8` | identical value, no class path | spacing 2 (0.5rem = 8px) | Recharts Legend wrapperStyle | same constant as the chart text (G-08) |
| app/(app)/analytics/customers-tab.tsx:79 | `h-[300px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/customers-tab.tsx:106 | `h-[280px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/explore-ask.tsx:175 | `max-h-[520px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/explore-shared.tsx:33 | `h-[320px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/explore-shared.tsx:103 | `grid-cols-[minmax(280px,340px)_1fr]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| app/(app)/analytics/inventory-tab.tsx:130 | `h-[260px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/page.tsx:74 | `max-w-[1400px]` | gap | - | page content max width; 6 places repeat it and no token or kit container holds it (max-w-7xl is 1280px) | system owner: a page-width token or container (G-07) |
| app/(app)/analytics/page.tsx:108 | `max-w-[1400px]` | gap | - | page content max width; 6 places repeat it and no token or kit container holds it (max-w-7xl is 1280px) | system owner: a page-width token or container (G-07) |
| app/(app)/analytics/page.tsx:119 | `max-w-[1400px]` | gap | - | page content max width; 6 places repeat it and no token or kit container holds it (max-w-7xl is 1280px) | system owner: a page-width token or container (G-07) |
| app/(app)/analytics/products-tab.tsx:72 | `h-[340px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/sales-tab.tsx:120 | `h-[300px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/sales-tab.tsx:157 | `h-[260px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/sales-tab.tsx:178 | `h-[260px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| app/(app)/analytics/suppliers-tab.tsx:180 | `h-[280px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 18 of 18 rows classified (inventory/current.tsv, kinds raw and palette, surface analytics).
