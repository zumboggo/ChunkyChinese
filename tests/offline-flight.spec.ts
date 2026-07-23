import { expect, test } from '@playwright/test'

test.use({
  serviceWorkers: 'allow',
  viewport: { width: 412, height: 915 },
})
test.describe.configure({ mode: 'serial' })
test.setTimeout(120_000)

test('cold-starts and opens the LMS Reader after the network is removed', async ({ context, page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })

  // Open Reader once so its text library is fully stored in IndexedDB.
  await page.locator('.dashboard-mode-card.reading-texts-start').click()
  await expect(page.locator('.reader-meta-title')).toContainText('LMS Book 1 Chapters 1-5', {
    timeout: 30_000,
  })

  const shellResult = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready
    const worker = registration.active
    if (!worker) throw new Error('Offline worker did not activate.')
    return await new Promise<{ cached: number; failed: number; error?: string }>((resolve) => {
      const channel = new MessageChannel()
      channel.port1.onmessage = (event) => resolve(event.data)
      worker.postMessage({
        type: 'PREPARE_OFFLINE',
        resources: performance.getEntriesByType('resource').map((entry) => entry.name),
      }, [channel.port2])
    })
  })
  expect(shellResult.error).toBeUndefined()
  expect(shellResult.failed).toBe(0)
  expect(shellResult.cached).toBeGreaterThan(0)

  await context.setOffline(true)
  await page.reload({ waitUntil: 'domcontentloaded' })
  await expect(page.locator('.reader-meta-title')).toContainText('LMS Book 1 Chapters 1-5', {
    timeout: 30_000,
  })
  await expect(page.locator('.reader-sentence')).toContainText(/[\u3400-\u9fff]/)
  await expect(page.locator('.reader-translation')).toBeVisible()
})

test('offers one-tap flight preparation with clear offline scope', async ({ page }) => {
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: 'Settings', exact: true }).click()

  await expect(page.getByRole('heading', { name: 'Prepare for offline use' })).toBeVisible()
  await expect(page.getByRole('button', { name: /Prepare for flight|Refresh offline bundle/ })).toBeVisible()
  await expect(page.getByText(/LMS flashcards and listening clips/)).toBeVisible()
  await expect(page.getByText(/Cloud sync, AI story generation/)).toBeVisible()
})
