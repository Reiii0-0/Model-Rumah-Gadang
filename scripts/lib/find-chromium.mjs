import { existsSync, readdirSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from '@playwright/test';

/**
 * Resolve a Chromium executable across local developer setups and CI runners
 * without hardcoding user-specific paths.
 */
export function findChromiumExecutable() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }

  try {
    const playwrightManaged = chromium.executablePath();
    if (playwrightManaged && existsSync(playwrightManaged)) {
      return undefined;
    }
  } catch {
    // Fall through to cached or system browser lookup.
  }

  const cacheRoots = [
    path.join(os.homedir(), '.cache', 'ms-playwright'),
    path.join(os.homedir(), 'Library', 'Caches', 'ms-playwright'),
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, 'ms-playwright') : '',
  ].filter(Boolean);

  for (const root of cacheRoots) {
    if (!existsSync(root)) continue;
    const dirs = readdirSync(root)
      .filter((name) => name.startsWith('chromium-'))
      .sort()
      .reverse();
    for (const dir of dirs) {
      const candidates = [
        path.join(root, dir, 'chrome-linux64', 'chrome'),
        path.join(root, dir, 'chrome-linux', 'chrome'),
        path.join(root, dir, 'chrome-win64', 'chrome.exe'),
      ];
      for (const candidate of candidates) {
        if (existsSync(candidate)) return candidate;
      }
    }
  }

  const systemCandidates = [
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
  ];
  for (const candidate of systemCandidates) {
    if (existsSync(candidate)) return candidate;
  }

  return undefined;
}
