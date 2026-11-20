import { createHash } from 'node:crypto'
import { readFileSync, readdirSync, writeFileSync } from 'node:fs'

// Include lazy routes and their dependencies, not just index.html's entry script.
const assets = readdirSync('dist/assets').filter((name) => /\.(?:js|css)$/.test(name)).sort()
const html = readFileSync('dist/index.html', 'utf8')
const version = createHash('sha256').update(html).update(assets.join('\n')).digest('hex').slice(0, 16)
const workerPath = 'dist/service-worker.js'
const worker = readFileSync(workerPath, 'utf8')
  .replace(/^const CACHE_VERSION = .*$/m, `const CACHE_VERSION = 'chunky-chinese-${version}'`)
  .replace('const BUILD_ASSETS = []', `const BUILD_ASSETS = ${JSON.stringify(assets.map((name) => `assets/${name}`))}`)
writeFileSync(workerPath, worker)
