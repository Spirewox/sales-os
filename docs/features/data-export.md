# Data export

Every list a person works from can be downloaded as Excel, CSV or PDF, holding every row its current filters match.

Plan: [2026-11-26-data-export.md](../superpowers/plans/2026-11-26-data-export.md). The plan was CSV only, with the
export hidden in a ⋯ menu. At the user's request (26 Nov) it became a **visible Export button** in each list's filter
bar, offering **Excel, CSV and PDF**, built on the filters.

## What a person sees

- An **Export** button at the end of the list's filter bar. It opens a menu: Excel (.xlsx), CSV (.csv), PDF (.pdf).
- The file holds **every row the filters, search, period and location match**, not just the page on screen.
- While it runs, a toast reads "Preparing customers…". When done: "Exported 248 customers."
- At the cap: "Exported the first 10,000 rows. Narrow the filters to get the rest."
- With no rows, the button is disabled.
- Who can export: anyone who can view that module (its existing view permission).

Lists with Export: Customers, Sales, Credits, Suppliers, Inventory (Stock, Stock movements, Stock requests),
Engagement (enquiries, feedback, compensations), POS transactions, Kitchen jobs, Audit trail, Settings → Users, and
every report in Analytics → Reports.

## File formats

| | Rule |
|---|---|
| Name | `fudfarmer-<module>-<YYYY-MM-DD>.<xlsx\|csv\|pdf>`, dated in Lagos time |
| Money | A plain number, no ₦ and no separators, so spreadsheets can add it up |
| Dates | `YYYY-MM-DD`, or `YYYY-MM-DD HH:mm` in Lagos time |
| CSV | UTF-8 with a BOM (so Excel reads ₦), every cell quoted, `\r\n` line ends |
| Excel | Written in the browser by `lib/xlsx.ts`, with no dependency |
| PDF | `jspdf` and `jspdf-autotable`, loaded only when a PDF is asked for. The header has the title, the filters in force and when it was exported |
| Cap | 10,000 rows (`EXPORT_ROW_CAP`), fetched 200 a page |

## How it works

- `lib/export.ts`: the pure core. `buildCsv`, `exportFilename`, `fetchExportRows` (pages until a page is empty, the
  last page is reached or the cap is hit), `fetchExportRowsByCursor` for cursor-paged lists, `filterLabels`,
  `exportToast`, `saveFile`.
- `hooks/use-export.ts`: `useExport({ module, title, noun, columns, filters, fetchPage | fetchCursor, select, pageSize, disabled })`
  returns `{ run, pending, menu }`. `menu` is the Export button; put it in the list's `FilterBar` actions.
- `lib/exports/<module>.ts`: each list's columns, one file per module, each with a test.

To add an export to a new list, write its columns in `lib/exports/`, then call `useExport` with a `fetchPage` that
asks the list endpoint for a page with the same filters as the screen.

## Backend

None. Exports page through the existing list endpoints from the browser.
