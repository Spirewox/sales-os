TEMPLATE v1 (common fields for every worker brief in this run; the surface brief names the rest)
W = /Users/jephaletan/Projects/Fudfarmer/fudfarmer-crm-next/.claude/worktrees/new-branch-from-update-71db62
R = $W/.migration/2026-11-23-audit
S = /Users/jephaletan/.claude/skills/build-design-system/scripts
PW = /private/tmp/claude-501/-Users-jephaletan-Projects-Fudfarmer-fudfarmer-crm-next--claude-worktrees-new-branch-from-update-71db62/ba4c7b78-9105-4413-a60b-d60a80756095/scratchpad/pw   (Playwright 1.63.0; run capture and pixdiff with this as the current folder)

BASE           branch ds/2026-11-23-harden in the shared checkout $W (no worktree; other workers edit other surfaces' files in the same checkout at the same time). Start from the HEAD your surface brief names. Commit only to this branch. Never switch branches, rebase, stash, reset, checkout files you did not edit, or run `git add -A`, `git add .` or `git commit -a`.
COMMIT         one commit for your surface: `git add -- <each file you changed>` then `git commit -m "Migrate <surface>: <what>" ` with the attribution line `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. If git reports index.lock, wait 5 seconds and retry (another worker is committing). Check `git show --stat HEAD` lists only your files.
MUST NOT EDIT  every path in $R/forbidden-paths.txt (components/ui/**, components/app/**, components/brand/**, app/globals.css, package.json, lockfiles, .migration/**, .design-system/** except your scratch, .storybook/**, **/*.stories.tsx, docs/system/**, scripts/**), lib/format.ts, lib/period.ts, registry.json, every path outside your MAY EDIT. Allowlists (scripts/check-allowlist.json, allowlist.tsv) belong to the coordinator: report shrink candidates instead.
INPUTS (all)   $R/frame.md, $R/gates.md (G-03, G-08, G-16, G-17), $R/legacy.txt, $R/allowlist.tsv, components/ui/button.tsx, lib/format.ts (CHART_TEXT, CHART_TOOLTIP), components/app/index.ts, docs/system/button.md, your surface's mapping file $R/mapping/<surface>.md (older; where it disagrees with this brief, this brief wins).
RECIPES        (R1) Recharts text to CHART_TEXT, identical values only. `tick={{ fill: 'var(--muted-foreground)', fontSize: 12 }}` -> `tick={CHART_TEXT.tick}`; Legend `wrapperStyle={{ fontSize: 12, color: 'var(--muted-foreground)' }}` -> `CHART_TEXT.legend`; with `paddingTop: 8` too -> `CHART_TEXT.legendBelow`; a bare `{ fontSize: 12 }` -> `CHART_TEXT.label`. Only when the object holds exactly those keys and values; if a call site has another key or value, spread the constant and keep the extra key (`{ ...CHART_TEXT.tick, dy: 4 }`) only when that leaves every value identical; otherwise leave it and report it. Import CHART_TEXT from '@/lib/format' (add to the existing import).
               (R2) SubmitButton to Button: `import { Button } from '@/components/ui/button'`; `<SubmitButton ...>` -> `<Button size="control" ...>`; variant primary or none -> no variant (default); variant destructive -> variant="destructive-solid"; `loading` stays `loading`; keep `type`, `onClick`, `disabled`, `className`, `form`, `aria-*` and children exactly. SubmitButton defaulted type to "button": set `type="button"` explicitly wherever the call site passed no type (check what base-ui Button renders: read node_modules/@base-ui/react/button and confirm the rendered type attribute in the running app). Remove the SubmitButton import. Never add classes to patch a difference (G-16 default A).
               (R3) Deep import `from '@/components/filter-select'` -> `from '@/components/app'` (same module, re-exported by the barrel). Merge with an existing '@/components/app' import in that file.
KEEP (all)     Same requests, same validation timing, same focus order, same URLs, same text and labels, same element order. Nothing appears or disappears. Charts: same ticks, legend text, sizes and colours (pixdiff 0 on chart regions). WhatsApp-only contact, sentence case, no em-dashes, min text-xs.
CHECKS         node $W/scripts/migration-inventory.mjs --run $R --paths "<each MAY EDIT glob, one call each>"   (prints imports raw palette files)
               cd $W && npx tsc --noEmit -p .
               cd $W && npx eslint <your changed files>
               cd $W && node scripts/check-system.mjs   (must exit 0; the allowlist only shrinks, so a count that dropped is fine, a new finding is not)
               cd $W && npm test   (lib tests; must stay 24 pass)
               after-capture: cd $PW && node $S/capture.mjs --root $W --base http://localhost:3456 --kind after --out $R/inbox/<surface>.1.captures --surfaces <your rows file> --states $R/baselines/states.mjs --widths 390,1280 --themes light,dark --storage-state $W/.design-system/tmp/coord/storage.json
                 where <your rows file> is $W/.design-system/tmp/<your id>/<surface>.surfaces.tsv: the header plus your rows of $R/baselines/surfaces.tsv (awk -F'\t' 'NR==1||$1~/<pattern>/').
               pixdiff: cd $PW && node $S/pixdiff.mjs $R/baselines/before $R/inbox/<surface>.1.captures --surface <names> --tolerance 0 --out $W/.design-system/tmp/<your id>/diff
SERVER         http://localhost:3456 (next dev, mock data; sign-in is the storage state above). Do not start or stop it. If it does not answer for 60s, return `blocked: server down` and start nothing.
REPORT         return the schema below as your final message, as text. Write it to no file.
               Status: done | partial | blocked: <reason> | failed: <reason>
               Commit: <full sha of your commit>
               Branch: ds/2026-11-23-harden   Base: <HEAD sha you started from>
               Surface: <surface> attempt <n>
               ## Inventory for my paths   Before: <i r p f>   After: <i r p f>
               ## Commands run   (each command, its exit code, last lines of output)
               ## Files changed   (git show --name-only --format= HEAD)
               ## Captures   (path)
               ## Behavior delta   (per captured state: what differs from the baseline probe, with the pixdiff numbers; "None" only with the command)
               ## Accessibility tree   (changed lines, adds-only or not)
               ## Allowlist shrink candidates   (scripts/check-allowlist.json file, rule, key, new lower count; from node scripts/check-system.mjs --json if it reports "shrink")
               ## Shared gaps
               ## Deviations from the brief
               ## Questions for a person   (as gates: G-<surface>-01 with options and the default you applied)
               ## Follow-ups outside my scope
STANDING ORDERS: pasted in full in the prompt.
