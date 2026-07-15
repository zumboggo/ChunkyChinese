import { expect, test, type Locator } from '@playwright/test'

test.use({
  serviceWorkers: 'block',
  viewport: { width: 390, height: 844 },
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class MockSpeechSynthesisUtterance {
      text: string
      lang = ''
      rate = 1
      onend: (() => void) | null = null
      onerror: (() => void) | null = null

      constructor(text: string) {
        this.text = text
      }
    }

    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: (utterance: MockSpeechSynthesisUtterance) => {
          window.setTimeout(() => utterance.onend?.(), 0)
        },
        cancel: () => {},
      },
    })
  })
})

async function swipe(
  target: Locator,
  from: { x: number; y: number },
  to: { x: number; y: number },
  identifier: number,
) {
  await target.dispatchEvent('touchstart', {
    touches: [{ identifier, clientX: from.x, clientY: from.y }],
  })
  await target.dispatchEvent('touchmove', {
    touches: [{ identifier, clientX: to.x, clientY: to.y }],
  })
  await target.dispatchEvent('touchend', { touches: [] })
}

async function openFlashcards(page: import('@playwright/test').Page) {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Seeded \d+ LMS target words\./)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Flashcards' }).click()
  await page.getByLabel('Flashcard queue').selectOption('new')
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
  await expect(page.locator('.flashcard.front-side')).toBeVisible()
}

test('Flashcards waits for startup vocabulary instead of opening an empty set', async ({ page }) => {
  await page.route('**/seed/lms-vocab-1000.csv', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 750))
    await route.continue()
  })

  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click()

  await expect(page.locator('.flashcards-complete strong')).toHaveText('Loading flashcards…')
  await expect(page.locator('.flashcard.front-side')).toBeVisible({ timeout: 15_000 })
})

test('phone Flashcards removes Sentence Mode and keeps core front controls', async ({ page }, testInfo) => {
  await openFlashcards(page)

  await expect(page.getByRole('heading', { name: 'Flashcards' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sentences', exact: true })).toHaveCount(0)
  await expect(page.locator('.flashcard-queue-counts')).toBeVisible()
  const bottomNav = page.getByRole('navigation', { name: 'Main navigation' })
  await expect(bottomNav.getByRole('button', { name: 'Flashcards' })).toHaveClass(/active/)
  await expect(bottomNav.locator('button')).toHaveCount(5)
  for (const button of await bottomNav.locator('button').all()) {
    await expect(button).toHaveText('')
  }

  const front = page.locator('.flashcard.front-side')
  await page.locator('.flashcard-play-audio').click()
  await expect(front).toBeVisible()

  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.locator('.card-edit-dialog')).toBeVisible()
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()

  await page.getByRole('button', { name: 'Audio only', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Audio only', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.locator('.flashcard-face-label')).toHaveText('Audio front')

  await page.screenshot({ path: testInfo.outputPath('flashcards-phone-front.png'), fullPage: false })
})

test('Flashcards uses swipes and Choice A-D keys without rating buttons', async ({ page }, testInfo) => {
  await openFlashcards(page)

  await page.keyboard.press('1')
  await expect(page.locator('.flashcard.answer-side')).toBeVisible()
  await expect(page.locator('.flashcard-rating-chip')).toHaveCount(0)

  for (const [key, rating] of [['1', 'Again'], ['2', 'Hard'], ['3', 'Good'], ['4', 'Easy']] as const) {
    await page.keyboard.press(key)
    await expect(page.locator('.flashcard-undo-toast')).toContainText(rating)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.locator('.flashcard.answer-side')).toBeVisible()
  }

  const gestures = [
    { from: { x: 310, y: 430 }, to: { x: 100, y: 430 }, rating: 'Again' },
    { from: { x: 190, y: 430 }, to: { x: 190, y: 280 }, rating: 'Hard' },
    { from: { x: 100, y: 430 }, to: { x: 310, y: 430 }, rating: 'Good' },
    { from: { x: 190, y: 280 }, to: { x: 190, y: 460 }, rating: 'Easy' },
  ]

  for (const [index, gesture] of gestures.entries()) {
    await swipe(page.locator('.flashcard.answer-side'), gesture.from, gesture.to, index + 1)
    await expect(page.locator('.flashcard-undo-toast')).toContainText(gesture.rating)
    await page.getByRole('button', { name: 'Undo', exact: true }).click()
    await expect(page.locator('.flashcard.answer-side')).toBeVisible()
  }

  await page.screenshot({ path: testInfo.outputPath('flashcards-phone-answer.png'), fullPage: false })
})

test('a repeated learning card resets its dismiss animation', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.getByText(/Seeded \d+ LMS target words\./)).toBeVisible({ timeout: 15_000 })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.locator('summary').filter({ hasText: 'Goals' }).click()
  await page.getByLabel('Flashcards / Day').fill('1')
  await page.locator('summary').filter({ hasText: 'Flashcards' }).click()
  await page.getByLabel('Flashcard queue').selectOption('new')
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click()

  await page.keyboard.press('1')
  await expect(page.locator('.flashcard.answer-side')).toBeVisible()
  await page.keyboard.press('1')

  const repeatedCard = page.locator('.flashcard.front-side')
  await expect(repeatedCard).toBeVisible()
  await expect(repeatedCard).not.toHaveClass(/card-dismiss-/)
})
