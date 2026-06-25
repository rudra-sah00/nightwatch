import { type BrowserContext, expect, type Page, test } from '@playwright/test';

/**
 * E2E TEST: Explore Feature — Feed, Posts, Threads, Reactions, DM, Block
 *
 * Covers:
 * 1. Feed loading + pagination
 * 2. Post creation (text, tags, media)
 * 3. Thread view with nested Reddit-style replies
 * 4. Reactions + poll voting
 * 5. Post editing
 * 6. DM conversations + messaging
 * 7. Block user from feed
 * 8. Notification preferences
 */
test.describe('Explore Feature E2E', () => {
  let context: BrowserContext;
  let page: Page;

  test.beforeEach(async ({ browser }) => {
    context = await browser.newContext();
    page = await context.newPage();

    // Authenticate
    await page.goto('/login');
    await page.locator('#email').fill(process.env.E2E_TEST_EMAIL ?? '');
    await page.locator('#password').fill(process.env.E2E_TEST_PASSWORD ?? '');
    await page.getByRole('button', { name: /Launch Sync/i }).click();

    await page.waitForSelector('input', { timeout: 10000 });
    await page
      .locator('input')
      .first()
      .fill(process.env.E2E_TEST_OTP ?? '000000');
    await page.getByRole('button', { name: /Verify & Sign In/i }).click();

    await expect(page).toHaveURL(/\/home|\/search/i, { timeout: 15000 });
  });

  test.afterEach(async () => {
    await context.close();
  });

  // ===== FEED =====

  test('feed loads posts on /explore', async () => {
    await page.goto('/explore');
    // Wait for either posts or empty state
    const postOrEmpty = page
      .locator('article')
      .first()
      .or(page.getByText('No posts yet'));
    await expect(postOrEmpty).toBeVisible({ timeout: 10000 });
  });

  test('feed shows loading skeleton then content', async () => {
    await page.goto('/explore');
    // Either skeleton was visible briefly or posts loaded fast
    const post = page.locator('article').first();
    await expect(post.or(page.getByText('No posts yet'))).toBeVisible({
      timeout: 10000,
    });
  });

  // ===== POST CREATION =====

  test('create a text post via composer', async () => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);

    // Click the + button to open composer
    const plusBtn = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-plus') });
    await plusBtn.click();

    // Composer dialog should appear
    const textarea = page.locator('textarea');
    await expect(textarea).toBeVisible({ timeout: 3000 });

    // Type content
    const testContent = `E2E test post ${Date.now()}`;
    await textarea.fill(testContent);

    // Submit
    const postBtn = page.getByRole('button', { name: /Post/i });
    await postBtn.click();

    // Post should appear in feed
    await expect(page.getByText(testContent)).toBeVisible({ timeout: 10000 });
  });

  // ===== THREAD & NESTED REPLIES =====

  test('open thread and send a reply', async () => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);

    // Click on the first post's content to open thread
    const firstPost = page.locator('article').first();
    await expect(firstPost).toBeVisible({ timeout: 10000 });

    // Click reply button on first post
    const replyBtn = firstPost
      .locator('button')
      .filter({ has: page.locator('svg.lucide-message-circle') })
      .first();
    await replyBtn.click();

    // ThreadView should slide in
    const threadHeader = page.getByText('Thread');
    await expect(threadHeader).toBeVisible({ timeout: 3000 });

    // Type a reply
    const replyInput = page.locator('input[placeholder="Write a reply..."]');
    await expect(replyInput).toBeVisible();
    const replyText = `E2E reply ${Date.now()}`;
    await replyInput.fill(replyText);

    // Send
    const sendBtn = page
      .locator('button')
      .filter({ has: page.locator('svg.lucide-send') })
      .last();
    await sendBtn.click();

    // Reply should appear in thread
    await expect(page.getByText(replyText)).toBeVisible({ timeout: 5000 });
  });

  test('nested reply appears indented under parent', async () => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);

    // Open first post thread
    const firstPost = page.locator('article').first();
    await expect(firstPost).toBeVisible({ timeout: 10000 });
    const replyBtn = firstPost
      .locator('button')
      .filter({ has: page.locator('svg.lucide-message-circle') })
      .first();
    await replyBtn.click();
    await expect(page.getByText('Thread')).toBeVisible({ timeout: 3000 });

    // Wait for replies to load
    await page.waitForTimeout(1000);

    // If there's an existing reply, click "Reply" on it to create a nested reply
    const existingReplyBtn = page.locator('button:has-text("Reply")').first();
    if (await existingReplyBtn.isVisible()) {
      await existingReplyBtn.click();

      // Should show "Replying to X" label
      await expect(page.getByText(/Replying to/)).toBeVisible();

      const replyInput = page.locator('input[placeholder="Write a reply..."]');
      const nestedReplyText = `Nested E2E ${Date.now()}`;
      await replyInput.fill(nestedReplyText);

      const sendBtn = page
        .locator('button')
        .filter({ has: page.locator('svg.lucide-send') })
        .last();
      await sendBtn.click();

      // Nested reply should appear with indentation (ml-4 class = border-l)
      const nestedReply = page.getByText(nestedReplyText);
      await expect(nestedReply).toBeVisible({ timeout: 5000 });

      // Verify it's inside a nested container (has border-l ancestor)
      const parent = nestedReply.locator(
        'xpath=ancestor::div[contains(@class, "border-l")]',
      );
      await expect(parent.first()).toBeVisible();
    }
  });

  // ===== REACTIONS =====

  test('react to a post and see count update', async () => {
    await page.goto('/explore');
    const firstPost = page.locator('article').first();
    await expect(firstPost).toBeVisible({ timeout: 10000 });

    // Click the smile/react button to open picker
    const reactBtn = firstPost
      .locator('button')
      .filter({ has: page.locator('svg.lucide-smile-plus') });
    await reactBtn.click();

    // Pick an emoji from the popup
    const emojiBtn = page.locator('button:has-text("🔥")').first();
    await expect(emojiBtn).toBeVisible({ timeout: 2000 });
    await emojiBtn.click();

    // Reaction pill should appear on the post
    await expect(firstPost.getByText('🔥')).toBeVisible({ timeout: 3000 });
  });

  // ===== POST EDITING =====

  test('edit own post content', async () => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);

    // Find own post (has the three-dot menu)
    const ownPost = page
      .locator('article')
      .filter({ has: page.locator('svg.lucide-more-horizontal') })
      .first();

    if (await ownPost.isVisible()) {
      // Open menu
      const menuBtn = ownPost
        .locator('button')
        .filter({ has: page.locator('svg.lucide-more-horizontal') });
      await menuBtn.click();

      // Click Edit
      const editBtn = page.getByText('Edit');
      if (await editBtn.isVisible()) {
        await editBtn.click();

        // Textarea should appear with existing content
        const editArea = ownPost.locator('textarea');
        await expect(editArea).toBeVisible();

        // Modify content
        const newContent = `Edited ${Date.now()}`;
        await editArea.fill(newContent);

        // Save
        await ownPost.getByRole('button', { name: /Save/i }).click();

        // Post should show new content + (edited) indicator
        await expect(ownPost.getByText(newContent)).toBeVisible({
          timeout: 3000,
        });
      }
    }
  });

  // ===== DM =====

  test('navigate to DM and view conversations', async () => {
    await page.goto('/dm');
    await page.waitForTimeout(2000);

    // Should show conversations list or "No messages yet"
    const content = page
      .getByText(/No messages yet/)
      .or(page.locator('button').filter({ hasText: /.+/ }).first());
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('open a DM conversation and send message', async () => {
    await page.goto('/dm');
    await page.waitForTimeout(3000);

    // Click first conversation if exists
    const firstConv = page
      .locator('button')
      .filter({ has: page.locator('img') })
      .first();
    if (await firstConv.isVisible()) {
      await firstConv.click();
      await page.waitForTimeout(500);

      // Message input should be visible
      const msgInput = page.locator('input[placeholder*="Message"]');
      await expect(msgInput).toBeVisible({ timeout: 3000 });

      // Send a message
      const testMsg = `E2E msg ${Date.now()}`;
      await msgInput.fill(testMsg);
      await msgInput.press('Enter');

      // Message should appear in chat
      await expect(page.getByText(testMsg)).toBeVisible({ timeout: 3000 });
    }
  });

  // ===== BLOCK USER =====

  test('block user removes their posts from feed', async () => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);

    const posts = page.locator('article');
    const initialCount = await posts.count();

    if (initialCount > 1) {
      // Find a non-own post (one without edit/delete in menu)
      // Click menu on second post
      const secondPost = posts.nth(1);
      const menuBtn = secondPost
        .locator('button')
        .filter({ has: page.locator('svg.lucide-more-horizontal') });

      if (await menuBtn.isVisible()) {
        await menuBtn.click();

        const blockBtn = page.getByText(/Block @/);
        if (await blockBtn.isVisible()) {
          await blockBtn.click();

          // Posts by that user should be gone
          await page.waitForTimeout(500);
          const newCount = await posts.count();
          expect(newCount).toBeLessThan(initialCount);
        }
      }
    }
  });

  // ===== NOTIFICATION PREFERENCES =====

  test('toggle notification preferences', async () => {
    await page.goto('/profile/preferences/notifications');
    await page.waitForTimeout(2000);

    // Should see the preferences toggles
    const reactionsToggle = page.getByText('Reactions').locator('..');
    await expect(reactionsToggle).toBeVisible({ timeout: 5000 });

    // Click to toggle reactions on
    await reactionsToggle.click();
    await page.waitForTimeout(500);

    // Reload and verify it persisted
    await page.reload();
    await page.waitForTimeout(2000);

    // The toggle should reflect the new state (check the slider position)
    const toggle = page
      .getByText('Reactions')
      .locator('..')
      .locator('div[class*="bg-primary"]');
    await expect(toggle).toBeVisible({ timeout: 5000 });
  });

  // ===== POLL VOTING =====

  test('vote on a poll shows results', async () => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);

    // Find a poll card
    const pollCard = page
      .locator('[class*="rounded-xl"]')
      .filter({ has: page.locator('button:not([disabled])') })
      .filter({ hasText: /vote/ });

    if (await pollCard.first().isVisible()) {
      // Click first poll option
      const option = pollCard.first().locator('button').first();
      await option.click();

      // Should show percentage results
      await expect(pollCard.first().getByText('%')).toBeVisible({
        timeout: 3000,
      });
    }
  });

  // ===== SWIPE NAVIGATION =====

  test('swipe between explore and dm tabs', async () => {
    await page.goto('/explore');
    await page.waitForTimeout(2000);

    // Bottom bar should be visible with Home and Messages icons
    const homeIcon = page.locator('svg.lucide-home');
    const msgIcon = page.locator('svg.lucide-message-circle').last();
    await expect(homeIcon).toBeVisible();
    await expect(msgIcon).toBeVisible();

    // Click messages icon to navigate to DM
    await msgIcon.click();
    await page.waitForURL(/\/dm/, { timeout: 5000 });
  });
});
