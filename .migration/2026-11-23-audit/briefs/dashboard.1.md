TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        dashboard, attempt 1
OUTCOME        The dashboard passes chart text through CHART_TEXT, with no pixel change.
MAY EDIT       app/(app)/page.tsx, app/(app)/_dashboard/**
TASKS          R1 at app/(app)/_dashboard/sales-panel.tsx:68, :69, :88, :89. Other raw values allowlisted: leave them.
KEEP           Same panels, KPIs, chart ticks and legends; links unchanged.
DONE WHEN      --paths "app/(app)/_dashboard/**" and --paths "app/(app)/page.tsx" print 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0; pixdiff 0.
CAPTURE ROWS   dashboard.
TIME LIMIT     20 minutes.
