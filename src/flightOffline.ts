export interface OfflineShellResult {
  cached: number
  failed: number
}

const OFFLINE_READY_AT_KEY = 'chunky-offline-ready-v2-at'

export async function prepareOfflineAppShell(): Promise<OfflineShellResult> {
  if (!('serviceWorker' in navigator)) {
    throw new Error('Offline app caching is not supported in this browser.')
  }

  const registration = await navigator.serviceWorker.ready
  if (!navigator.serviceWorker.controller) {
    await new Promise<void>((resolve, reject) => {
      const timeout = window.setTimeout(() => {
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        reject(new Error('The offline worker could not take control. Reload once and try again.'))
      }, 15_000)
      function handleControllerChange() {
        window.clearTimeout(timeout)
        navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
        resolve()
      }
      navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    })
  }
  const worker = registration.active ?? registration.waiting
  if (!worker) throw new Error('The offline worker is not ready yet. Please try again.')

  const resources = performance
    .getEntriesByType('resource')
    .map((entry) => entry.name)
    .filter((url) => {
      try {
        return new URL(url).origin === window.location.origin
      } catch {
        return false
      }
    })

  return await new Promise<OfflineShellResult>((resolve, reject) => {
    const channel = new MessageChannel()
    const timeout = window.setTimeout(() => {
      channel.port1.close()
      reject(new Error('Preparing the offline app took too long. Please try again.'))
    }, 120_000)

    channel.port1.onmessage = (event: MessageEvent<OfflineShellResult & { error?: string }>) => {
      window.clearTimeout(timeout)
      channel.port1.close()
      if (event.data?.error) {
        reject(new Error(event.data.error))
        return
      }
      resolve({
        cached: Number(event.data?.cached) || 0,
        failed: Number(event.data?.failed) || 0,
      })
    }

    worker.postMessage({ type: 'PREPARE_OFFLINE', resources }, [channel.port2])
  })
}

export function getOfflineReadyAt(): string | null {
  return window.localStorage.getItem(OFFLINE_READY_AT_KEY)
}

export function markOfflineReady(): string {
  const readyAt = new Date().toISOString()
  window.localStorage.setItem(OFFLINE_READY_AT_KEY, readyAt)
  return readyAt
}
