import { expect, test } from '@playwright/test';

test.describe('Profile and Settings E2E', () => {
  test.beforeEach(async ({ page }) => {
    // Shared login for all profile tests
    await page.goto('/login');
    await page.locator('#email').fill(process.env.E2E_TEST_EMAIL ?? '');
    await page.locator('#password').fill(process.env.E2E_TEST_PASSWORD ?? '');
    await page.getByRole('button', { name: /Launch Sync/i }).click();

    // Handle OTP
    await page.waitForSelector('input', { timeout: 10000 });
    const otpInput = page.locator('input').first();
    await otpInput.fill(process.env.E2E_TEST_OTP ?? '000000');
    await page.getByRole('button', { name: /Verify & Sign In/i }).click();

    await expect(page).toHaveURL(/\/home|\/search/i, { timeout: 15000 });
  });

  test('should update display name and persist changes', async ({ page }) => {
    await page.goto('/profile');

    const nameInput = page.locator('#name');
    const newName = `Tester ${Math.floor(Math.random() * 1000)}`;

    // Fill and blur to trigger auto-submit (as seen in UpdateProfileForm.tsx)
    await nameInput.clear();
    await nameInput.fill(newName);
    await nameInput.blur();

    // Verify "Saving..." feedback if visible
    // Note: The form uses requestSubmit() on blur if hasChanges is true
    await page.waitForTimeout(1000); // Give it a second to sync

    // Refresh to verify persistence
    await page.reload();
    await expect(page.locator('#name')).toHaveValue(newName);
  });

  test('should change preferred server and persist selection', async ({
    page,
  }) => {
    await page.goto('/profile');

    // Find the "Balanced" server button (or any other)
    const balancedBtn = page.getByRole('button', { name: /Balanced/i });
    await expect(balancedBtn).toBeVisible();
    await balancedBtn.click();

    // Verify visual selection state (it gets a blue background/white text)
    await expect(balancedBtn).toHaveClass(/bg-\[#0055ff\]/);

    // Refresh to verify persistence
    await page.reload();
    const activeBtn = page.getByRole('button', { name: /Balanced/i });
    await expect(activeBtn).toHaveClass(/bg-\[#0055ff\]/);
  });

  test('should allow signing out', async ({ page }) => {
    await page.goto('/profile');

    const signOutBtn = page.getByRole('button', { name: /Sign Out/i });
    await signOutBtn.click();

    // Should redirect to login
    await expect(page).toHaveURL(/\/login/i, { timeout: 10000 });
  });
});
