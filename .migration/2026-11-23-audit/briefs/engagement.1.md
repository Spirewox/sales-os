TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        engagement, attempt 1
OUTCOME        The engagement route passes chart text through CHART_TEXT and imports FilterSelect from the barrel, with no pixel change.
MAY EDIT       app/(app)/engagement/**
TASKS          R1 at interaction-insights.tsx:42, :56, :57. R3 in churn.tsx, compensation-form.tsx, enquiry-form.tsx, enquiry-table.tsx, feedback-form.tsx, feedback-table.tsx.
KEEP           Churn and Interactions tabs draw the same content; selects keep options, value and onChange.
DONE WHEN      --paths "app/(app)/engagement/**" prints 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0; pixdiff 0.
CAPTURE ROWS   engagement, engagement-interactions.
TIME LIMIT     20 minutes.
