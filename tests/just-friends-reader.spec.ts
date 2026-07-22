import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Just Friends appears as a twelve-chapter graded reader', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible()

  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: 'Reader menu' }).click()
  await page.getByRole('button', { name: 'Back to library' }).click()
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

test('Reader word taps and horizontal swipes remain functional', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible()

  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: 'Reader menu' }).click()
  await page.getByRole('button', { name: 'Back to library' }).click()
  await page.getByRole('button', { name: /^Novels/ }).click()
  const justFriendsCard = page.locator('.reading-library-book', { hasText: 'Just Friends?' })
  await justFriendsCard.getByRole('button', { name: 'Start', exact: true }).click()

  const sentenceMeta = page.locator('.reader-page-meta')
  const swipeZone = page.locator('.reader-swipe-zone')
  await expect(sentenceMeta).toContainText('Sentence 1 / 329')

  await page.locator('.reader-token').first().click()
  await expect(page.locator('.reader-word-popover')).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()

  await swipeZone.dispatchEvent('touchstart', {
    touches: [{ identifier: 1, clientX: 310, clientY: 320 }],
  })
  await swipeZone.dispatchEvent('touchmove', {
    touches: [{ identifier: 1, clientX: 120, clientY: 320 }],
  })
  await swipeZone.dispatchEvent('touchend', { touches: [] })
  await expect(sentenceMeta).toContainText('Sentence 2 / 329')

  await swipeZone.dispatchEvent('touchstart', {
    touches: [{ identifier: 2, clientX: 120, clientY: 320 }],
  })
  await swipeZone.dispatchEvent('touchmove', {
    touches: [{ identifier: 2, clientX: 310, clientY: 320 }],
  })
  await swipeZone.dispatchEvent('touchend', { touches: [] })
  await expect(sentenceMeta).toContainText('Sentence 1 / 329')
})
