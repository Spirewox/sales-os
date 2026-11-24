TEMPLATE v2. Common fields: briefs/_common.v1.md (read it whole).
SURFACE        shared, attempt 1 (the shared layer; runs before every route surface except the pilot)
OUTCOME        lib/ holds no dead palette maps and the password strength helper speaks status tokens, with no change on any screen.
BASE           ds/2026-11-23-harden at the HEAD the prompt names.
MAY EDIT       lib/kitchen-types.ts, lib/settings-helpers.ts, app/(app)/settings/password-section.tsx (this one file is moved to this unit for G-15; the settings worker does not touch it)
TASKS          (G-13 A) After a repo-wide caller check at your base (grep app components contexts hooks lib providers stories docs/system public/system for each name): delete STAGE_BADGE, the className strings in paymentState() (it returns { label } only; app/(app)/kitchen/kitchen-ui.tsx:44 reads only .label; do not edit that file, it must still type-check), ROLE_COLOR_MAP, CUSTOM_ROLE_COLOR, getRoleBadgeClasses, getRoleDotClass, getPasswordStrengthTextClass, and imports they leave unused. A name with a live caller stays, and you report it.
               (G-15 A) getPasswordStrength returns color 'bg-warning' for Medium and 'bg-primary' for Strong ('bg-destructive' stays for Weak). In password-section.tsx change the comparison `strength.color === 'bg-yellow-500'` to `'bg-warning'`, so the rendered classes stay exactly bg-warning/text-warning and bg-primary/text-primary as today. lib tests must still pass.
KEEP           Password meter: same labels (Weak, Medium, Strong), same widths, same bar and text classes in the DOM for each strength (type "abc", "abcdefG1", "abcdefG1!xyz" into New password on /settings and read the bar's class before and after; before = git show <base>:<file> logic). Kitchen payment badges unchanged on /kitchen. No other behaviour.
DONE WHEN      node $W/scripts/migration-inventory.mjs --run $R --paths "lib/**" prints 0 0 0 0 and --paths "app/(app)/settings/password-section.tsx" prints 0 0 0 0; tsc, check.mjs, npm test exit 0; captures for rows settings and kitchen.
CAPTURE ROWS   settings, kitchen (and kitchen.drawer). pixdiff must be 0.
TIME LIMIT     25 minutes.
