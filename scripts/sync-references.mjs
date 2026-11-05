import fs from 'node:fs/promises';

await fs.mkdir('public/references', { recursive: true });
await fs.cp('references/photos', 'public/references/photos', { recursive: true });
await fs.copyFile('references/sources.md', 'public/references/sources.md');
