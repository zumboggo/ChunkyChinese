import { expect, test } from '@playwright/test'

test.use({ viewport: { width: 390, height: 844 } })

test('dashboard goals and mode cards form balanced phone rows', async ({ page }) => {
  await page.goto('/')

  const goalBoxes = await page.locator('.goal-ring').evaluateAll((items) =>
    items.map((item) => {
      const box = item.getBoundingClientRect()
      return { x: box.x, y: box.y, width: box.width }
    }),
  )
  expect(goalBoxes).toHaveLength(3)
  expect(new Set(goalBoxes.map((box) => Math.round(box.y))).size).toBe(1)
  expect(goalBoxes.every((box) => box.width > 90)).toBe(true)

  const modeCards = page.locator('.dashboard-mode-card')
  await expect(modeCards).toHaveCount(3)
  for (const card of await modeCards.all()) {
    const box = await card.boundingBox()
    expect(box?.width).toBeGreaterThan(340)
    expect(box?.width).toBeLessThanOrEqual(370)
  }
  await expect(page.locator('.meditate-mode-logo')).toHaveCount(0)
  const readingProgress = page.locator('.reading-progress-panel')
  await expect(readingProgress).toBeVisible()
  const progressBox = await readingProgress.boundingBox()
  expect(progressBox?.width).toBeLessThanOrEqual(374)
  await expect(readingProgress).toContainText('3 focused minutes')
})

test('flashcard queue counters do not collide on a phone', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: /Flashcards Sort due/ }).click()

  const boxes = await page.locator('.flashcard-queue-counts .queue-count').evaluateAll((items) =>
    items.map((item) => {
      const box = item.getBoundingClientRect()
      return { left: box.left, right: box.right, top: box.top, width: box.width }
    }),
  )
  expect(boxes).toHaveLength(4)
  expect(new Set(boxes.map((box) => Math.round(box.top))).size).toBe(1)
  expect(boxes.every((box) => box.width > 75)).toBe(true)
  for (let index = 1; index < boxes.length; index += 1) {
    expect(boxes[index].left).toBeGreaterThanOrEqual(boxes[index - 1].right)
  }
})
