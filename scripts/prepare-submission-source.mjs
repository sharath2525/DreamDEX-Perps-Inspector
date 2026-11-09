import { cp, mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { resolve, join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
const root = resolve('.');
const destination = resolve('.release', `submission-${Date.now()}`);
if (!destination.startsWith(root + sep)) throw new Error('Export must remain in the workspace.');
await mkdir(destination, { recursive: true });
const omitted = new Set(['node_modules', '.git', '.vite', 'dist', '.openai', '.release', 'test-results', 'playwright-report']);
for (const folder of ['apps', 'packages', 'scripts', 'tests', 'docs', 'feedback']) {
  await cp(folder, join(destination, folder), { recursive: true, filter: path => !relative(root, path).split(sep).some(name => omitted.has(name) || (name.startsWith('.env') && name !== '.env.example')) });
}
for (const name of ['package.json', 'package-lock.json', 'README.md', 'eslint.config.js', 'playwright.config.ts', 'tsconfig.base.json', 'tsconfig.tools.json', '.gitignore', '.npmrc', '.env.example']) await cp(name, join(destination, name));
const files = [];
async function inspect(folder) {
  for (const entry of await readdir(folder, { withFileTypes: true })) {
    const path = join(folder, entry.name);
    if (entry.isDirectory()) await inspect(path);
    else {
      const body = await readFile(path);
      files.push({ path: relative(destination, path).split(sep).join('/'), bytes: body.length, sha256: createHash('sha256').update(body).digest('hex') });
    }
  }
}
await inspect(destination);
files.sort((a, b) => a.path.localeCompare(b.path));
await writeFile(join(destination, 'SOURCE_MANIFEST.json'), JSON.stringify({ generatedAt: new Date().toISOString(), purpose: 'Reviewable source package; not a submitted build or signed transaction record', omitted: [...omitted], files }, null, 2));
await writeFile('.release/submission-source.json', JSON.stringify({ path: destination, fileCount: files.length }));
console.log(JSON.stringify({ path: destination, fileCount: files.length }));
