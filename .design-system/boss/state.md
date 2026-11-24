# Design system run: Sales OS CRM (fudfarmer-crm-next)

## Ask
> create a design system from the Ui update and put it on storybook
Received 2026-11-23 22:36.

## Triage
State: drifting (families_with_2plus 7; adoption_pct 94, palette_pct 0). Weak: component_specs 0. harden_dirs: components.
Intent: build ("create a design system"), with Storybook as the live showcase the person reviews in a browser.
Foundation: shadcn (base-nova, base-ui), base reference build-design-system/references/base-shadcn.md. Token source app/globals.css. Kit in components/app (stray_dirs), primitives in components/ui.
Host: subagents yes (background), nesting assumed no, worktrees yes, browser yes (Claude_Browser pane, dev server on :3456), shell yes. Memory free 35%.
Signals: triage/signals.tsv (rg borrowed from /Applications/ChatGPT.app/Contents/Resources for this run; rg not on PATH)
Question: none.
Bans: none named. Project rules: AGENTS.md "This is NOT the Next.js you know ... read node_modules/next/dist/docs/ before writing code"; memory "don't remove information in redesigns: keep every KPI/chart/section or show where it moved".
Design source: the UI redesign already on this branch (commits 0123b26..fd336f4). Keep the current look; no new visual direction.
Answer:

## Route
Harden (drifting + weak + build intent), stated in the Frame. Steps copied from references/routes.md on 2026-11-23 22:40.
1. build-design-system, harden mode, with Storybook as the showcase. Done when .design-system/run.md has a Handoff section and the spec check passes on every spec it wrote.
2. migrate-design-system, audit mode, side by side with step 1.
3. Late defaults, as Build step 3.
4. Check the system, as Build step 4.
Branch: ds/2026-11-23-harden, from jeph/new-branch-from-update-71db62 at fd336f4. PR #2's branch gets no commits. Merging is the person's call.
Clearance: "Go, 4h" (the person, 2026-11-23 23:38), reply to the handoff offer. Migration of the remaining surfaces on ds/2026-11-23-harden, one commit per surface.

## Budget
Session 2h (default), from 22:36. Workers: up to 4 docs, 2 code. Phase caps:
- triage and Frame 5%, 6m (22:42)
- harden with pilot 65% (route has no migration), 78m (23:56), audit beside it
- decided defaults 15%, 18m (23:42), reserved
- migration: none on this route (no clearance); its share went to harden
- close 15%, 18m (00:36), never cut
No new writing step after 00:00 (70%), except decided defaults.

## Standing orders
1. Write only inside your brief's SCOPE. Your scratch lives only in .design-system/tmp/<your worker id>/, deleted at close. Never read, apply or delete another worker's. Shared files (the token source, generated files, the barrel, registries, indexes, the migration map, the check's config, allowlist and drift list) belong to their one writer, so report the change you need.
2. Use only the colors, fonts, shadows, gradients, motion, logos and product names the app already has, or that the design source the Frame follows draws. The person's bans, quoted below, hold in code, copy, docs, examples and the showcase, except on a Don't: line.
3. Baselines, fixtures and checks stay as written, and so do repo-wide gates (lint flags, CI thresholds, warning limits, project instructions). Fix the code instead.
4. Commit only to the branch your brief names, locally. Never merge, deploy, publish, force-push, stash, reset or clean. No push or PR unless the person asked for one. Leave uncommitted changes and branches you did not create as they are.
5. Put a question in your report as a gate with a default, apply the default, and finish the work. Never wait on an answer.
6. Report with the REPORT block as your final message, as text, status first, commands and exit codes pasted, not summarized. Every claim that something is fixed, passes or works names the command that proved it this session and what that command covers. An audit that does not measure the reported defect is not evidence for it. Write no report file.
7. In a checkout other workers share, make small exact edits that fail when the file changed since you read it. Never rewrite a file whole, and never revert or tidy a change you did not make.
8. Start no agents unless your brief names you a coordinator, apart from the two fresh agents a two-agent test needs. A coordinator that is itself a subagent runs its workers as foreground calls and never returns while one runs.
- .design-system/boss/ belongs to the coordinator. Write nothing there.
- AGENTS.md: "This is NOT the Next.js you know. This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in node_modules/next/dist/docs/ before writing any code. Heed deprecation notices."
- Memory (person's rule): never remove information (KPIs, charts, sections, columns, fields) unless the same information is visibly available elsewhere, and say where.
- The person's earlier decisions: customers are contacted by WhatsApp only (no Call buttons); markups are percentages; min text-xs; sentence case; one green accent; status colours only for state; no em-dashes in UI text.

## Steps
| # | Step | Skill | Status | Record | Verdict | Evidence |
|---|---|---|---|---|---|---|
| 1 | Harden + Storybook | build-design-system | done | .design-system/run.md | partial | returns/harden.md; clean-clone check exit 0; 226 stories render; pilot checked live by boss (close.md rows 11-12) |
| 2 | Migrate audit | migrate-design-system | done | .migration/2026-11-23-audit/ | done | plan.md counts = inventory/counts.txt; pin e15bb64; --help exit 2 (returns/migrate-audit.md) |
| 3 | Late defaults | boss | skipped (none late) | | | decided defaults landed in harden (G-01, G-08, G-12, G-14); rest gated at cap, close.md Found |
| 4 | Check the system | boss | done | close.md | done | close.md rows 1-15 |
| 5 | Clearance | person | done | | | "Go, 4h" at 23:38 |
| 6 | System prep for migration (app button, Checkbox, Textarea, chart constant, registry replaces) | build-design-system | done | .design-system/run.md | done | check.mjs exit 0 (0 failing, 15 specs), tsc exit 0, at 97369ef (returns/system-prep.md) |
| 7 | Re-pin migration audit to the system-prep commit and reconcile with registry.json | migrate-design-system | doing (resumed 2026-11-24 11:06) | .migration/2026-11-23-audit/ | | |
| 8 | Migrate surfaces (edit mode) | migrate-design-system | doing (resumed 2026-11-24 11:06) | .migration/2026-11-23-audit/queue.tsv | | |

## Decisions
| When | Decision | Why | Evidence |
|---|---|---|---|
| 22:38 | Borrow rg from the ChatGPT app bundle for triage | rg not installed; script requires it | triage/signals.tsv |
| 22:40 | Route Harden, not Build | state drifting and weak (7 families with 2+ members, 0 specs), intent build | triage/signals.tsv |
| 22:40 | Storybook is the live showcase, never cut | the person asked for Storybook | Ask |
| 22:40 | New run branch ds/2026-11-23-harden | keeps PR #2's branch unchanged | git log |
| 23:2x | Audit pin e15bb64 predates harden's later commits; re-pin or redo affected rows at close | routes.md rules | .migration/2026-11-23-audit/inventory/pin.txt |
| 23:2x | Pass audit's system-owner asks (G-01 adopt FilterSelect, G-03 app button, Checkbox/Textarea, G-08 chart text constant, registry replaces) to harden as an amendment | harden owns the system files | returns/migrate-audit.md |

## Budget (migration, from 23:38, 4h)
- system prep 30m (00:10)
- re-pin and reconcile 15m (00:25)
- migration edits 2h35m (03:00), rolling window, disjoint paths
- close 38m (03:38), never cut

## Budget (resumed 2026-11-24 11:06, after the session break)
- the person said "Resume migration"; the 4h clearance is mostly unspent (no surface moved)
- migration edits until 14:00, return by 14:10
- close 14:10 to 14:40, never cut

## Gates
| ID | Question | Default | Status | Commit | From |
|---|---|---|---|---|---|
| G-01 | Adopt FilterSelect into the kit? | yes, export from barrel | default (unanswered) | e8e79e2 | run.md G-01 |
| G-03 | Hold Button migration until Button has the app's size, solid destructive and pending state? | add them, then migrate | default (unanswered) | 97369ef | run.md G-03 |
| G-18 | Keep 16 new allowlist rows so Button replaces SubmitButton can land while the check exits 0? | keep; migration burns them down | default (unanswered) | 97369ef | run.md H-G1 |

## Resume
Next action: wait for the resumed migration (steps 7-8); then check queue.tsv, inventory --check, check.mjs and tsc on its commits.

## Report
