import { cp, mkdir, access } from 'node:fs/promises';
// Run after the production build. The original workspace output stays intact.
await access('apps/web/dist/index.html');
await mkdir('dist', { recursive: true });
await cp('apps/web/dist', 'dist', { recursive: true });
console.log('Static build staged in dist/; no application state or credentials included.');
