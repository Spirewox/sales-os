TEMPLATE v1 (verifier; the prompt names SURFACE, COMMIT, BASE, the worker's report and the capture rows)
W, R, S, PW as in $R/briefs/_common.v1.md (read it: the recipes R1 to R3 and KEEP (all) are what the worker was told).
OUTCOME        A verdict for this surface at this commit, returned as text, starting with the Verdict and Commit lines. You did not write this code and you fix nothing.
MAY EDIT       $R/captures/<surface>/<sha12>/ only (captures, probes, behavior evidence). Scratch in $W/.design-system/tmp/<your id>/. Nothing else: no code, no git commands that change the index, HEAD or files.
CONTEXT        Shared checkout: other workers may be editing other surfaces' files right now, uncommitted. The dev server at http://localhost:3456 renders the working tree. Your surface's files must match the commit: check `git diff --quiet <sha> -- <MAY EDIT globs>` (exit 0) before capturing, and say so. Parity mode mapped. Baselines at $R/baselines/before (97369ef), noise floor in $R/baselines/noise.txt.
RUN            1. Scope: `git show --name-only --format= <sha>`; every file must match the surface's MAY EDIT globs and none may match $R/forbidden-paths.txt. Stop with `failed (scope)` on a breach.
               2. Manifest: `cd $W && shasum -a 256 -c .migration/2026-11-23-audit/baselines/MANIFEST.sha256 --quiet` must exit 0. Stop with `blocked (manifest)` otherwise.
               3. Read the diff: `git show <sha>`. Every hunk must be one of the recipes R1 to R3 or a line the surface brief names. Anything else is an unexplained change.
               4. After-capture into $R/captures/<surface>/<sha12>/ with the capture command from _common.v1.md (--kind after), rows given in the prompt.
               5. Visual: `cd $PW && node $S/pixdiff.mjs $R/baselines/before $R/captures/<surface>/<sha12> --surface <names> --tolerance 0 --out $R/captures/<surface>/<sha12>/diff`. R1 and R3 must be 0 changed pixels above the noise floor. R2 (SubmitButton to Button) has known mapped changes, explained by G-03/H-01 and G-16: the 1px transparent border with bg-clip-padding, the spinner gap, text-destructive-foreground on destructive-solid. Look at each changed region (open the diff PNG) and name the row that explains it; any other region is unexplained.
               6. Rendered checklist from the .probe.json files (before vs after, both widths): link cues, overflow count and line counts at 390, document scrollWidth, nav links and table column headers visible, contrast of recolored text.
               7. Accessibility: compare roles, names, states and order in the before and after .probe.json (node $S/montage.mjs --help shows --diff, or compare the JSON yourself). Adds-only changes pass with a note; a removed, renamed or restructured control is a gate.
               8. Behavior: check each KEEP line the prompt lists by driving the app (Playwright from $PW with the storage state $W/.design-system/tmp/coord/storage.json, or your own browser tab). Record pass, fail or not run with the reason. For any Button with loading: confirm aria-busy and disabled while pending, and that focus stays on it, where the mock lets you hold the pending state; otherwise "not run (mock resolves instantly)".
               9. Design review: run the ui-review skill's criteria on the changed regions of the after captures (app/globals.css header rules, docs/system/button.md, the person's decisions in the standing orders). Rank findings blocking, should-fix or note, and say whether each is new or already in the baseline.
               Also run: `cd $W && node scripts/migration-inventory.mjs --run $R --paths "<glob>"` per MAY EDIT glob, and report the numbers.
TIME LIMIT     20 minutes. At the limit, return what you proved and Verdict: blocked (time) if steps 4 to 8 did not all run.
REPORT         return this as your final message, as text, to no file:
               Verdict: verified | needs-decision | failed | blocked (<reason>)
               Commit: <sha12>
               Surface: <surface>
               Verifier: <your id> (worker was <worker id>), model family as given
               Mode: mapped. Noise floor <from noise.txt>.
               Scope check: pass|fail (<n> files)   Manifest: pass|fail   Files match commit: yes|no
               | State | Width | Theme | Changed px | Unexplained regions | Aria |
               Explained changes: <region: gate or recipe>
               Rendered: <numbers>
               Behavior: <n of m KEEP lines pass, each line with pass/fail/not run>
               Behavior delta: <lines, or none with the probe command>
               Inventory for the surface: <i r p f>
               Design review: <counts and findings>
               Questions for a person: <as gates with defaults, or none>
STANDING ORDERS: pasted in full in the prompt.
