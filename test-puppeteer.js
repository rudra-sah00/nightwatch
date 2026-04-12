const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:3000/docs-site/UI_GUIDELINES', {
    waitUntil: 'networkidle0',
  });
  const errorText = await page.evaluate(() => {
    const preTags = document.querySelectorAll('.text-red-300');
    return Array.from(preTags)
      .map((p) => p.textContent)
      .join('\n');
  });
  console.log('PAGE ERROR:', errorText);
  await browser.close();
})();
