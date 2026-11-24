TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        settings, attempt 1
OUTCOME        The settings route imports FilterSelect from the barrel, with no change on screen.
MAY EDIT       app/(app)/settings/** except app/(app)/settings/password-section.tsx (the shared unit owns it)
TASKS          R3 in locations-section.tsx, roles-section.tsx, settings-nav.tsx, sheet-select.tsx, users-section.tsx.
KEEP           Every settings select keeps options, value and onChange; the settings nav keeps its sections.
DONE WHEN      --paths "app/(app)/settings/**" prints 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0; pixdiff 0.
CAPTURE ROWS   settings.
TIME LIMIT     15 minutes.
