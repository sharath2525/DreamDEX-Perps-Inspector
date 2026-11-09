import { cp, mkdir, readdir, writeFile } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
// A fresh source-only copy for npm ci/build and private publication. Never overwrite the working tree.
const root = resolve('.'); const target = resolve('.release', `release-${Date.now()}`);
if (!target.startsWith(root + sep)) throw new Error('Release checkout must stay inside the workspace.');
await mkdir(target, { recursive: true });
const exclude = new Set(['node_modules', '.git', '.vite', 'dist']);
for (const folder of ['apps', 'packages', 'scripts', 'tests', 'docs', 'feedback', '.openai']) {
  await cp(folder, join(target, folder), { recursive: true, filter: path => !relative(root, path).split(sep).some(name => exclude.has(name) || (name.startsWith('.env') && name !== '.env.example')) });
}
for (const entry of await readdir(root, { withFileTypes: true })) if (entry.isFile() && (/\.(json|js|mjs|ts|md)$/.test(entry.name) || ['.gitignore', '.env.example', '.npmrc'].includes(entry.name))) await cp(entry.name, join(target, entry.name));
await writeFile('.release/release-checkout.json', JSON.stringify({ path: target }));
console.log(target);
