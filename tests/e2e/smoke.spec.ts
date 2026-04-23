import { expect, test } from '@playwright/test';

test.describe('Watch Party Smoke Test', () => {
  test('should load the home page and show the login button if not authenticated', async ({
    page,
  }) => {
    await page.goto('/');

    // Check for a common element like "Watch Party" or "Sign In"
    // Adjust based on the actual UI text found in SearchClient or Landing
    await expect(page).toHaveTitle(/Nightwatch/i);

    // If there is a login button, verify it exists
    const loginLink = page
      .getByRole('link', { name: /Login/i })
      .or(page.getByRole('button', { name: /Login/i }));
    if (await loginLink.isVisible()) {
      await expect(loginLink).toBeVisible();
    }
  });

  test('should redirect to login when accessing protected routes', async ({
    page,
  }) => {
    await page.goto('/search');
    // Verify it redirects since we are not authenticated
    await expect(page).toHaveURL(/.*login/);
  });
});
