import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { writeRenpyPrototype } from './converter.mjs'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')

const result = writeRenpyPrototype({
  rootDir: ROOT,
  worldPath: 'reader-packs/just-friends/visual-novels/worlds/just-friends/world.json',
  outDir: 'renpy/just-friends',
  storyId: 'just-friends-story',
})

console.log(`Generated RenPy prototype at ${path.relative(ROOT, result.projectDir)}`)
console.log(`Quest script: ${result.scriptPath}`)
console.log(`Nodes: ${result.nodeCount}`)
console.log(`Assets copied: ${result.assetCount}`)
