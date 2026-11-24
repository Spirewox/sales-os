TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        sales, attempt 1
OUTCOME        The sales route uses Button in place of SubmitButton and the barrel for FilterSelect, with behaviour unchanged.
MAY EDIT       app/(app)/sales/**
TASKS          R2 in sale-detail-panel.tsx and sale-detail-tabs.tsx. R3 in sales-filter-bar.tsx. The receipt styles and other raw values are allowlisted: leave them.
KEEP           Sale drawer opens from a row; each former SubmitButton keeps label, type, disabled and loading conditions and fires one request per click. Filters keep options, value and URL params. Receipt print opens the same document.
DONE WHEN      --paths "app/(app)/sales/**" prints 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0.
CAPTURE ROWS   sales (with sales.drawer). Expected pixdiff: former SubmitButton boxes only (G-03 mapped), if visible in the drawer; else 0.
TIME LIMIT     25 minutes.
