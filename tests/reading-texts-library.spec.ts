import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Reading Texts exposes the book library and keeps it accessible from a book', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: 'Reader menu' }).click()
  await page.getByRole('button', { name: 'Back to library' }).click()

  await expect(page.getByRole('heading', { name: 'Reading' })).toBeVisible()
  await page.getByRole('button', { name: /^Novels/ }).click()
  await expect(page.getByRole('heading', { name: 'Novels', exact: true })).toBeVisible()

  const justFriends = page.locator('.reading-library-book', { hasText: 'Just Friends?' })
  const monkeyKing = page.locator('.reading-library-book', { hasText: 'Rise of the Monkey King' })
  const sherlock = page.locator('.reading-library-book', { hasText: 'Sherlock Holmes' })
  const john = page.locator('.reading-library-book', { hasText: 'Gospel of John' })
  await expect(justFriends).toBeVisible()
  await expect(monkeyKing).toBeVisible()
  await expect(sherlock).toBeVisible()
  await expect(john).toBeVisible()

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

test('Gospel of John starts from the novels shelf in the text-first reader', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: 'Reader menu' }).click()
  await page.getByRole('button', { name: 'Back to library' }).click()
  await page.getByRole('button', { name: /^Novels/ }).click()

  await expect(page.getByRole('heading', { name: 'Novels', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Start Gospel of John', exact: true }).click()

  await expect(page.locator('.reader-page-meta')).toContainText('Gospel of John')
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 812')

  const nextSentence = page.getByRole('button', { name: /Next sentence/ })
  await expect(page.locator('.reader-illustration')).toHaveCount(0)

  for (let sentence = 2; sentence <= 6; sentence += 1) {
    await nextSentence.click()
    await expect(page.locator('.reader-page-meta')).toContainText(`Sentence ${sentence} / 812`)
  }

  await nextSentence.click()
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 7 / 812')
  await expect(page.locator('.reader-illustration')).toHaveCount(0)
})
