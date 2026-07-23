import { expect, test } from '@playwright/test'

test.use({
  serviceWorkers: 'allow',
  viewport: { width: 412, height: 915 },
})
test.describe.configure({ mode: 'serial' })
test.setTimeout(120_000)

test('cold-starts the cached application shell with no network', async ({ context, page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  const result = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    if (!registration.active) throw new Error('Offline worker did not activate.')
    const prepared = await new Promise<{ cached: number; failed: number }>((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = (event) => resolve(event.data)
      registration.active?.postMessage({
        type: 'PREPARE_OFFLINE',
        resources: performance.getEntriesByType('resource').map((entry) => entry.name),
      }, [channel.port2])
    })
    return prepared
  })
  expect(result.failed).toBe(0)
  await page.waitForFunction(() => Boolean(navigator.serviceWorker.controller))

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible({
    timeout: 30_000,
  })
})

test('verifies the complete audio libraries, including their final files, offline', async ({ context, page }) => {
  test.setTimeout(360_000)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()
  await page.getByRole('button', { name: 'Prepare for flight' }).click()
  await expect(page.locator('.offline-flight-panel .sync-synced')).toHaveText('Ready', {
    timeout: 330_000,
  })

  const downloaded = await page.evaluate(async () => {
    const sentenceCache = await caches.open('chunky-sentence-listening-v1')
    const readerCache = await caches.open('chunky-reader-downloads-v1')
    const sentenceRequests = await sentenceCache.keys()
    const readerRequests = (await readerCache.keys()).filter((request) => request.url.endsWith('.mp3'))
    const sampleIndexes = (length: number) => [0, Math.floor(length / 2), length - 1]
    const sampleSizes = async (requests: Request[]) =>
      await Promise.all(sampleIndexes(requests.length).map(async (index) => {
        const response = await caches.match(requests[index])
        return response ? (await response.blob()).size : 0
      }))

    const audioClipCount = await new Promise<number>((resolve, reject) => {
      const open = indexedDB.open('chunky-chinese-vocab')
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const transaction = open.result.transaction(['audioClips', 'settings'], 'readwrite')
        const count = transaction.objectStore('audioClips').count()
        count.onerror = () => reject(count.error)
        transaction.objectStore('settings').put(1_295, 'sentenceQueueOffset')
        transaction.onerror = () => reject(transaction.error)
        transaction.oncomplete = () => resolve(count.result)
      }
    })

    return {
      sentenceCount: sentenceRequests.length,
      sentenceSampleSizes: await sampleSizes(sentenceRequests),
      readerCount: readerRequests.length,
      readerSampleSizes: await sampleSizes(readerRequests),
      audioClipCount,
    }
  })

  expect(downloaded.sentenceCount).toBeGreaterThanOrEqual(2_600)
  expect(downloaded.sentenceSampleSizes.every((size) => size > 0)).toBe(true)
  expect(downloaded.readerCount).toBeGreaterThanOrEqual(1_000)
  expect(downloaded.readerSampleSizes.every((size) => size > 0)).toBe(true)
  expect(downloaded.audioClipCount).toBeGreaterThanOrEqual(5_000)

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('button', { name: 'Go to dashboard' })).toBeVisible()
  await page.waitForTimeout(500)
  await page.getByRole('button', { name: 'Listening', exact: true }).click()
  await expect(page.locator('.sentence-card')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('.sentence-chinese')).toContainText(/[\u3400-\u9fff]/)
  await expect(page.locator('.sentence-pool-progress')).toContainText('1296/1300')
  await page.getByRole('button', { name: 'Reading', exact: true }).click()
  await expect(page.locator('.reader-meta-title')).toContainText('LMS Book 1 Chapters 1-5', {
    timeout: 30_000,
  })
  await expect(page.locator('.reader-translation')).toBeVisible()
  await page.getByRole('button', { name: 'Flashcards', exact: true }).click()
  await expect(page.locator('.flashcard.front-side')).toBeVisible()
  for (let index = 0; index < 8; index += 1) {
    await page.keyboard.press('1')
    await expect(page.locator('.flashcard.answer-side')).toBeVisible()
    await page.keyboard.press('3')
    await expect(page.locator('.flashcard.front-side')).toBeVisible({ timeout: 5_000 })
  }
})

test('offers one-tap flight preparation with clear offline scope', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Prepare for offline use' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Prepare for flight|Refresh offline bundle/ })).toBeVisible()
  await expect(page.getByText(/LMS flashcards and listening clips/)).toBeVisible()
  await expect(page.getByText(/Cloud sync, AI story generation/)).toBeVisible()
})
