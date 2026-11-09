import { cpSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { resolve, join, relative, sep } from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = resolve('.');
const release = resolve(root, '.release');
const name = `pei-submission-source-${Date.now()}`;
const destination = resolve(release, name);
if (!destination.startsWith(release + sep)) throw new Error('Invalid source destination');
mkdirSync(destination, { recursive: true });
const exclude = new Set(['node_modules', 'dist', '.git', '.vite', 'test-results', 'playwright-report', '.release', '.openai']);
for (const folder of ['apps', 'packages', 'scripts', 'tests', 'docs', 'feedback']) cpSync(join(root, folder), join(destination, folder), { recursive: true, filter: path => !relative(root, path).split(sep).some(part => exclude.has(part) || part.startsWith('.env')) });
for (const file of ['package.json', 'package-lock.json', 'README.md', 'eslint.config.js', 'playwright.config.ts', 'tsconfig.base.json', 'tsconfig.tools.json', '.gitignore', '.npmrc', '.env.example']) cpSync(join(root, file), join(destination, file));
const files = [];
function walk(folder) { for (const entry of readdirSync(folder, { withFileTypes: true })) { const path = join(folder, entry.name); if (entry.isDirectory()) walk(path); else files.push({ path: relative(destination, path).split(sep).join('/'), sha256: createHash('sha256').update(readFileSync(path)).digest('hex') }); } }
walk(destination); files.sort((a, b) => a.path.localeCompare(b.path));
writeFileSync(join(destination, 'SOURCE_MANIFEST.json'), JSON.stringify({ createdAt: new Date().toISOString(), purpose: 'Reviewable source, not a published submission', license: 'Owner choice pending; dependency licenses unchanged', files }, null, 2));
const archive = resolve(release, `${name}.tar.gz`);
execFileSync('tar', ['-czf', archive, '-C', destination, '.'], { stdio: 'pipe' });
console.log(JSON.stringify({ sourceDirectory: destination, archive, files: files.length, sha256: createHash('sha256').update(readFileSync(archive)).digest('hex'), published: false }));
