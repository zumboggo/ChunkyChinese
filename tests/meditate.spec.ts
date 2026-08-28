import { expect, test } from '@playwright/test'

test('opens Psalm 23 with stacked pinyin, Chinese, gloss, and revealed English', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Meditate/ }).click()

  await expect(page.getByRole('heading', { name: 'Scripture, one phrase at a time' })).toBeVisible()
  await page.getByRole('button', { name: /诗篇二十三篇/ }).click()

  const shepherdPhrase = page.getByRole('button', { name: /牧者/ })
  await expect(shepherdPhrase.locator('.meditate-pinyin')).toContainText('mù zhě')
  await expect(shepherdPhrase.locator('strong')).toHaveText('牧者')
  await expect(shepherdPhrase.locator('.meditate-gloss')).toHaveText('shepherd')

  await page.getByRole('button', { name: 'Tap for the natural English sentence' }).click()
  await expect(page.getByText('The LORD is my shepherd; I will lack nothing.')).toBeVisible()
})
