TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        pos, attempt 1
OUTCOME        The POS route imports FilterSelect from the barrel, with no change on screen.
MAY EDIT       app/(app)/pos/**
TASKS          R3 in pos-filter-bar.tsx. Nothing else.
KEEP           Filters keep options and value.
DONE WHEN      --paths "app/(app)/pos/**" prints 0 0 0 0; tsc, eslint, check.mjs exit 0; pixdiff 0.
CAPTURE ROWS   pos.
TIME LIMIT     15 minutes.
