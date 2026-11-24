#!/usr/bin/env node
// The design-system check: token and component rules, component specs, and generated docs drift.
// Exit 0 only when all three pass. Run from the repo root: node scripts/check.mjs
import { spawnSync } from "node:child_process";

const steps = [
  ["check-system", ["scripts/check-system.mjs"]],
  ["check-spec", ["scripts/check-spec.mjs", "docs/system"]],
  ["gen-docs --check", ["scripts/gen-docs.mjs", "--check"]],
];
let failed = 0;
for (const [name, args] of steps) {
  const r = spawnSync(process.execPath, args, { stdio: "inherit" });
  console.log(`check: ${name} exit ${r.status}`);
  if (r.status !== 0) failed++;
}
process.exit(failed ? 1 : 0);
