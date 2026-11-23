# Frame: Sales OS CRM (fudfarmer-crm-next) to its kit (components/app + components/ui)

Mode: audit (read-only). The ask ("create a design system from the Ui update and put it on storybook") does not name the migration, so no surface is edited; the migration is offered with its size in plan.md.
Coordinator: design-system-boss, step 2 of the Harden route (brief .design-system/boss/briefs/migrate-audit.1.md). This step ran as one agent with no workers (standing order 8), on a host with subagents.

Done when (audit): plan.md exists with counts that match inventory/counts.txt, the legacy list (legacy.txt) and the gates (gates.md), the inventory script runs twice with identical output, and every finding has a surface (unassigned 0).
Done when (a later full run, not this one):
- `node scripts/migration-inventory.mjs --check` exits 0 on the final commit
  (legacy imports 0, raw values outside allowlist.tsv 0, palette uses 0, legacy files 0, unassigned 0)
- all 18 rows in queue.tsv are `done` with a `verified` ledger row at the final commit
- the rule that blocks new legacy usage runs in CI at error level (none exists yet; audit mode adds no rule)
Palette in predicate: yes (the system declares semantic colour tokens in app/globals.css)
Bypasses in predicate: no (report-only until G-03 and G-12 are decided)

Scope: every route under app/ (22 page files, 18 surfaces in queue.tsv), plus shared code in contexts/, providers/, hooks/, lib/, types, components/layout and the product components at components/ root, components/credits and components/brand. Out: the system itself (components/ui/**, components/app/**, app/globals.css), lib/mock-api/** (mock backend data), scripts, Storybook files, docs, tests.
Target system: components/app (the redesign's kit, barrel components/app/index.ts, 19 exports) + components/ui (shadcn base-nova on @base-ui/react primitives), tokens in app/globals.css. No installed system skill, no registry items yet (registry.json "sales-os" has 0 items at the pin), no specs yet.
Pinned commit: e15bb64b1172 (ds/2026-11-23-harden HEAD when the inventory ran; product paths identical to fd336f4: `git diff --name-only fd336f4 e15bb64 -- app components lib contexts hooks providers types.ts types` lists 0 files). Re-pinned at handoff, see plan.md first line.
Parity mode: mapped (system values differ from legacy ones, e.g. Button h-8 rounded-lg vs app h-9 rounded-md)
Widths: 390, 1280. Themes: light, dark (next-themes, class attribute)
Budget: this step capped at 23:56 local (boss state.md). A full migration needs its own budget (plan.md, Estimate).
Run branch: ds/2026-11-23-harden, the boss's run branch, from jeph/new-branch-from-update-71db62 at fd336f4. This step commits only scripts/migration-inventory.mjs and .migration/2026-11-23-audit/. Merging is the person's call.
May look broken mid-run: nothing (no edits)
Platform: subagents available; none spawned by this step (agents.tsv is empty by design)
Criteria: the visual rules in the header comment of app/globals.css, the person's earlier decisions in standing-orders.md, and the specs under docs/system/ once the harden step lands them.
