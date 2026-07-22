import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Rise of the Monkey King appears as a bilingual novel', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible()

  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: 'Reader menu' }).click()
  await page.getByRole('button', { name: 'Back to library' }).click()
  await page.getByRole('button', { name: /^Novels/ }).click()

  const monkeyKingCard = page.locator('.reading-library-book', {
    hasText: 'Rise of the Monkey King',
  })
  await expect(monkeyKingCard).toBeVisible()
  await expect(monkeyKingCard).toContainText('Chapters 1-1')

  await monkeyKingCard.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 129')
  await expect(page.getByRole('button', { name: '孩子, hái zi' })).toBeVisible()
  await expect(page.locator('.reader-translation')).toContainText(
    'My dear child, I know that the hour is late.',
  )
  await expect(page.getByRole('button', { name: /Pause listening|Play listening/ })).toBeVisible()
})
