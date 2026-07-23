import { defineConfig, devices } from '@playwright/test'

const baseURL = 'http://127.0.0.1:4174'

export default defineConfig({
  testDir: './tests',
  testMatch: 'offline-flight.spec.ts',
  workers: 1,
  timeout: 120_000,
  reporter: 'line',
  use: {
    ...devices['Desktop Chrome'],
    baseURL,
    serviceWorkers: 'allow',
    trace: 'on-first-retry',
  },
  webServer: {
    command: 'npm run preview -- --host 127.0.0.1 --port 4174',
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120_000,
  },
})
