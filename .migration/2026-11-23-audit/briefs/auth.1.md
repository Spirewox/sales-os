TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        auth, attempt 1
OUTCOME        The sign-in, forgot-password and reset-password pages use Button in place of SubmitButton, with behaviour unchanged.
MAY EDIT       app/login/**, app/forgot-password/**, app/reset-password/**
TASKS          R2 in app/login/page.tsx, app/forgot-password/page.tsx, app/reset-password/reset-password-form.tsx. Keep type="submit" where it is passed.
KEEP           Submit by Enter and by click sends one request; while pending the button is disabled with the spinner and keeps focus; invalid input shows the same messages at the same moment; mock sign-in still lands on /. Links (Forgot password, Back to sign in) unchanged.
DONE WHEN      the three --paths calls (one per folder) print 0 0 0 0; tsc, eslint, check.mjs, npm test exit 0.
CAPTURE ROWS   login, forgot-password, reset-password (same capture command and storage state as the baseline). Expected pixdiff: the submit button box only (G-03 mapped).
TIME LIMIT     20 minutes.
