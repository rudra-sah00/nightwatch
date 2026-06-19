import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const GAME_URL = 'https://poki.com/en/g/fruit-ninja';
const OUTPUT_DIR =
  '/Users/rudra/development/nightwatch-games-backup/fruit-ninja';

(async () => {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: false,
    channel: 'chrome',
    args: ['--remote-debugging-port=9222'],
  });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  const gameUrls = new Set<string>();
  const downloaded = new Set<string>();

  // Intercept all requests
  page.on('response', async (response) => {
    const url = response.url().split('?')[0];
    if (!url.includes('gdn.poki.com') && !url.includes('poki-gdn.')) return;
    gameUrls.add(url);

    // Download the asset
    if (downloaded.has(url)) return;
    downloaded.add(url);

    try {
      const body = await response.body();
      // Extract relative path from URL
      // URL format: https://{GAME_ID}.gdn.poki.com/{VERSION_ID}/{path}
      const urlObj = new URL(url);
      const parts = urlObj.pathname.split('/');
      // Skip the first part (version ID) and join the rest
      const _versionId = parts[1];
      const relativePath = parts.slice(2).join('/') || 'index.html';
      const dest = path.join(OUTPUT_DIR, relativePath);

      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.writeFileSync(dest, body);
      console.log(`[OK] ${relativePath} (${body.length} bytes)`);
    } catch (e) {
      console.log(`[SKIP] ${url} - ${(e as Error).message}`);
    }
  });

  console.log('Navigating to Fruit Ninja...');
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });

  // Wait for game to load and capture initial assets
  console.log('Waiting for game to load (30s)...');
  await page.waitForTimeout(30000);

  // Try to interact with the game to trigger more asset loads
  console.log('Attempting to click play/start buttons...');
  try {
    // Click on the game iframe area to trigger gameplay assets
    const frame = page.frameLocator('iframe').first();
    await frame
      .locator('canvas')
      .click({ timeout: 5000 })
      .catch(() => {});
  } catch {}

  // Wait for gameplay assets
  console.log('Waiting for gameplay assets (30s)...');
  await page.waitForTimeout(30000);

  // Save URL list
  const urlList = [...gameUrls].sort().join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, '_urls.txt'), urlList);

  // Extract game ID and version ID from URLs
  const sampleUrl = [...gameUrls][0];
  if (sampleUrl) {
    const match = sampleUrl.match(
      /https?:\/\/([^.]+)\.gdn\.poki\.com\/([^/]+)/,
    );
    if (match) {
      console.log(`\n=== GAME INFO ===`);
      console.log(`Game ID: ${match[1]}`);
      console.log(`Version ID: ${match[2]}`);
      fs.writeFileSync(
        path.join(OUTPUT_DIR, '_game-info.json'),
        JSON.stringify(
          { gameId: match[1], versionId: match[2], urls: [...gameUrls] },
          null,
          2,
        ),
      );
    }
  }

  console.log(`\n=== RESULTS ===`);
  console.log(`Total URLs captured: ${gameUrls.size}`);
  console.log(`Files downloaded: ${downloaded.size}`);
  console.log(`Output: ${OUTPUT_DIR}`);
  console.log(`URL list: ${OUTPUT_DIR}/_urls.txt`);

  console.log(
    '\nKeeping browser open for 60s — play the game to capture more assets...',
  );
  console.log('Press Ctrl+C when done.');

  await page.waitForTimeout(60000);

  // Final save
  const finalUrlList = [...gameUrls].sort().join('\n');
  fs.writeFileSync(path.join(OUTPUT_DIR, '_urls.txt'), finalUrlList);
  console.log(`\nFinal URL count: ${gameUrls.size}`);

  await browser.close();
})();
