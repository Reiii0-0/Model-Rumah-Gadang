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

async function waitForCondition(fn, arg = undefined, timeout = 20000) {
  await page.waitForFunction(fn, arg, { timeout });
}

async function capturePng(filePath, fullPage = false) {
  await page.evaluate(() => {
    window.__app.setPaused(true);
    window.__app.renderNow();
  });
  try {
    await page.screenshot({ path: filePath, fullPage, animations: 'disabled', timeout: 60000 });
  } finally {
    await page.evaluate(() => window.__app.setPaused(false));
  }
}

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
    await p.waitForFunction(() => window.__app?.snapshot().frameCount > 5, {}, { timeout: 25000 });
  } catch (e) {
    await p.screenshot({ path: 'evidence/final/startup-error.png', timeout: 60000 }).catch(() => {});
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

  await capturePng('evidence/final/desktop.png');

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
    await capturePng('evidence/final/minang-ui.png');
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
    await waitForCondition(
      (prev) => Math.hypot(...window.__app.snapshot().camera.map((v, i) => v - prev[i])) > 2,
      before.camera
    );
    let after = await snapshot();
    assert.ok(delta(before.camera, after.camera) > 2);

    before = after;
    await page.mouse.move(x, y);
    await page.mouse.down({ button: 'right' });
    await page.mouse.move(x + 65, y + 35, { steps: 8 });
    await page.mouse.up({ button: 'right' });
    await waitForCondition(
      (prev) => Math.hypot(...window.__app.snapshot().target.map((v, i) => v - prev[i])) > 0.1,
      before.target
    );
    after = await snapshot();
    assert.ok(delta(before.target, after.target) > 0.1);

    before = after;
    const prevDist = distance(before);
    await page.mouse.wheel(0, -240);
    await waitForCondition((d) => {
      const s = window.__app.snapshot();
      return Math.hypot(...s.camera.map((v, i) => v - s.target[i])) < d;
    }, prevDist);
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
    await waitForCondition(() => window.__app.snapshot().doorAngle > 1.4);
    let s = await snapshot();
    assert.equal(s.doorOpen, true);
    assert.ok(s.doorAngle > 1.4);
    await capturePng('evidence/final/door-open.png');
    await page.keyboard.press('d');
    await waitForCondition(() => window.__app.snapshot().doorAngle < 0.03);
    s = await snapshot();
    assert.equal(s.doorOpen, false);
    assert.ok(s.doorAngle < 0.03);
  });

  await check('Night mode changes ambient, sun color/intensity and scene', async () => {
    const before = await snapshot();
    await page.locator('#day-night').click();
    await waitForCondition(() => window.__app.snapshot().nightMix > 0.95);
    const s = await snapshot();
    assert.equal(s.night, true);
    assert.ok(s.nightMix > 0.95);
    assert.ok(s.hemi < before.hemi);
    assert.ok(s.sun < before.sun);
    assert.notEqual(s.sunColor, before.sunColor);
    await capturePng('evidence/final/night.png');
  });

  await check('Exposure slider changes the renderer, keyboard accessible', async () => {
    await page.locator('#exposure').focus();
    await page.keyboard.press('Home');
    for (let i = 0; i < 18; i++) await page.keyboard.press('ArrowRight');
    assert.ok(Math.abs((await snapshot()).exposure - 1.4) < 0.01);
    await page.keyboard.press('Home');
    for (let i = 0; i < 12; i++) await page.keyboard.press('ArrowRight');
    await page.locator('#day-night').click();
    await waitForCondition(() => window.__app.snapshot().nightMix < 0.05);
  });

  await check('Camera tour moves, stops from UI, and stops on manual camera input', async () => {
    await page.locator('#reset-camera').click();
    const before = await snapshot();
    await page.locator('#tour-button').click();
    await waitForCondition(
      (prev) => Math.hypot(...window.__app.snapshot().camera.map((v, i) => v - prev[i])) > 0.2,
      before.camera
    );
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

  // Walk mode. Software WebGL in CI may render only ~1 frame per second, and each frame
  // advances at most 50 ms of walking, so every step waits on a condition, never a duration.
  const walkSnap = () => page.evaluate(() => window.__app.walk.snapshot());
  const teleport = (x, z, yaw = 0) => page.evaluate((p) => window.__app.walk.teleport(...p), [x, z, yaw]);
  async function holdKey(code, condition, arg) {
    await page.keyboard.down(code);
    try {
      await waitForCondition(condition, arg, 120000);
    } finally {
      await page.keyboard.up(code);
    }
  }

  await check('Walk mode: J/button enters first person, WASD moves, closed door blocks, Esc restores orbit', async () => {
    await page.locator('#walk-button').click();
    await waitForCondition(() => window.__app.snapshot().walking);
    let w = await walkSnap();
    assert.equal(w.active, true);
    assert.deepEqual([w.x, w.z, w.yaw], [0, 14, 0]); // spawn on the path, facing the house
    assert.equal(await page.locator('#zoom-in').isDisabled(), true);
    assert.equal(await page.locator('#walk-button').getAttribute('aria-pressed'), 'true');
    assert.match(await page.locator('#gesture-hint').textContent(), /W A S D/);
    await capturePng('evidence/final/walk-entrance.png');

    await page.locator('canvas').hover();
    await holdKey('KeyW', () => window.__app.walk.snapshot().z < 13.5);
    w = await walkSnap();
    assert.ok(w.z < 13.5 && Math.abs(w.x) < 1e-6, 'W walks straight towards the house');

    // From the top step, walking on stops at the closed door leaves (z = 5.26 + 0.08 + 0.3).
    await teleport(0, 6.4);
    await holdKey('KeyW', () => window.__app.walk.snapshot().z < 5.7);
    await page.keyboard.down('KeyW');
    await waitForCondition((f) => window.__app.snapshot().frameCount >= f + 3, (await snapshot()).frameCount, 60000);
    await page.keyboard.up('KeyW');
    w = await walkSnap();
    assert.ok(Math.abs(w.z - 5.64) < 0.01, `stopped at the closed door, z=${w.z}`);
    assert.ok(Math.abs(w.feet - 2.045) < 0.01, 'standing on the porch floor');

    await page.keyboard.press('Escape');
    await waitForCondition(() => !window.__app.snapshot().walking);
    const s = await snapshot();
    assert.equal(s.view, 'perspective');
    assert.ok(distance(s) > 12, 'orbit camera restored');
    assert.equal(await page.locator('#zoom-in').isDisabled(), false);
    assert.equal(await page.locator('#walk-hud').isHidden(), true);

    await page.keyboard.press('KeyJ');
    await waitForCondition(() => window.__app.snapshot().walking);
    await page.locator('[data-view="perspective"]').click();
    await waitForCondition(() => !window.__app.snapshot().walking);
  });

  await check('Walk mode: click opens the door, doorway veto, threshold, indoor light, part selection, debug', async () => {
    await page.keyboard.press('KeyJ');
    await waitForCondition(() => window.__app.snapshot().walking);
    await teleport(0, 6.6);
    const r = await page.locator('canvas').boundingBox();
    const cx = r.x + r.width / 2;
    const cy = r.y + r.height / 2;
    await page.mouse.click(cx - 60, cy); // left door leaf, straight ahead at eye height
    await waitForCondition(() => window.__app.snapshot().doorAngle > 1.4);
    assert.equal((await snapshot()).doorOpen, true);

    await page.keyboard.press('KeyD'); // strafe, not the door shortcut, while walking
    assert.equal((await snapshot()).doorOpen, true);

    await teleport(0, 5.26); // in the doorway: closing would trap the visitor
    await page.locator('#door-button').click();
    await waitForCondition(() => window.__app.walk.snapshot().message !== '');
    assert.equal((await snapshot()).doorOpen, true);
    await waitForCondition(() => document.querySelector('#walk-hud').textContent.includes('»'));

    // Past the column behind the door (right-hand gap), over the raised threshold, into the hall.
    await teleport(0.6, 4.6);
    await holdKey('KeyW', () => window.__app.walk.snapshot().indoors);
    await waitForCondition(() => window.__app.snapshot().hemi > 3);
    let w = await walkSnap();
    assert.ok(w.z < 3.89 && w.feet > 2.06, `inside the hall on the floor, z=${w.z} feet=${w.feet}`);
    await teleport(0.6, 2.9, 0.35);
    await capturePng('evidence/final/walk-interior.png');

    await teleport(3.2, -1.6);
    await page.mouse.click(cx, cy + 120); // vitrine below eye level
    await waitForCondition(() => window.__app.snapshot().selected === 'interior');

    await page.keyboard.press('Backquote');
    await waitForCondition(() => document.querySelector('#walk-hud').textContent.includes('collider aktif'));
    assert.equal((await walkSnap()).debug, true);
    await capturePng('evidence/final/walk-debug.png');
    await page.keyboard.press('Backquote');

    await page.keyboard.press('Escape');
    await waitForCondition(() => !window.__app.snapshot().walking);
    await page.keyboard.press('Escape'); // clear selection
    await page.locator('#door-button').click();
    await waitForCondition(() => window.__app.snapshot().doorAngle < 0.03);
  });

  await check('Walk mode: entering from the interior preset starts inside, language switch stays available', async () => {
    await page.locator('[data-view="interior"]').click();
    await page.keyboard.press('KeyJ');
    await waitForCondition(() => window.__app.snapshot().walking);
    const w = await walkSnap();
    assert.equal(w.indoors, true);
    assert.ok(Math.abs(w.x + 2.25) < 0.01 && Math.abs(w.z - 2.62) < 0.01, 'starts at the interior camera spot');
    assert.equal(await page.locator('.view-switch button.active').count(), 0);

    await page.keyboard.press('KeyL');
    await waitForCondition(() => window.__app.snapshot().lang === 'min');
    assert.equal(await page.locator('#walk-label').textContent(), 'Baranti bajalan');
    assert.match(await page.locator('#view-label').textContent(), /Bajalan/);
    await page.keyboard.press('KeyL');
    await waitForCondition(() => window.__app.snapshot().lang === 'id');

    await page.locator('#walk-button').click();
    await waitForCondition(() => !window.__app.snapshot().walking);
    assert.equal((await snapshot()).view, 'interior');
    await page.locator('#reset-camera').click();
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
    try {
      await waitForCondition(
        (prev) => window.__app.snapshot().frameCount >= prev + 2,
        (await snapshot()).frameCount
      );
      for (const view of ['front', 'side', 'back', 'perspective', 'interior']) {
        await page.evaluate((v) => window.__app.screenshotView(v), view);
        await capturePng(`evidence/final/${view}.png`);
      }
      await page.evaluate(() => {
        window.__app.screenshotView('perspective');
        window.__app.setCutaway(true);
      });
      await capturePng('evidence/final/cutaway.png');
    } finally {
      await page.evaluate(() => {
        window.__app.setCutaway(false);
        window.__app.screenshotView('perspective');
        document.body.classList.remove('capture');
      });
    }
  });

  for (const [width, height, label] of [
    [1366, 768, 'laptop'],
    [768, 1024, 'tablet'],
  ]) {
    await check(`Responsive ${label} ${width}×${height}`, async () => {
      await page.setViewportSize({ width, height });
      await page.locator('#reset-camera').click();
      await waitForCondition(
        (prev) => window.__app.snapshot().frameCount >= prev + 2,
        (await snapshot()).frameCount
      );
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      const b = await page.locator('#door-button').boundingBox();
      assert.ok(b.y + b.height <= height);
      await capturePng(`evidence/final/${label}.png`);
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
    assert.equal(await page.locator('#walk-button').isVisible(), false, 'walk mode needs a keyboard');
    await page.locator('[data-part="roof"]').tap();
    assert.equal((await snapshot()).selected, 'roof');
    await page.locator('#clear-selection').tap();
    await page.locator('#door-button').tap();
    await waitForCondition(() => window.__app.snapshot().doorAngle > 1.4);
    assert.ok((await snapshot()).doorAngle > 1.4);
    await page.locator('#door-button').tap();
    await waitForCondition(() => window.__app.snapshot().doorAngle < 0.03);
    await capturePng('evidence/final/mobile.png', true);
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
    await waitForCondition(
      (prev) => Math.hypot(...window.__app.snapshot().camera.map((v, i) => v - prev[i])) > 1,
      before.camera
    );
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
    await waitForCondition((d) => {
      const s = window.__app.snapshot();
      return Math.hypot(...s.camera.map((v, i) => v - s.target[i])) < d;
    }, distance(before));
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
    await waitForCondition(
      (prev) => Math.hypot(...window.__app.snapshot().target.map((v, i) => v - prev[i])) > 0.1,
      zoomed.target
    );
    assert.ok(delta(zoomed.target, (await snapshot()).target) > 0.1);
  });

  await check('Small phone 360×740 and landscape 844×390', async () => {
    for (const [width, height] of [
      [360, 740],
      [844, 390],
    ]) {
      await page.setViewportSize({ width, height });
      await page.locator('#reset-camera').tap();
      await waitForCondition(
        (prev) => window.__app.snapshot().frameCount >= prev + 2,
        (await snapshot()).frameCount
      );
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      await capturePng(`evidence/final/mobile-${width}x${height}.png`, true);
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
