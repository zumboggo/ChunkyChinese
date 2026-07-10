import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Just Friends appears as a twelve-chapter graded reader', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible()

  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: /^Novels/ }).click()

  const justFriendsCard = page.locator('.reading-library-book', {
    hasText: 'Just Friends?',
  })
  await expect(justFriendsCard).toBeVisible()
  await expect(justFriendsCard).toContainText('Chapters 1-12')

  await justFriendsCard.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 329')
  await expect(page.getByRole('button', { name: '钱, qián' })).toBeVisible()
  await expect(page.getByRole('button', { name: '今年, jīn nián' })).toBeVisible()
})
