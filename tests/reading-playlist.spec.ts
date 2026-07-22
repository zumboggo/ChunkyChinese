import { expect, test } from '@playwright/test'

test.use({
  serviceWorkers: 'block',
  viewport: { width: 412, height: 915 },
})

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    class MockAudio {
      src = ''
      currentTime = 0
      duration = 0.3
      playbackRate = 1
      onended: (() => void) | null = null
      onerror: (() => void) | null = null
      private timer: number | null = null

      load() {}
      removeAttribute() { this.src = '' }
      pause() {
        if (this.timer !== null) window.clearTimeout(this.timer)
        this.timer = null
      }
      play() {
        this.pause()
        this.timer = window.setTimeout(() => this.onended?.(), 300)
        return Promise.resolve()
      }
    }

    class MockSpeechSynthesisUtterance {
      text: string
      lang = ''
      rate = 1
      onstart: (() => void) | null = null
      onend: (() => void) | null = null
      onerror: (() => void) | null = null
      constructor(text: string) { this.text = text }
    }

    Object.defineProperty(window, 'Audio', { configurable: true, value: MockAudio })
    Object.defineProperty(window, 'SpeechSynthesisUtterance', {
      configurable: true,
      value: MockSpeechSynthesisUtterance,
    })
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        speak: (utterance: MockSpeechSynthesisUtterance) => {
          utterance.onstart?.()
          window.setTimeout(() => utterance.onend?.(), 300)
        },
        cancel: () => {},
      },
    })
  })
})

test('Reading opens the LMS playlist immediately with adaptive pinyin and phone-fit English', async ({ page }, testInfo) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.reading-texts-start').click()

  await expect(page.locator('.reader-meta-title')).toContainText('LMS Book 1 Chapters 1-5')
  await expect(page.getByRole('button', { name: /Pause listening|Play listening/ })).toBeVisible()
  await expect(page.locator('.reader-translation')).toBeVisible()
  await expect(page.locator('.reader-illustration')).toHaveCount(0)
  await expect(page.locator('.grammar-hint')).toHaveCount(0)
  await expect(page.locator('.reader-shadowing-cue')).toHaveCount(0)

  await page.getByRole('button', { name: 'Reader menu' }).click()
  await expect(page.getByLabel('Pinyin')).toHaveValue('adaptive')
  await expect(page.getByLabel('English')).toBeChecked()
  await expect(page.getByLabel('Repeats')).toHaveValue('3')
  await expect(page.getByLabel('Speak pause')).toHaveValue('1')
  await expect(page.locator('.reader-queue-row').first()).toContainText('LMS Book 1 Chapters 1-5')
  await page.locator('.sentence-menu-backdrop').click({ position: { x: 4, y: 4 } })

  const card = await page.locator('.reader-swipe-zone').boundingBox()
  const english = await page.locator('.reader-translation').boundingBox()
  expect(card).not.toBeNull()
  expect(english).not.toBeNull()
  expect(english!.y).toBeGreaterThan(card!.y + card!.height * 0.55)
  expect(english!.y + english!.height).toBeLessThanOrEqual(card!.y + card!.height + 2)

  const sentenceOverflow = await page.locator('.reader-sentence').evaluate(
    (element) => element.scrollHeight - element.clientHeight,
  )
  expect(sentenceOverflow).toBeLessThanOrEqual(2)

  const overflow = await page.evaluate(() => document.documentElement.scrollHeight - window.innerHeight)
  expect(overflow).toBeLessThanOrEqual(8)
  await page.screenshot({ path: testInfo.outputPath('reading-playlist-s23.png'), fullPage: false })
})

test('the final shadowing pause waits for a Continue tap before starting the next book', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 1 / 311')
  await page.evaluate(() => {
    localStorage.setItem('chunky-startup-resume-v1', JSON.stringify({
      version: 1,
      destination: 'reader',
      updatedAt: new Date().toISOString(),
      readerPackId: 'lms-books',
      readerBookId: 'lms-book-1-chapters-1-5',
      sentenceIndex: 310,
    }))
  })
  await page.reload({ waitUntil: 'domcontentloaded' })

  await expect(page.locator('.reader-page-meta')).toContainText('Sentence 311 / 311')
  await page.getByRole('button', { name: /Play sentence/ }).click()
  await expect(page.locator('.reader-book-complete')).toBeVisible({ timeout: 5_000 })
  await expect(page.locator('.reader-book-complete')).toContainText('LMS Book 1 Chapters 6-10')
  await expect(page.locator('.reader-meta-title')).toContainText('LMS Book 1 Chapters 1-5')

  await page.getByRole('button', { name: 'Continue to next book' }).click()
  await expect(page.locator('.reader-meta-title')).toContainText('LMS Book 1 Chapters 6-10')
  await expect(page.getByRole('button', { name: /Pause listening|Play listening/ })).toBeVisible()
})
