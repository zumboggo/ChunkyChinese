import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Just Friends appears as a twelve-chapter graded reader', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Press play, think, keep moving.' })).toBeVisible()

  await page.getByRole('button', { name: 'Reading', exact: true }).click()
  await page.getByRole('button', { name: /Novels & Stories/ }).click()

  const justFriendsCard = page.locator('.reader-book-card', {
    hasText: 'Just Friends?',
  })
  await expect(justFriendsCard).toBeVisible()
  await expect(justFriendsCard).toContainText('Chapters 1-12')

  await justFriendsCard.getByRole('button', { name: 'Start from beginning' }).click()
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 329')
  await expect(page.getByRole('button', { name: '钱, qián' })).toBeVisible()
  await expect(page.getByRole('button', { name: '今年, jīn nián' })).toBeVisible()
})
