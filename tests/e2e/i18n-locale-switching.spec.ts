import { expect, test } from '@playwright/test';

const COOKIE_NAME = 'NEXT_LOCALE';

test.describe('i18n Locale Switching', () => {
  test('defaults to English when no locale cookie is set', async ({ page }) => {
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
    await expect(html).toHaveAttribute('dir', 'ltr');
  });

  test('respects NEXT_LOCALE cookie for French', async ({ page, context }) => {
    await context.addCookies([
      { name: COOKIE_NAME, value: 'fr', url: 'http://localhost:3000' },
    ]);
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'fr');
    await expect(html).toHaveAttribute('dir', 'ltr');
  });

  test('sets dir="rtl" for Arabic locale', async ({ page, context }) => {
    await context.addCookies([
      { name: COOKIE_NAME, value: 'ar', url: 'http://localhost:3000' },
    ]);
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'ar');
    await expect(html).toHaveAttribute('dir', 'rtl');
  });

  test('falls back to English for invalid locale cookie', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: COOKIE_NAME, value: 'xx', url: 'http://localhost:3000' },
    ]);
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang', 'en');
  });

  test('middleware sets cookie from Accept-Language header on first visit', async ({
    page,
  }) => {
    // Set Accept-Language to Japanese
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'ja,en;q=0.5' });
    await page.goto('/');

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === COOKIE_NAME);
    expect(localeCookie).toBeDefined();
    expect(localeCookie!.value).toBe('ja');
  });

  test('middleware does not overwrite existing locale cookie', async ({
    page,
    context,
  }) => {
    await context.addCookies([
      { name: COOKIE_NAME, value: 'ko', url: 'http://localhost:3000' },
    ]);
    await page.setExtraHTTPHeaders({ 'Accept-Language': 'fr,en;q=0.5' });
    await page.goto('/');

    const cookies = await page.context().cookies();
    const localeCookie = cookies.find((c) => c.name === COOKIE_NAME);
    expect(localeCookie!.value).toBe('ko');
  });
});
