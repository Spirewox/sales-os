TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        customers, attempt 1
OUTCOME        The customers route passes chart text through CHART_TEXT and imports FilterSelect from the barrel, with no pixel change.
MAY EDIT       app/(app)/customers/**
TASKS          R1 at customer-overview-tab.tsx:106, :107. R3 in customer-form.tsx, customer-more-filters.tsx, page.tsx.
KEEP           Customer drawer opens from a row with the overview chart unchanged; filters and form selects keep options, value and onChange; WhatsApp-only contact.
DONE WHEN      --paths "app/(app)/customers/**" prints 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0; pixdiff 0.
CAPTURE ROWS   customers (with customers.drawer).
TIME LIMIT     20 minutes.
