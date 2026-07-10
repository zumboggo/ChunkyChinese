import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block' })

test('Reader Listening Mode is stable and phone-friendly', async ({ page }, testInfo) => {
  const consoleErrors: string[] = []
  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text())
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page).toHaveTitle('Chunky Chinese')
  await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible()

  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await page.getByRole('button', { name: /^Novels/ }).click()

  const firstBook = page.locator('.reading-library-book').first()
  await expect(firstBook).toBeVisible()
  await firstBook.getByRole('button', { name: 'Start', exact: true }).click()

  const sentenceMeta = page.locator('.reader-page-meta')
  await expect(sentenceMeta).toContainText('Sentence 1 /')

  await page.getByRole('button', { name: 'Reader menu' }).click()
  await page.getByLabel('Speed').selectOption('0.9')
  await page.getByLabel('Repeats').selectOption('3')
  await page.getByRole('button', { name: 'Listen from sentence 1' }).click()

  await expect(page.locator('.reader-listening-controls')).toBeVisible()
  await expect(page.locator('.reader-translation')).toHaveClass(/revealed/)
  await expect(page.locator('.reader-reading-area')).toHaveClass(/reader-listening-highlight/)
  await expect(page.getByRole('button', { name: /Pause listening|Play listening/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Next sentence/ })).toBeVisible()

  await page.waitForTimeout(900)
  await expect(sentenceMeta).toContainText('Sentence 1 /')

  await page.getByRole('button', { name: 'Reader menu' }).click()
  await expect(page.getByLabel('Speed')).toHaveValue('0.9')
  await expect(page.getByLabel('Repeats')).toHaveValue('3')
  await page.locator('.sentence-menu-backdrop').click({ position: { x: 5, y: 5 } })

  await page.screenshot({
    path: testInfo.outputPath(`reader-listening-${testInfo.project.name}.png`),
    fullPage: false,
  })

  expect(consoleErrors).toEqual([])
})
