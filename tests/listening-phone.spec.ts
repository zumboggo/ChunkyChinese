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
      onstart: (() => void) | null = null
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
          window.setTimeout(() => utterance.onstart?.(), 0)
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

test('Listening Sets uses the phone shell without changing core controls', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.listen-start').click()

  const root = page.locator('.sentence-mode-root')
  await expect(root.getByRole('heading', { name: 'Listening' })).toBeVisible()
  await expect(root.getByRole('tab', { name: 'Sets' })).toHaveAttribute('aria-selected', 'true')
  await expect(root.locator('.sentence-round-info')).toContainText('Round 1 of 5')
  await expect(root.locator('.sentence-card')).toBeVisible()
  await expect(root.getByRole('button', { name: /Pause|Resume/ })).toBeVisible()
  await expect(page.getByRole('navigation', { name: 'Main navigation' }).getByRole('button', { name: 'Listening' })).toHaveClass(/active/)

  const card = root.locator('.sentence-card')
  await root.getByRole('button', { name: 'Menu' }).click()
  await page.getByLabel('Pinyin').uncheck()
  await page.locator('.sentence-menu-backdrop').click({ position: { x: 380, y: 800 } })
  await expect(root.locator('.sentence-pinyin-hint')).toBeVisible()
  await swipe(root.locator('.listening-sets-display'), { x: 190, y: 430 }, { x: 190, y: 300 }, 1)
  await expect(root.locator('.sentence-pinyin')).toBeVisible()
  await expect(card).toBeVisible()
})

test('Book Listening starts from the picker and preserves all four swipes', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.listen-start').click()
  await page.getByRole('tab', { name: 'Books' }).click()

  const firstBook = page.locator('.book-picker-row').first()
  await expect(firstBook).toBeVisible()
  await firstBook.click()

  const display = page.locator('.book-listen-display')
  const chinese = display.locator('.sentence-chinese')
  await expect(chinese).not.toBeEmpty()
  await expect(display.getByRole('button', { name: 'Pause' })).toBeVisible()
  const firstSentence = await chinese.textContent()

  await swipe(display, { x: 310, y: 430 }, { x: 105, y: 430 }, 2)
  await expect(chinese).not.toHaveText(firstSentence ?? '', { timeout: 3_000 })

  await swipe(display, { x: 105, y: 430 }, { x: 310, y: 430 }, 3)
  await expect(chinese).toHaveText(firstSentence ?? '', { timeout: 3_000 })

  await expect(display.locator('.sentence-english')).toBeVisible()
  await swipe(display, { x: 190, y: 430 }, { x: 190, y: 300 }, 4)
  await expect(display.locator('.sentence-english')).toBeHidden()

  await swipe(display, { x: 190, y: 300 }, { x: 190, y: 440 }, 5)
  await expect(display.getByRole('button', { name: 'Play' })).toBeVisible()
})
