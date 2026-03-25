import { type BrowserContext, expect, type Page, test } from '@playwright/test';

/**
 * PRODUCTION-LEVEL E2E TEST: Watch Party Multi-User Handshake
 *
 * This test simulates a full production lifecycle:
 * 1. Host logs in and creates a room from a specific movie.
 * 2. Guest joins via the shared room link.
 * 3. Host approves the guest.
 * 4. Verification of real-time presence.
 */

test.describe('Watch Party Multi-User Flow', () => {
  let hostContext: BrowserContext;
  let guestContext: BrowserContext;
  let hostPage: Page;
  let guestPage: Page;

  test.beforeEach(async ({ browser }) => {
    // Create two separate contexts to ensure distinct sessions/cookies
    hostContext = await browser.newContext();
    guestContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    guestPage = await guestContext.newPage();
  });

  test.afterEach(async () => {
    await hostContext.close();
    await guestContext.close();
  });

  test('should complete the full Host-Guest handshake perfectly', async () => {
    // --- STEP 1: HOST LOGIN ---
    await hostPage.goto('/login');

    // Fill credentials
    await hostPage.locator('#email').fill(process.env.E2E_TEST_EMAIL ?? '');
    await hostPage
      .locator('#password')
      .fill(process.env.E2E_TEST_PASSWORD ?? '');

    // Submit (Handle potential captcha in dev if needed,
    // but usually Turnstile is bypassed by flags in config)
    await hostPage.getByRole('button', { name: /Launch Sync/i }).click();

    // Handle OTP
    await hostPage.waitForSelector('input', { timeout: 10000 });
    // OtpInput usually renders multiple inputs or one combined
    const otpInput = hostPage.locator('input').first();
    await otpInput.fill(process.env.E2E_TEST_OTP ?? '000000');
    await hostPage.getByRole('button', { name: /Verify & Sign In/i }).click();

    // Verify redirect to home/search
    await expect(hostPage).toHaveURL(/\/home|\/search/i, { timeout: 15000 });

    // --- STEP 2: HOST STARTS PARTY ---
    await hostPage.goto('/search');

    // Explicitly search for content to ensure results appear
    const searchInput = hostPage
      .getByLabel(/Edit search query/i)
      .or(hostPage.locator('input[aria-label="Edit search query"]'));
    await searchInput.fill('Spider-Man');
    await searchInput.press('Enter');

    // Pick first movie card - wait for it to appear
    const firstMovie = hostPage
      .getByRole('button', { name: /View details for/i })
      .first();
    await expect(firstMovie).toBeVisible({ timeout: 15000 });
    await firstMovie.click();

    // Click 'Start Party' button in modal
    // Note: The modal might take a moment to animate in
    const watchPartyBtn = hostPage.getByRole('button', {
      name: /Start Party/i,
    });
    await expect(watchPartyBtn).toBeVisible({ timeout: 10000 });
    await watchPartyBtn.click();

    // Pick Episode 1 to start
    // According to episode-card.tsx, the badge says "EP 1"
    const firstEpisode = hostPage.getByText(/EP 1/i).first();
    await firstEpisode.click();

    // Wait for Room initialization
    // The app uses path-based routing: /watch-party/[roomId]
    await expect(hostPage).toHaveURL(/\/watch-party\//i, { timeout: 15000 });
    const roomUrl = hostPage.url();
    // console.log(`Generated Room URL: ${roomUrl}`);

    // --- STEP 3: GUEST JOINS ---
    await guestPage.goto(roomUrl);

    // Verify Guest Lobby - using heading from WatchPartyLobby.tsx
    await expect(guestPage.getByText(/You're Invited/i)).toBeVisible({
      timeout: 15000,
    });

    // Enter Name - id="guestName" from WatchPartyLobby.tsx
    await guestPage.locator('#guestName').fill('Zoe');

    // Click 'Request to Join' button
    const requestJoinBtn = guestPage.getByRole('button', {
      name: /Request to Join/i,
    });
    await expect(requestJoinBtn).toBeEnabled();
    await requestJoinBtn.click();

    // Verify Guest sees "Waiting for Approval"
    await expect(guestPage.getByText(/Waiting for approval/i)).toBeVisible({
      timeout: 10000,
    });

    // --- STEP 4: HOST APPROVES ---
    await expect(hostPage.getByText(/Zoe/i)).toBeVisible({ timeout: 15000 });
    const approveBtn = hostPage
      .getByRole('button', { name: /Approve/i })
      .first();
    await approveBtn.click();

    // --- STEP 5: FINAL VERIFICATION ---
    // Guest should now be in the live room
    await expect(guestPage.getByText(/Connected/i)).toBeVisible({
      timeout: 15000,
    });
    await expect(guestPage.locator('video')).toBeVisible();

    // Explicitly switch to People tab to verify guest
    await hostPage.getByLabel(/People Tab/i).click();
    await expect(hostPage.getByText(/Zoe/i).first()).toBeVisible({
      timeout: 15000,
    });

    // --- STEP 6: ADVANCED INTERACTIONS (CHAT) ---
    // Switch both to Chat Tab
    await hostPage.getByLabel(/Chat Tab/i).click();
    await guestPage.getByLabel(/Chat Tab/i).click();

    // Host sends chat
    const hostChatInput = hostPage.locator('input[placeholder="Message..."]');
    await hostChatInput.fill('Hello from Host!');
    await hostPage.keyboard.press('Enter');

    // Guest verifies chat
    await expect(guestPage.getByText('Hello from Host!')).toBeVisible({
      timeout: 15000,
    });

    // Guest sends chat back
    const guestChatInput = guestPage.locator('input[placeholder="Message..."]');
    await guestChatInput.fill('Hey Host! Nice party.');
    await guestPage.keyboard.press('Enter');

    // Host verifies chat
    await expect(hostPage.getByText('Hey Host! Nice party.')).toBeVisible({
      timeout: 15000,
    });

    // --- STEP 7: TAB NAVIGATION (SOUNDBOARD & SKETCH) ---
    // Host switches to Soundboard
    await hostPage.getByLabel(/Soundboard Tab/i).click();
    await expect(hostPage.getByPlaceholder(/Search sounds/i)).toBeVisible({
      timeout: 10000,
    });

    // Host switches back to Chat
    await hostPage.getByLabel(/Chat Tab/i).click();
    await expect(
      hostPage.locator('input[placeholder="Message..."]'),
    ).toBeVisible();

    // Host switches to Sketch
    await hostPage.getByLabel(/Sketch Tab/i).click();
    await expect(hostPage.getByText(/Sketch Tools/i)).toBeVisible();

    // Guest switches to Sketch
    await guestPage.getByLabel(/Sketch Tab/i).click();
    await expect(
      guestPage
        .getByText(/Sketch Tools/i)
        .or(guestPage.getByText(/Sketching Disabled/i)),
    ).toBeVisible();
  });
});
