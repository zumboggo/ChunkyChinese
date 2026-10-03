import { expect, test } from '@playwright/test'

test.use({ serviceWorkers: 'block', viewport: { width: 390, height: 844 } })

test('short listening lessons offer navigation, pinyin, counts, and auto-next on a phone', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.listen-start').click()
  await expect(page.getByRole('heading', { name: 'A drink before we begin' })).toBeVisible()
  await expect(page.locator('.listening-course-count')).toHaveText('Listened 0 times')
  await expect(page.locator('.listening-course-pinyin').first()).toHaveText('chá')
  await page.getByRole('switch', { name: 'Auto-next' }).check()
  await page.getByLabel('Jump to', { exact: true }).fill('16')
  await page.getByRole('button', { name: 'Go to lesson number' }).click()
  await expect(page.getByRole('heading', { name: 'The Missing Assignment' })).toBeVisible()
  await page.getByText('Lesson phrases', { exact: true }).click()
  await expect(page.locator('.listening-phrase-pinyin').first()).not.toBeEmpty()
  await expect(page.getByText('Previous listening modes', { exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('switch', { name: 'Auto-next' })).toBeChecked()
  await expect(page.getByRole('heading', { name: 'The Missing Assignment' })).toBeVisible()
})
