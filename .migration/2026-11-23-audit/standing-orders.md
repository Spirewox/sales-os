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
- Target is the kit: import from "@/components/app" (the barrel) and primitives from "@/components/ui/<name>". Never deep-import a kit file another surface does not.
- Do not edit: components/ui/**, components/app/**, components/brand/**, app/globals.css, package.json, lockfiles, .migration/**, .design-system/**, .storybook/**, **/*.stories.tsx, docs/system/**, scripts/** (forbidden-paths.txt). Never run the shadcn add or generate command.
- Never add a color, font size, radius, shadow or spacing value. Use the token the mapping file names.
- A gap goes in your report under Shared gaps. Do not work around it.
- Behavior stays the same. Same requests, same validation timing, same focus order, same URLs.
- Do not rebase.
