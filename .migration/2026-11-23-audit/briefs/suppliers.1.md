TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        suppliers, attempt 1
OUTCOME        The suppliers route passes chart text through CHART_TEXT and imports FilterSelect from the barrel, with no pixel change.
MAY EDIT       app/(app)/suppliers/**
TASKS          R1 at supplier-performance-tab.tsx:168, :169 and supplier-purchases-tab.tsx:65, :66. R3 in page.tsx. Leave the tel: Call links (build G-17, outside scope).
KEEP           Supplier drawer opens from a row; Performance and Purchases tabs draw the same charts; filter keeps options and value.
DONE WHEN      --paths "app/(app)/suppliers/**" prints 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0; pixdiff 0.
CAPTURE ROWS   suppliers (with suppliers.drawer). Open the drawer's Performance and Purchases tabs in your own tab and compare them by eye with a capture at the base: report what you did.
TIME LIMIT     20 minutes.
