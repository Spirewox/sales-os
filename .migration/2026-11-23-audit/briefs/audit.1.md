TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        audit, attempt 1
OUTCOME        The audit route imports FilterSelect from the barrel, with no change on screen.
MAY EDIT       app/(app)/audit/**
TASKS          R3 in page.tsx. Nothing else (raw values allowlisted).
KEEP           Filters keep options and value; drawer opens from a row.
DONE WHEN      --paths "app/(app)/audit/**" prints 0 0 0 0; tsc, eslint, check.mjs exit 0; pixdiff 0.
CAPTURE ROWS   audit (with audit.drawer).
TIME LIMIT     15 minutes.
