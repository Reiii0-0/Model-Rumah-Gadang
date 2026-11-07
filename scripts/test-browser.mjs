import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { chromium } from '@playwright/test';
import { preview } from 'vite';
import { findChromiumExecutable } from './lib/find-chromium.mjs';

const executablePath = findChromiumExecutable();
const server = await preview({ preview: { host: '127.0.0.1', port: 4173, strictPort: true } });
const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});

const results = [];
const errors = [];
const warnings = [];
let page;

await fs.mkdir('evidence/final', { recursive: true });

const snapshot = () => page.evaluate(() => window.__app.snapshot());
const distance = (s) => Math.hypot(...s.camera.map((v, i) => v - s.target[i]));
const delta = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));

async function check(name, fn) {
  try {
    await fn();
    results.push({ name, status: 'pass' });
    console.log('PASS', name);
  } catch (e) {
    results.push({ name, status: 'fail', error: e.message });
    console.error('FAIL', name, e.message);
  }
}

function monitor(p) {
  p.on('pageerror', (e) => {
    errors.push(e.message);
    console.error('BROWSER', e.message);
  });
  p.on('console', (m) => {
    if (m.type() === 'error') {
      errors.push(m.text());
      console.error('CONSOLE', m.text());
    }
    if (m.type() === 'warning') warnings.push(m.text());
  });
  p.on('response', (r) => {
    if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`);
  });
}

async function ready(p) {
  try {
    await p.waitForFunction(() => window.__app?.snapshot().frameCount > 5, {}, { timeout: 15000 });
  } catch (e) {
    await p.screenshot({ path: 'evidence/final/startup-error.png' });
    console.error(errors);
    throw e;
  }
}

try {
  page = await browser.newPage({ viewport: { width: 1440, height: 960 }, deviceScaleFactor: 1 });
  monitor(page);
  await page.goto('http://127.0.0.1:4173');
  await ready(page);

  await check('WebGL context, eight semantic parts, antialias and shadow map', async () => {
    const s = await snapshot();
    assert.equal(s.parts.length, 8);
    assert.equal(s.antialias, true);
    assert.equal(s.shadowEnabled, true);
    assert.deepEqual(s.shadowMap, [2048, 2048]);
    assert.ok(s.triangles > 1000);
  });

  await page.screenshot({ path: 'evidence/final/desktop.png' });

  await check('All eight part buttons select, highlight and describe their component', async () => {
    for (const id of ['roof', 'body', 'pillars', 'stairs', 'doors', 'windows', 'ornaments', 'interior']) {
      await page.locator(`[data-part="${id}"]`).click();
      assert.equal((await snapshot()).selected, id);
      assert.ok((await page.locator('#detail-description').textContent()).length > 40);
    }
    await page.locator('#clear-selection').click();
    assert.equal((await snapshot()).selected, null);
  });

  await check('Bilingual translation toggle switches between Bahasa Indonesia (ID) and Baso Minang (MIN)', async () => {
    assert.equal((await snapshot()).lang, 'id');
    await page.locator('#lang-toggle').click();
    assert.equal((await snapshot()).lang, 'min');
    assert.equal(await page.locator('#parts-heading').textContent(), 'Bagian Bangunan Adat');
    await page.locator('[data-part="stairs"]').click();
    assert.equal(await page.locator('#detail-title').textContent(), 'Janjang Naiak');
    assert.ok((await page.locator('#detail-description').textContent()).includes('Janjang batu'));
    await page.screenshot({ path: 'evidence/final/minang-ui.png' });
    await page.keyboard.press('l');
    assert.equal((await snapshot()).lang, 'id');
    assert.equal(await page.locator('#detail-title').textContent(), 'Tangga Masuk');
    await page.locator('#clear-selection').click();
  });

  await check('Raycaster selection with a real mouse click on the stairs', async () => {
    await page.locator('[data-view="front"]').click();
    const p = await page.evaluate(() => window.__app.project('stairs'));
    await page.mouse.click(p.x, p.y);
    assert.equal((await snapshot()).selected, 'stairs');
    await page.locator('#clear-selection').click();
  });

  await check('Interior camera preset and cutaway roof toggle work via UI and keyboard', async () => {
    await page.locator('[data-view="interior"]').click();
    let s = await snapshot();
    assert.equal(s.view, 'interior');
    assert.equal(s.cutaway, false);
    assert.equal(s.roofVisible, true);
    assert.equal(s.ceilingVisible, true);
    await page.locator('#reset-camera').click();
    await page.locator('#cutaway-button').click();
    s = await snapshot();
    assert.equal(s.cutaway, true);
    assert.equal(s.roofVisible, false);
    assert.equal(s.ceilingVisible, false);
    await page.keyboard.press('c');
    s = await snapshot();
    assert.equal(s.cutaway, false);
    assert.equal(s.roofVisible, true);
    assert.equal(s.ceilingVisible, true);
  });

  await check('Mouse drag orbits; right drag pans; wheel zooms', async () => {
    await page.locator('#reset-camera').click();
    let before = await snapshot();
    const r = await page.locator('canvas').boundingBox();
    const x = r.x + r.width * 0.55;
    const y = r.y + r.height * 0.6;
    await page.mouse.move(x, y);
    await page.mouse.down();
    await page.mouse.move(x + 140, y + 30, { steps: 12 });
    await page.mouse.up();
    await page.waitForTimeout(500);
    let after = await snapshot();
    assert.ok(delta(before.camera, after.camera) > 2);

    before = after;
    await page.mouse.move(x, y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(x + 65, y + 35, { steps: 8 });
    await page.mouse.up({ button: 'right' });
    await page.waitForTimeout(500);
    after = await snapshot();
    assert.ok(delta(before.target, after.target) > 0.1);

    before = after;
    await page.mouse.wheel(0, -240);
    await page.waitForTimeout(500);
    after = await snapshot();
    assert.ok(distance(after) < distance(before));
  });

  await check('UI zoom and reset', async () => {
    await page.locator('#reset-camera').click();
    const before = await snapshot();
    await page.locator('#zoom-in').click();
    assert.ok(distance(await snapshot()) < distance(before));
    await page.locator('#zoom-out').click();
    await page.locator('#reset-camera').click();
    assert.deepEqual((await snapshot()).target, [0, 4.7, 0]);
  });

  await check('Door opens and closes around its hinge, including keyboard D', async () => {
    await page.locator('[data-view="front"]').click();
    await page.locator('#door-button').click();
    await page.waitForTimeout(1400);
    let s = await snapshot();
    assert.equal(s.doorOpen, true);
    assert.ok(s.doorAngle > 1.4);
    await page.screenshot({ path: 'evidence/final/door-open.png' });
    await page.keyboard.press('d');
    await page.waitForTimeout(1400);
    s = await snapshot();
    assert.equal(s.doorOpen, false);
    assert.ok(s.doorAngle < 0.03);
  });

  await check('Night mode changes ambient, sun color/intensity and scene', async () => {
    const before = await snapshot();
    await page.locator('#day-night').click();
    await page.waitForTimeout(1800);
    const s = await snapshot();
    assert.equal(s.night, true);
    assert.ok(s.nightMix > 0.95);
    assert.ok(s.hemi < before.hemi);
    assert.ok(s.sun < before.sun);
    assert.notEqual(s.sunColor, before.sunColor);
    await page.screenshot({ path: 'evidence/final/night.png' });
  });

  await check('Exposure slider changes the renderer, keyboard accessible', async () => {
    await page.locator('#exposure').focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 18; i++) await page.keyboard.press('ArrowRight');
    assert.ok(Math.abs((await snapshot()).exposure - 1.4) < 0.01);
    await page.keyboard.press('Home');
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
    await page.locator('#day-night').click();
    await page.waitForTimeout(1700);
  });

  await check('Camera tour moves, stops from UI, and stops on manual camera input', async () => {
    await page.locator('#reset-camera').click();
    const before = await snapshot();
    await page.locator('#tour-button').click();
    await page.waitForTimeout(1500);
    assert.equal((await snapshot()).touring, true);
    assert.ok(delta(before.camera, (await snapshot()).camera) > 0.2);
    await page.locator('#tour-button').click();
    assert.equal((await snapshot()).touring, false);
    await page.locator('#tour-button').click();
    const r = await page.locator('canvas').boundingBox();
    await page.mouse.move(r.x + r.width * 0.5, r.y + r.height * 0.3);
    await page.mouse.down();
    await page.mouse.move(r.x + r.width * 0.6, r.y + r.height * 0.3, { steps: 5 });
    await page.mouse.up();
    assert.equal((await snapshot()).touring, false);
  });

  await check('Help dialog and six licensed reference photos work in the production build', async () => {
    await page.locator('#help-button').click();
    assert.equal(await page.locator('#help-dialog').evaluate((e) => e.open), true);
    await page.keyboard.press('Escape');
    await page.locator('#references-button').click();
    await page.waitForFunction(() =>
      [...document.querySelectorAll('#reference-gallery img')].every((i) => i.complete && i.naturalWidth > 0)
    );
    assert.equal(await page.locator('#reference-gallery img').count(), 6);
    await page.locator('#references-dialog .dialog-close').click();
    const response = await page.request.get('http://127.0.0.1:4173/references/sources.md');
    assert.equal(response.status(), 200);
    assert.ok((await response.text()).includes('CC BY-SA'));
  });

  await check('Five camera presets, cutaway view, and full model screenshots', async () => {
    await page.evaluate(() => document.body.classList.add('capture'));
    await page.waitForTimeout(250);
    for (const view of ['front', 'side', 'back', 'perspective', 'interior']) {
      await page.evaluate((v) => window.__app.screenshotView(v), view);
      await page.waitForTimeout(450);
      await page.screenshot({ path: `evidence/final/${view}.png` });
    }
    await page.evaluate(() => {
      window.__app.screenshotView('perspective');
      window.__app.setCutaway(true);
    });
    await page.waitForTimeout(450);
    await page.screenshot({ path: 'evidence/final/cutaway.png' });
    await page.evaluate(() => {
      window.__app.setCutaway(false);
      window.__app.screenshotView('perspective');
      document.body.classList.remove('capture');
    });
    await page.waitForTimeout(250);
  });

  for (const [width, height, label] of [
    [1366, 768, 'laptop'],
    [768, 1024, 'tablet'],
  ]) {
    await check(`Responsive ${label} ${width}×${height}`, async () => {
      await page.setViewportSize({ width, height });
      await page.locator('#reset-camera').click();
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const b = await page.locator('#door-button').boundingBox();
      assert.ok(b.y + b.height <= height);
      await page.screenshot({ path: `evidence/final/${label}.png` });
    });
  }

  await page.close();

  const mobile = await browser.newContext({
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  page = await mobile.newPage();
  monitor(page);
  await page.goto('http://127.0.0.1:4173');
  await ready(page);

  const client = await mobile.newCDPSession(page);
  const touch = async (type, points) => client.send('Input.dispatchTouchEvent', { type, touchPoints: points });

  await check('Phone 390×844: responsive layout, tap selection and touch UI', async () => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('[data-part="roof"]').tap();
    assert.equal((await snapshot()).selected, 'roof');
    await page.locator('#clear-selection').tap();
    await page.locator('#door-button').tap();
    await page.waitForTimeout(1400);
    assert.ok((await snapshot()).doorAngle > 1.4);
    await page.locator('#door-button').tap();
    await page.screenshot({ path: 'evidence/final/mobile.png', fullPage: true });
  });

  await check('One-finger touch orbit', async () => {
    await page.locator('#reset-camera').tap();
    const r = await page.locator('canvas').boundingBox();
    const x = r.x + r.width * 0.5;
    const y = r.y + r.height * 0.55;
    const before = await snapshot();
    await touch('touchStart', [{ x, y, id: 1 }]);
    for (let i = 1; i <= 10; i++) await touch('touchMove', [{ x: x + i * 7, y: y + i, id: 1 }]);
    await touch('touchEnd', []);
    await page.waitForTimeout(500);
    assert.ok(delta(before.camera, (await snapshot()).camera) > 1);
  });

  await check('Two-finger pinch zoom and two-finger pan', async () => {
    await page.locator('#reset-camera').tap();
    const r = await page.locator('canvas').boundingBox();
    const x = r.x + r.width * 0.5;
    const y = r.y + r.height * 0.6;
    const before = await snapshot();
    await touch('touchStart', [
      { x: x - 30, y, id: 1 },
      { x: x + 30, y, id: 2 },
    ]);
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', [
        { x: x - 30 - i * 4, y, id: 1 },
        { x: x + 30 + i * 4, y, id: 2 },
      ]);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(400);
    const zoomed = await snapshot();
    assert.ok(distance(zoomed) < distance(before));

    await touch('touchStart', [
      { x: x - 30, y, id: 1 },
      { x: x + 30, y, id: 2 },
    ]);
    for (let i = 1; i <= 8; i++) {
      await touch('touchMove', [
        { x: x - 30 + i * 3, y: y + i * 2, id: 1 },
        { x: x + 30 + i * 3, y: y + i * 2, id: 2 },
      ]);
    }
    await touch('touchEnd', []);
    await page.waitForTimeout(400);
    assert.ok(delta(zoomed.target, (await snapshot()).target) > 0.1);
  });

  await check('Small phone 360×740 and landscape 844×390', async () => {
    for (const [width, height] of [
      [360, 740],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await page.locator('#reset-camera').tap();
      await page.waitForTimeout(300);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await page.screenshot({ path: `evidence/final/mobile-${width}x${height}.png`, fullPage: true });
    }
  });

  await check('No browser errors or failed resource requests', async () => assert.deepEqual(errors, []));

  const stats = await snapshot();
  await fs.writeFile(
    'evidence/test-results.json',
    JSON.stringify(
      {
        testedAt: new Date().toISOString(),
        browser: browser.version(),
        renderer: 'Chromium headless / SwiftShader; touch emulated through CDP',
        results,
        errors,
        warnings,
        stats,
      },
      null,
      2
    )
  );
} finally {
  await browser.close();
  await new Promise((r) => server.httpServer.close(r));
}

if (results.some((r) => r.status === 'fail')) process.exitCode = 1;
