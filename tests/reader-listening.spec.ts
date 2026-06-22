import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Reader Listening Mode is stable and phone-friendly', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveTitle('Chunky Chinese')
  await expect(page.getByRole('heading', { name: 'Press play, think, keep moving.' })).toBeVisible()

  await page.getByRole('button', { name: 'Open reader', exact: true }).click()
  await page.getByRole('button', { name: 'Classic Reading Mode', exact: true }).click()

  const firstBook = page.locator('.reader-book-card').first()
  await expect(firstBook).toBeVisible()
  await firstBook.getByRole('button', { name: 'Resume', exact: true }).click()

  const sentenceMeta = page.locator('.reader-page-meta')
  await expect(sentenceMeta).toContainText('Sentence 1 /')

  await page.locator('.reader-controls').getByRole('button', { name: 'Listening Mode' }).click()
  const dialog = page.getByRole('dialog', { name: 'Listening Mode' })
  await expect(dialog).toBeVisible()
  await expect(dialog.getByLabel('Speed')).toHaveValue('0.8')
  await expect(dialog.getByLabel('Repeat each sentence')).toHaveValue('2')
  await expect(dialog.getByLabel('Automatically continue to the next sentence')).toBeChecked()

  await dialog.getByLabel('Speed').selectOption('0.9')
  await dialog.getByLabel('Repeat each sentence').selectOption('3')
  await dialog.getByRole('button', { name: 'Start from sentence 1' }).click()

  await expect(page.locator('.reader-listening-dock')).toBeVisible()
  await expect(page.locator('.reader-translation')).toHaveClass(/revealed/)
  await expect(page.locator('.reader-reading-area')).toHaveClass(/reader-listening-highlight/)
  await expect(page.locator('.reader-listening-controls kbd')).toHaveText(['3', '4'])

  await page.waitForTimeout(900)
  await expect(sentenceMeta).toContainText('Sentence 1 /')

  await page.locator('.reader-listening-controls').getByRole('button', { name: 'Settings' }).click()
  await expect(dialog.getByLabel('Speed')).toHaveValue('0.9')
  await expect(dialog.getByLabel('Repeat each sentence')).toHaveValue('3')
  await dialog.getByRole('button', { name: 'Close' }).click()

  await page.screenshot({
    path: testInfo.outputPath(`reader-listening-${testInfo.project.name}.png`),
    fullPage: false,
  })

  expect(consoleErrors).toEqual([])
})
