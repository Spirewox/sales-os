# Token mapping: kitchen-quote

Status: complete
Commit: none

## Summary
12 findings (raw and palette) on kitchen-quote: mapped 12. Identical-value class swaps: 0.

## Mapping
| file:line | value | class | candidate token | reason | difference / next |
|---|---|---|---|---|---|
| app/kitchen-quote/[id]/page.tsx:38 | `text-slate-900` | mapped | text-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:44 | `text-slate-600` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:45 | `text-slate-600` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:51 | `text-slate-500` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:54 | `text-slate-600` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:57 | `text-slate-500` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:59 | `text-slate-600` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:64 | `bg-slate-50` | mapped | bg-muted | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:64 | `text-slate-500` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:72 | `border-slate-900` | mapped | border-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:76 | `text-slate-600` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |
| app/kitchen-quote/[id]/page.tsx:83 | `text-slate-500` | mapped | text-muted-foreground | public quote print page; neutral text and rules map to the neutral roles | slate is cool grey, tokens are green-tinted (light --muted-foreground #5b675e vs slate-500 #64748b): visible |

## Source
List: app/globals.css (@theme inline + :root/.dark), read with Read at pin e15bb64, 2026-11-23. Mode: light, dark checked where a row says so. rem root 16px. Colors converted with code (oklch to sRGB).

Coverage: 12 of 12 rows classified (inventory/current.tsv, kinds raw and palette, surface kitchen-quote).
