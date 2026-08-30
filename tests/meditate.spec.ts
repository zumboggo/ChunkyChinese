import { expect, test } from '@playwright/test'

test('opens Meditative Scripture inside Reading with contextual interlinear text', async ({ page }) => {
  await page.goto('/')
  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: 'Reader menu' }).click()
  await page.getByRole('button', { name: 'Back to library' }).click()
  await page.getByRole('button', { name: /^Novels/ }).click()
  const scripture = page.locator('.reading-library-book', { hasText: 'Meditative Scripture' })
  await expect(scripture).toBeVisible()
  await scripture.getByRole('button', { name: 'Start', exact: true }).click()

  const shepherdPhrase = page.locator('.reader-interlinear-chunk', { hasText: '牧者' })
  await expect(shepherdPhrase.locator('.reader-interlinear-pinyin')).toContainText('mù zhě')
  await expect(shepherdPhrase.locator('strong')).toHaveText('牧者')
  await expect(shepherdPhrase.locator('.reader-interlinear-gloss')).toHaveText('shepherd')
  await expect(page.getByText('The LORD is my shepherd; I will lack nothing.')).toBeVisible()
  await expect(page.getByRole('button', { name: /Meditate/ })).toHaveCount(0)
})
