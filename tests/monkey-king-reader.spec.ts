import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Rise of the Monkey King appears as a bilingual novel', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Press play, think, keep moving.' })).toBeVisible()

  await page.getByRole('button', { name: 'Reading', exact: true }).click()
  await page.getByRole('button', { name: /Novels & Stories/ }).click()

  const monkeyKingCard = page.locator('.reader-book-card', {
    hasText: 'Rise of the Monkey King',
  })
  await expect(monkeyKingCard).toBeVisible()
  await expect(monkeyKingCard).toContainText('Chapters 1-1')

  await monkeyKingCard.getByRole('button', { name: 'Start from beginning' }).click()
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 129')
  await expect(page.getByRole('button', { name: '孩子, hái zi' })).toBeVisible()
  await page.getByRole('button', { name: 'English blurred' }).click()
  await expect(page.locator('.reader-translation')).toContainText(
    'My dear child, I know that the hour is late.',
  )
  await page.getByRole('button', { name: /Play sentence/ }).click()
  await expect(page.locator('.reader-listening-status')).toContainText('Repeat 1 of 1')
})
