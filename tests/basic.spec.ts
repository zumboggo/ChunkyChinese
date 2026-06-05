import { test, expect } from '@playwright/test';

test.describe('Chunky Chinese Vocab Smoke Tests', () => {
  test('should load the dashboard and navigate to settings', async ({ page }) => {
    // 1. Load the application
    await page.goto('/');

    // 2. Check the document title
    await expect(page).toHaveTitle('Chunky Chinese');

    // 3. Verify the main dashboard heading is visible
    const mainHeading = page.locator('h1', { hasText: 'Press play, think, keep moving.' });
    await expect(mainHeading).toBeVisible();

    // 4. Locate and click the Settings navigation button
    const settingsButton = page.locator('nav.tabs button', { hasText: 'Settings' });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // 5. Verify the Settings heading is visible
    const settingsHeading = page.locator('h1', { hasText: 'Settings' });
    await expect(settingsHeading).toBeVisible();

    // 6. Verify section inside Settings exists
    const cloudSyncHeading = page.locator('h2', { hasText: 'Cloud sync' });
    await expect(cloudSyncHeading).toBeVisible();
  });
});
