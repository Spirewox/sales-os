TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        inventory, attempt 1
OUTCOME        The inventory route passes chart text through CHART_TEXT and imports FilterSelect from the barrel, with no pixel change.
MAY EDIT       app/(app)/inventory/**
TASKS          R1 at sales-trends.tsx:70, :71. R3 in forms/{adjust-form,batch-update-form,create-sku-form,edit-sku-form,form-bits,purchase-form,request-form,transfer-form}.tsx, movements-tab.tsx, requests-tab.tsx, stock-tab.tsx. The on-series text colours (product-drawer-panels.tsx:88-89) stay (G-07, allowlisted).
KEEP           Stock, Movements and Requests tabs unchanged; product drawer opens from a row with its sales trend chart unchanged; every form select keeps options, value and onChange.
DONE WHEN      --paths "app/(app)/inventory/**" prints 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0; pixdiff 0.
CAPTURE ROWS   inventory (with inventory.drawer).
TIME LIMIT     20 minutes.
