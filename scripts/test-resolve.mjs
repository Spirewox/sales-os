// Lets `node --test` run the TypeScript unit tests in lib/ with Node's built-in type stripping.
// Next resolves extensionless imports ("./kitchen-costing") and "@/..." paths; plain Node does not,
// so this hook retries those as .ts files.
import { registerHooks } from 'node:module';
import { existsSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

registerHooks({
  resolve(specifier, context, nextResolve) {
    let target = specifier;
    if (specifier.startsWith('@/')) target = pathToFileURL(path.join(root, specifier.slice(2))).href;
    const isRelative = target.startsWith('./') || target.startsWith('../') || target.startsWith('file:');
    if (isRelative && !path.extname(target)) {
      for (const ext of ['.ts', '.tsx']) {
        const candidate = new URL(target + ext, context.parentURL);
        if (existsSync(fileURLToPath(candidate))) return nextResolve(candidate.href, context);
      }
    }
    return nextResolve(target, context);
  },
});
