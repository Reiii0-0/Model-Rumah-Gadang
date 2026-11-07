import { chromium } from '@playwright/test';
import fs from 'node:fs/promises';
import { createServer } from 'vite';
import { findChromiumExecutable } from './lib/find-chromium.mjs';

const phase = process.argv[2] || 'final';
const server = await createServer({ server: { host: '127.0.0.1', port: 5173, strictPort: true } });
await server.listen();

const browser = await chromium.launch({
  executablePath: findChromiumExecutable(),
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  page.on('pageerror', (err) => console.error(err));

  await fs.mkdir(`evidence/${phase}`, { recursive: true });
  await page.goto(`http://127.0.0.1:5173/?phase=${phase.split('-')[0]}&capture=1`);
  await page.waitForFunction(() => window.__app?.snapshot().frameCount > 8);

  for (const view of ['perspective', 'front', 'side', 'back', 'interior']) {
    await page.evaluate((v) => window.__app.screenshotView(v), view);
    await page.waitForTimeout(550);
    await page.screenshot({ path: `evidence/${phase}/${view}.png` });
  }

  console.log(JSON.stringify(await page.evaluate(() => window.__app.snapshot())));
} finally {
  await browser.close();
  await server.close();
}
