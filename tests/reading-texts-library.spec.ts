import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Reading Texts exposes the book library and keeps it accessible from a book', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.reading-texts-start').click()

  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible()
  await page.getByRole('button', { name: /^Novels/ }).click()
  await expect(page.getByRole('heading', { name: 'Novels', exact: true })).toBeVisible()

  const justFriends = page.locator('.reading-library-book', { hasText: 'Just Friends?' })
  const monkeyKing = page.locator('.reading-library-book', { hasText: 'Rise of the Monkey King' })
  const sherlock = page.locator('.reading-library-book', { hasText: 'Sherlock Holmes' })
  await expect(justFriends).toBeVisible()
  await expect(monkeyKing).toBeVisible()
  await expect(sherlock).toBeVisible()

  await justFriends.getByRole('button', { name: 'Start', exact: true }).click()
  await expect(page.locator('.reader-page-meta')).toContainText('Just Friends?')
  await expect(page.getByRole('button', { name: 'Library', exact: true })).toBeVisible()

  await page.getByRole('button', { name: 'Library', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible()
  await expect(page.getByRole('button', { name: /^Novels/ })).toBeVisible()

  await page.screenshot({
    path: testInfo.outputPath(`reading-texts-library-${testInfo.project.name}.png`),
    fullPage: true,
  })

  expect(consoleErrors).toEqual([])
})

test('Stories start directly from their cover', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: /^Stories/ }).click()

  await expect(page.getByRole('heading', { name: 'Stories', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start Gospel of John', exact: true }).click()

  await expect(page.locator('.reader-page-meta')).toContainText('Gospel of John')
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 812')
})
