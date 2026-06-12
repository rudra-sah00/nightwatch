import fs from 'node:fs';
import path from 'node:path';
import { chromium } from '@playwright/test';

const GAME_URL = 'https://poki.com/en/g/fruit-ninja';
const OUTPUT_DIR =
  '/Users/rudra/development/nightwatch-games-backup/fruit-ninja';

// All assets referenced in main.bundle.js that we need to download
const MISSING_ASSETS = [
  'assets/effects/BombRay.png',
  'assets/effects/FruitSplash.png',
  'assets/effects/Glow.png',
  'assets/effects/ImpactClassic.png',
  'assets/effects/PomegranateRay.fbx',
  'assets/effects/Ring01.png',
  'assets/effects/SliceDiamondCritical.png',
  'assets/effects/SliceDiamondNeutral.png',
  'assets/effects/SplashSlice.png',
  'assets/effects/SplashSlice2.png',
  'assets/fruits/Bomb.fbx',
  'assets/fruits/AppleGreen.fbx',
  'assets/fruits/Banana.fbx',
  'assets/fruits/Coconut.fbx',
  'assets/fruits/CWatermelon.fbx',
  'assets/fruits/Kiwifruit.fbx',
  'assets/fruits/Lemon.fbx',
  'assets/fruits/Mango.fbx',
  'assets/fruits/Orange.fbx',
  'assets/fruits/Peach.fbx',
  'assets/fruits/Pineapple.fbx',
  'assets/fruits/Watermelon.fbx',
  'assets/sound/MusicMenu.mp3',
  'assets/textures/BombRedCross.png',
  'assets/textures/Dojo_Basic.png',
  'assets/textures/Fruit_shadow.png',
  'assets/textures/FruitAtlas.png',
  'assets/textures/FruitRingBack.png',
  'assets/textures/FruitRingClassic.png',
  'assets/textures/FruitRingPurple.png',
  'assets/textures/FruitRingQuit.png',
  'assets/textures/FruitRingRetry.png',
  'assets/textures/FruitRingShadow.png',
  'assets/textures/LogoLarge.png',
  'assets/textures/particles/FruitTrail.png',
  'assets/textures/particles/SmokeYellow.png',
  'assets/textures/particles/Spark01.png',
  'assets/textures/particles/Star.png',
  'assets/textures/SplashSlice.png',
  'assets/textures/SplashSlice2.png',
  'assets/textures/splat11.png',
  'assets/textures/splat12.png',
  'assets/textures/splat13.png',
  'assets/textures/splat14.png',
  'assets/UI/BackingPaper.png',
  'assets/UI/blackAreaforTitle.png',
  'assets/UI/BorderWood.png',
  'assets/UI/BorderWoodBottom.png',
  'assets/UI/BorderWoodBottomLeft.png',
  'assets/UI/BorderWoodBottomRight.png',
  'assets/UI/BorderWoodLeft.png',
  'assets/UI/BorderWoodRight.png',
  'assets/UI/BorderWoodTop.png',
  'assets/UI/BorderWoodTopLeft.png',
  'assets/UI/BorderWoodTopRight.png',
  'assets/UI/ButtonMusic.png',
  'assets/UI/ButtonMusicMute.png',
  'assets/UI/ButtonSFX.png',
  'assets/UI/ButtonSFXMute.png',
  'assets/UI/circle2.png',
  'assets/UI/CrossBlue.png',
  'assets/UI/CrossRed.png',
  'assets/UI/gameover text.png',
  'assets/UI/HeaderWood.png',
  'assets/UI/HUDWatermelon.png',
  'assets/UI/LogoNinja.png',
  'assets/UI/medium_button.png',
  'assets/UI/medium_small_button.png',
  'assets/UI/ParchmentBackingLarge.png',
  'assets/UI/ParchmentBackingSmall.png',
  'assets/UI/ScrollBackingQuad.png',
  'assets/UI/SenseiHead.png',
  'assets/UI/SenseiOrange.png',
  'assets/UI/small_button.png',
];

(async () => {
  const browser = await chromium.launch({ headless: true, channel: 'chrome' });
  const ctx = await browser.newContext({
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  });
  const page = await ctx.newPage();

  let baseUrl = '';

  // Capture the first request to gdn.poki.com to extract the base URL
  page.on('request', (req) => {
    if (baseUrl) return;
    const url = req.url();
    if (url.includes('gdn.poki.com') && url.includes('index.html')) {
      // URL format: https://{GAME_ID}.gdn.poki.com/{VERSION_ID}/index.html
      baseUrl = url.replace(/\/index\.html.*$/, '');
      console.log(`Base URL: ${baseUrl}`);
    }
  });

  console.log('Loading game to discover CDN base URL...');
  await page.goto(GAME_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(10000);
  await browser.close();

  if (!baseUrl) {
    console.error('Could not find CDN base URL!');
    process.exit(1);
  }

  // Extract version ID
  const match = baseUrl.match(/gdn\.poki\.com\/([^/]+)/);
  const versionId = match?.[1] || 'unknown';
  console.log(`Version ID: ${versionId}`);
  console.log(`\nDownloading ${MISSING_ASSETS.length} missing assets...`);

  let ok = 0,
    fail = 0;
  for (let i = 0; i < MISSING_ASSETS.length; i += 10) {
    const batch = MISSING_ASSETS.slice(i, i + 10);
    await Promise.all(
      batch.map(async (file) => {
        const dest = path.join(OUTPUT_DIR, file);
        if (fs.existsSync(dest)) {
          ok++;
          return;
        }
        try {
          const res = await fetch(`${baseUrl}/${file}`, {
            headers: { Referer: 'https://poki.com/' },
          });
          if (!res.ok) {
            console.log(`[FAIL ${res.status}] ${file}`);
            fail++;
            return;
          }
          fs.mkdirSync(path.dirname(dest), { recursive: true });
          fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()));
          console.log(`[OK] ${file}`);
          ok++;
        } catch (e) {
          console.log(`[ERR] ${file}: ${(e as Error).message}`);
          fail++;
        }
      }),
    );
  }

  // Save game info
  fs.writeFileSync(
    path.join(OUTPUT_DIR, '_game-info.json'),
    JSON.stringify(
      {
        gameId: '8b32c0f4-2dcb-4fdd-bf8b-16df63b01532',
        versionId,
        baseUrl,
        slug: 'fruit-ninja',
      },
      null,
      2,
    ),
  );

  console.log(`\n=== DONE ===`);
  console.log(`Downloaded: ${ok}, Failed: ${fail}`);
  console.log(`Game info saved to ${OUTPUT_DIR}/_game-info.json`);
})();
