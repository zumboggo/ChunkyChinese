import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Sherlock Holmes appears in the Novels and Stories reader', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Press play, think, keep moving.' })).toBeVisible()

  await page.getByRole('button', { name: 'Reading', exact: true }).click()
  await page.getByRole('button', { name: /Novels & Stories/ }).click()

  const sherlockCard = page.locator('.reader-book-card', {
    hasText: 'Sherlock Holmes: Case of the Curly Haired Company',
  })
  await expect(sherlockCard).toBeVisible()
  await expect(sherlockCard).toContainText('Chapters 1-10')

  await sherlockCard.getByRole('button', { name: 'Start from beginning' }).click()
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 549')
  await expect(page.getByRole('button', { name: '一个, yí gè' })).toBeVisible()
})
