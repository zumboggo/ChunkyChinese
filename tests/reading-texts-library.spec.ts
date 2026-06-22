import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Reading Texts exposes the book library and keeps it accessible from a book', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Reading', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Reading Texts' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible()

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
  await expect(page.getByRole('heading', { name: 'Your Library' })).toBeVisible()
  await expect(monkeyKing).toBeVisible()

  await page.screenshot({
    path: testInfo.outputPath(`reading-texts-library-${testInfo.project.name}.png`),
    fullPage: true,
  })

  expect(consoleErrors).toEqual([])
})
