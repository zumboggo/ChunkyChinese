import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Sherlock Holmes appears in the Novels and Stories reader', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible()

  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: /^Novels/ }).click()

  const sherlockCard = page.locator('.reading-library-book', {
    hasText: 'Sherlock Holmes: Case of the Curly Haired Company',
  })
  await expect(sherlockCard).toBeVisible()
  await expect(sherlockCard).toContainText('Chapters 1-10')

  await sherlockCard.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 549')
  await expect(page.getByRole('button', { name: '一个, yí gè' })).toBeVisible()
})
