import { chromium } from '@playwright/test';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  page.on('console', (msg) => console.log('PAGE LOG:', msg.text()));
  await page.goto('http://localhost:3000/docs-site/UI_GUIDELINES');
  await page.waitForTimeout(2000);
  const errorText = await page.evaluate(() => {
    const preTags = document.querySelectorAll('.text-red-300');
    return Array.from(preTags)
      .map((p) => p.textContent)
      .join('\n');
  });
  console.log('PAGE ERROR:', errorText);
  await browser.close();
})();
