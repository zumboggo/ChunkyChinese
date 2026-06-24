import { existsSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const WEB_DIR = path.join(ROOT, 'public', 'renpy', 'just-friends')

const errors = []

if (!existsSync(WEB_DIR)) {
  errors.push('missing public/renpy/just-friends')
} else {
  requireFile('index.html')
  requireAny(['game.zip', 'game.data'])
  requireRecursiveExtension('.wasm')
}

if (errors.length > 0) {
  for (const error of errors) console.error(`ERROR ${error}`)
  console.error('')
  console.error('Build the RenPy web export for renpy/just-friends, then copy the generated web files into public/renpy/just-friends.')
  process.exitCode = 1
} else {
  console.log('RenPy web export checks passed.')
}

function requireFile(relativePath) {
  if (!existsSync(path.join(WEB_DIR, relativePath))) errors.push(`missing ${relativePath}`)
}

function requireAny(relativePaths) {
  if (!relativePaths.some((relativePath) => existsSync(path.join(WEB_DIR, relativePath)))) {
    errors.push(`missing one of: ${relativePaths.join(', ')}`)
  }
}

function requireRecursiveExtension(extension) {
  if (!findRecursive(WEB_DIR, (filePath) => path.extname(filePath).toLowerCase() === extension)) {
    errors.push(`missing ${extension} runtime file`)
  }
}

function findRecursive(dir, predicate) {
  if (!existsSync(dir)) return false
  for (const entry of readdirSync(dir)) {
    const filePath = path.join(dir, entry)
    const stats = statSync(filePath)
    if (stats.isDirectory()) {
      if (findRecursive(filePath, predicate)) return true
    } else if (predicate(filePath)) {
      return true
    }
  }
  return false
}
