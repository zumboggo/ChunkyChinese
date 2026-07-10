import { gzipSync } from 'node:zlib'
import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const assetsDir = new URL('../dist/assets/', import.meta.url)
const assetsPath = fileURLToPath(assetsDir)
const files = await readdir(assetsDir)
const budgets = [
  { pattern: /^index-.*\.js$/, label: 'startup JavaScript', gzipLimit: 500 * 1024 },
  { pattern: /^index-.*\.css$/, label: 'startup CSS', gzipLimit: 90 * 1024 },
]

let failed = false
for (const budget of budgets) {
  const file = files.find((name) => budget.pattern.test(name))
  if (!file) throw new Error(`Could not find ${budget.label} in dist/assets`)
  const bytes = await readFile(join(assetsPath, file))
  const gzipBytes = gzipSync(bytes).byteLength
  const limitKb = Math.round(budget.gzipLimit / 1024)
  const actualKb = Math.round(gzipBytes / 1024)
  console.log(`${budget.label}: ${actualKb} KB gzip (budget ${limitKb} KB)`)
  if (gzipBytes > budget.gzipLimit) failed = true
}

if (failed) {
  console.error('Startup bundle budget exceeded. Lazy-load optional features before increasing the budget.')
  process.exitCode = 1
}
