import { test, expect } from '@playwright/test';

test.describe('Chunky Chinese Vocab Smoke Tests', () => {
  test('should load the dashboard and navigate to settings', async ({ page }) => {
    // 1. Load the application
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // 2. Check the document title
    await expect(page).toHaveTitle('Chunky Chinese');

    // 3. Verify the immediately interactive dashboard is visible
    await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible();
    await expect(page.locator('.dashboard-mode-card.flashcards-start')).toBeVisible();

    // 4. Locate and click the Settings navigation button
    const settingsButton = page.getByRole('button', { name: 'Settings', exact: true });
    await expect(settingsButton).toBeVisible();
    await settingsButton.click();

    // 5. Verify the Settings heading is visible
    const settingsHeading = page.locator('h1', { hasText: 'Settings' });
    await expect(settingsHeading).toBeVisible();

    // Once the destination renders, the previous screen is no longer mounted
    // underneath it.
    expect(await page.locator('.dashboard').count()).toBe(0);

    // 6. Verify section inside Settings exists
    const cloudSyncHeading = page.locator('h2', { hasText: 'Cloud sync' });
    await expect(cloudSyncHeading).toBeVisible();
  });

  test('should expose passive sentence listening from the dashboard', async ({ page }) => {
    await page.addInitScript(() => {
      ;(window as unknown as { __spokenUtterances: Array<{ text: string; lang: string }> }).__spokenUtterances = []
      class MockSpeechSynthesisUtterance {
        text: string
        lang = ''
        rate = 1
        onend: (() => void) | null = null
        onerror: (() => void) | null = null

        constructor(text: string) {
          this.text = text
        }
      }
      Object.defineProperty(window, 'SpeechSynthesisUtterance', {
        configurable: true,
        value: MockSpeechSynthesisUtterance,
      })
      Object.defineProperty(window, 'speechSynthesis', {
        configurable: true,
        value: {
          speak: (utterance) => {
            ;(window as unknown as { __spokenUtterances: Array<{ text: string; lang: string }> }).__spokenUtterances.push({
              text: utterance.text,
              lang: utterance.lang,
            })
            window.setTimeout(() => utterance.onend?.(), 0)
          },
          cancel: () => {},
        },
      })
    })

    const sentenceDataLoaded = page
      .waitForResponse((response) =>
        response.url().includes('/seed/lms-sentences.json') && response.ok(),
      )
      .catch(() => null);

    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await sentenceDataLoaded;

    const sentencesButton = page.locator('.dashboard-mode-card.listen-start');
    await expect(sentencesButton).toBeVisible();
    await expect(sentencesButton).toContainText('Sentence loops by default');

    await sentencesButton.click();

    await expect(page.locator('.sentence-mode-display')).toBeVisible();
    await expect(page.locator('.sentence-round-info')).toContainText('Round 1 of 5');
    await expect(page.locator('.sentence-chinese')).not.toBeEmpty();
  });
});
