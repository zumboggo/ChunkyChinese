import { test, expect } from '@playwright/test';

test.describe('Chunky Chinese Vocab Smoke Tests', () => {
  test('should load the dashboard and navigate to settings', async ({ page }) => {
    // 1. Load the application
    await page.goto('/', { waitUntil: 'domcontentloaded' });

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

  test('should expose passive sentence listening from the dashboard', async ({ page }) => {
    const sentenceDataLoaded = page
      .waitForResponse((response) =>
        response.url().includes('/seed/lms-sentences.json') && response.ok(),
      )
      .catch(() => null);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await sentenceDataLoaded;

    const sentencesButton = page.locator('.mode-start.sentence-start');
    await expect(sentencesButton).toBeVisible();
    await expect(sentencesButton).toContainText('Passive sentence loops');

    await sentencesButton.click();

    await expect(page.locator('.sentence-mode-display')).toBeVisible();
    await expect(page.locator('.sentence-round-info')).toContainText('Round 1 of 25');
    await expect(page.locator('.sentence-current')).toBeVisible();
  });
});
