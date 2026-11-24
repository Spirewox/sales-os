TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        kitchen, attempt 1
OUTCOME        The kitchen route uses Button in place of SubmitButton and the barrel for FilterSelect, with behaviour unchanged.
MAY EDIT       app/(app)/kitchen/**
TASKS          R2 in ingredients.tsx, job-panel-tabs.tsx, job-panel.tsx, settings.tsx (every SubmitButton). R3 in ingredients.tsx and jobs.tsx. Other raw values in your paths are allowlisted: leave them, and do not touch the local button class constants (G-12 B).
KEEP           Each former SubmitButton: same label, same type (submit buttons inside forms stay type="submit"; the rest type="button"), same disabled and loading conditions, one request per click, no double submit while loading. Job panel opens from a board card; Escape closes it and returns focus. Jobs tab filters keep options and value.
DONE WHEN      --paths "app/(app)/kitchen/**" prints 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0.
CAPTURE ROWS   kitchen (with kitchen.drawer), kitchen-ingredients, kitchen-settings. Expected pixdiff: changes only on former SubmitButton boxes (G-03 mapped: 1px transparent border with bg-clip-padding); everything else 0.
TIME LIMIT     25 minutes.
