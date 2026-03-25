import { type BrowserContext, expect, type Page, test } from '@playwright/test';

/**
 * PRODUCTION-LEVEL E2E TEST: Engagement Features
 *
 * Verifies the lifecycle of high-retention features:
 * 1. Watchlist (adding, persisting, and removing).
 * 2. Continue Watching (progress tracking and resumption).
 */
test.describe('Engagement Features E2E', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // --- SETUP: AUTHENTICATED LOGIN ---
    await page.goto('/login');
    await page.locator('#email').fill(process.env.E2E_TEST_EMAIL ?? '');
    await page.locator('#password').fill(process.env.E2E_TEST_PASSWORD ?? '');
    await page.getByRole('button', { name: /Launch Sync/i }).click();

    await page.waitForSelector('input', { timeout: 10000 });
    const otpInput = page.locator('input').first();
    await otpInput.fill(process.env.E2E_TEST_OTP ?? '000000');
    await page.getByRole('button', { name: /Verify & Sign In/i }).click();

    await expect(page).toHaveURL(/\/home|\/search/i, { timeout: 15000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  test('should complete the Watchlist adding and removal lifecycle', async () => {
    // --- STEP 1: ADD TO WATCHLIST ---
    await page.goto('/search');

    const searchInput = page
      .getByLabel(/Edit search query/i)
      .or(page.locator('input[aria-label="Edit search query"]'));
    await searchInput.fill('Iron Man');
    await searchInput.press('Enter');

    const firstMovie = page
      .getByRole('button', { name: /View details for/i })
      .first();
    await expect(firstMovie).toBeVisible({ timeout: 15000 });
    await firstMovie.click();

    const watchlistBtn = page.getByRole('button', {
      name: /Watchlist|Remove/i,
    });
    await expect(watchlistBtn).toBeVisible({ timeout: 10000 });

    const btnText = await watchlistBtn.textContent();
    if (btnText?.includes('Watchlist')) {
      await watchlistBtn.click();
      await expect(watchlistBtn).toHaveText(/Remove/i, { timeout: 10000 });
    }

    const closeBtn = page.getByRole('button', { name: /Close modal/i });
    await closeBtn.click();

    // --- STEP 2: VERIFY PERSISTENCE ---
    await page.goto('/watchlist');

    const watchlistItem = page
      .getByRole('button', { name: /View details for/i })
      .first();
    await expect(watchlistItem).toBeVisible({ timeout: 10000 });

    // --- STEP 3: REMOVE FROM WATCHLIST ---
    await watchlistItem.click();

    const removeBtn = page.getByRole('button', { name: /Remove/i });
    await expect(removeBtn).toBeVisible({ timeout: 10000 });
    await removeBtn.click();
    await expect(page.getByRole('button', { name: /Watchlist/i })).toBeVisible({
      timeout: 10000,
    });

    await page.getByRole('button', { name: /Close modal/i }).click();

    await expect(page.getByText(/No items on/i)).toBeVisible({
      timeout: 10000,
    });
  });

  test('should accurately track playback progress and show in Continue Watching', async () => {
    // --- STEP 1: START PLAYBACK ---
    await page.goto('/search');

    const searchInput = page
      .getByLabel(/Edit search query/i)
      .or(page.locator('input[aria-label="Edit search query"]'));
    await searchInput.fill('Spider-Man');
    await searchInput.press('Enter');

    const firstMovie = page
      .getByRole('button', { name: /View details for/i })
      .first();
    await expect(firstMovie).toBeVisible({ timeout: 15000 });
    await firstMovie.click();

    // The primary action button ('Watch Solo', 'Play S1:E1', or 'Resume') handles playback directly.
    const watchSoloBtn = page
      .getByRole('button', { name: /Watch Solo|Play|Resume/i })
      .first();
    await expect(watchSoloBtn).toBeVisible({ timeout: 10000 });
    await watchSoloBtn.click();

    await expect(page).toHaveURL(/\/watch\//i, { timeout: 15000 });

    const videoElement = page.locator('video');
    await expect(videoElement).toBeVisible({ timeout: 15000 });

    // Force simulate playback progress to bypass headless Chrome media restrictions.
    // 1. Force the video to play so React's 'isPlaying' goes true
    await videoElement.evaluate(async (vid: HTMLVideoElement) => {
      try {
        await vid.play();
      } catch (_e) {}
    });

    // 2. Wait for React to register the play state
    await page.waitForTimeout(1000);

    // 3. Setting currentTime > 0 and pausing triggers useWatchProgress "save on pause" mechanism.
    await videoElement.evaluate((vid: HTMLVideoElement) => {
      vid.currentTime = 15;
      vid.pause();
    });

    // Brief wait to allow the socket.io emit('watch:update_progress') to complete
    await page.waitForTimeout(1500);

    // --- STEP 2: VERIFY CONTINUE WATCHING ---
    await page.goto('/continue-watching');

    // Should see Spider-Man in the list
    await expect(page.getByText(/Spider-Man/i).first()).toBeVisible({
      timeout: 15000,
    });

    // --- STEP 3: VERIFY RESUME FUNCTIONALITY ---
    const cwItem = page
      .locator('li')
      .filter({ hasText: /Spider-Man/i })
      .first()
      .locator('button')
      .first();
    await cwItem.click();

    // Verify modal has 'Resume' button
    const resumeBtn = page.getByRole('button', { name: /Resume/i });
    await expect(resumeBtn).toBeVisible({ timeout: 10000 });
  });
});
