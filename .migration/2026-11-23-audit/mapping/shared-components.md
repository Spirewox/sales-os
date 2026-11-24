# Token mapping: shared-components

Status: complete
Commit: none

## Summary
21 findings (raw and palette) on shared-components: mapped 7, allowlist candidate 8, identical value, no class path 4, gap 2. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| components/analytics-compare-tab.tsx:165 | `rounded-[calc(var(--radius)-2px)]` | mapped | rounded-md | 6px vs --radius-md 6.4px (+0.4px); the kit Segmented uses the same calc for its inner pill | prefer swapping the control to the kit Segmented (component swap, gate G-06) |
| components/analytics-compare-tab.tsx:184 | `rounded-[calc(var(--radius)-2px)]` | mapped | rounded-md | 6px vs --radius-md 6.4px (+0.4px); the kit Segmented uses the same calc for its inner pill | prefer swapping the control to the kit Segmented (component swap, gate G-06) |
| components/analytics-compare-tab.tsx:204 | `rounded-[calc(var(--radius)-2px)]` | mapped | rounded-md | 6px vs --radius-md 6.4px (+0.4px); the kit Segmented uses the same calc for its inner pill | prefer swapping the control to the kit Segmented (component swap, gate G-06) |
| components/analytics-compare-tab.tsx:215 | `grid-cols-[1fr_auto_1fr]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| components/analytics-compare-tab.tsx:292 | `rounded-[calc(var(--radius)-2px)]` | mapped | rounded-md | 6px vs --radius-md 6.4px (+0.4px); the kit Segmented uses the same calc for its inner pill | prefer swapping the control to the kit Segmented (component swap, gate G-06) |
| components/analytics-compare-tab.tsx:300 | `rounded-[calc(var(--radius)-2px)]` | mapped | rounded-md | 6px vs --radius-md 6.4px (+0.4px); the kit Segmented uses the same calc for its inner pill | prefer swapping the control to the kit Segmented (component swap, gate G-06) |
| components/analytics-compare-tab.tsx:317 | `h-[360px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| components/analytics-compare-tab.tsx:329 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| components/analytics-compare-tab.tsx:330 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| components/analytics-compare-tab.tsx:340 | `fontSize: 12` | identical value, no class path | --text-xs (0.75rem = 12px) | Recharts tick/label prop takes a number, so a class cannot reach it; lib/format.ts:66 already holds the tooltip copy | export one chart text constant (gap G-08), then an identical swap |
| components/analytics-compare-tab.tsx:358 | `grid-cols-[1fr_auto_auto]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| components/analytics-compare-tab.tsx:358 | `grid-cols-[minmax(120px,1fr)_1fr_1fr]` | allowlist candidate | - | grid track template for one form or table layout, not a token job | allowlist with reason |
| components/brand/brand-mark.tsx:22 | `text-[#00A228]` | gap | - | logo mark green #00A228; --brand-green is #109648 and --primary is oklch(0.48 0.17 150) | brand owner: keep as a logo literal (allowlist) or add a logo token (G-10) |
| components/confirm-preview-modal.tsx:40 | `max-h-[90vh]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| components/hub-scope-filter.tsx:82 | `rounded-[calc(var(--radius)-2px)]` | mapped | rounded-md | 6px vs --radius-md 6.4px (+0.4px); the kit Segmented uses the same calc for its inner pill | prefer swapping the control to the kit Segmented (component swap, gate G-06) |
| components/hub-scope-filter.tsx:97 | `rounded-[calc(var(--radius)-2px)]` | mapped | rounded-md | 6px vs --radius-md 6.4px (+0.4px); the kit Segmented uses the same calc for its inner pill | prefer swapping the control to the kit Segmented (component swap, gate G-06) |
| components/kitchen-analytics-tab.tsx:73 | `h-[280px]` | allowlist candidate | - | chart or list height; no size token covers a chart height | gap list: chart heights (G-07) |
| components/kitchen-analytics-tab.tsx:82 | `paddingTop: 8` | identical value, no class path | spacing 2 (0.5rem = 8px) | Recharts Legend wrapperStyle | same constant as the chart text (G-08) |
| components/sku-multi-select.tsx:121 | `max-w-[180px]` | allowlist candidate | - | truncation or column width for one cell | allowlist with reason |
| components/sku-multi-select.tsx:132 | `max-w-[80vw]` | allowlist candidate | - | viewport-relative or computed layout limit, not a token job | allowlist with reason |
| components/till-registration.tsx:66 | `tracking-[0.25em]` | gap | - | PIN digit tracking; no letter-spacing tokens | allowlist with reason |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 21 of 21 rows classified (inventory/current.tsv, kinds raw and palette, surface shared-components).
