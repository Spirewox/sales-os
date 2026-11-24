TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        analytics, attempt 1 (pilot)
OUTCOME        The analytics route passes chart text through CHART_TEXT, with no pixel change.
MAY EDIT       app/(app)/analytics/**
TASKS          R1 at app/(app)/analytics/analytics-ui.tsx:13 and :16, credit-tab.tsx:86 (inventory lists them as fontSize: 12 / paddingTop: 8). Look for any other identical Recharts text object in your paths the inventory missed and swap it too. The other raw values in your paths are allowlisted (allowlist.tsv): leave them.
KEEP           Every tab (?tab=sales, products, customers, credit, inventory, suppliers, explore) draws the same charts, ticks, legends and tooltips. Tab switching keeps ?tab in the URL. Period select unchanged.
DONE WHEN      --paths "app/(app)/analytics/**" prints 0 0 0 0; tsc, eslint on changed files, check.mjs, npm test exit 0; pixdiff 0 on every capture row.
CAPTURE ROWS   analytics-sales, analytics-products, analytics-customers, analytics-credit, analytics-inventory, analytics-suppliers, analytics-explore (not -compare and -kitchen: those render shared-components files).
TIME LIMIT     25 minutes.
