import fs from 'node:fs'
import path from 'node:path'
import process from 'node:process'

const ROOT = process.cwd()
const WORLD_INDEX_PATHS = [
  'public/reader-packs/just-friends/visual-novels/worlds/index.json',
  'public/reader-packs/lms-books/visual-novels/worlds/index.json',
]

const REQUIRED_COMPOSITION_KEYS = ['xPercent', 'scale', 'zIndex']

function readJson(relativePath) {
  const directPath = path.join(ROOT, relativePath)
  const publicPath = path.join(ROOT, 'public', relativePath)
  const resolvedPath = fs.existsSync(directPath) ? directPath : publicPath
  return JSON.parse(fs.readFileSync(resolvedPath, 'utf8'))
}

function resolveExpression(manifest, character, expressionOrSpriteId) {
  if (!expressionOrSpriteId) return undefined
  const direct = manifest.sprites?.[expressionOrSpriteId]
  if (direct?.characterId === character.characterId) return expressionOrSpriteId
  for (const [id, sprite] of Object.entries(manifest.sprites ?? {})) {
    if (
      sprite.characterId === character.characterId &&
      sprite.personaId === character.personaId &&
      sprite.expressionId === expressionOrSpriteId
    ) {
      return id
    }
  }
  for (const [id, sprite] of Object.entries(manifest.sprites ?? {})) {
    if (sprite.characterId === character.characterId && sprite.expressionId === expressionOrSpriteId) return id
  }
  return undefined
}

function auditWorld(entry) {
  const world = readJson(entry.worldPath)
  const manifest = readJson(world.assetManifestPath)
  const result = {
    worldId: world.id,
    scripts: 0,
    nodes: 0,
    sceneNodes: 0,
    characters: 0,
    missingComposition: [],
    missingSprites: [],
    unsupportedExpressions: [],
    spritesWithoutMobileScale: [],
  }

  for (const [spriteId, sprite] of Object.entries(manifest.sprites ?? {})) {
    if (sprite.mobileScale === undefined) result.spritesWithoutMobileScale.push(spriteId)
  }

  for (const quest of Object.values(world.quests ?? {})) {
    const script = readJson(quest.scriptPath)
    let activeSceneCharacters = []
    result.scripts += 1
    for (const node of Object.values(script.nodes ?? {})) {
      result.nodes += 1
      const sceneCharacters = node.scene?.characters ?? []
      if (sceneCharacters.length > 0) activeSceneCharacters = sceneCharacters
      if (sceneCharacters.length > 0) result.sceneNodes += 1
      for (const character of sceneCharacters) {
        result.characters += 1
        if (!manifest.sprites?.[character.spriteId]) {
          result.missingSprites.push(`${script.id}:${node.id}:${character.characterId}:${character.spriteId}`)
        }
        const missingKeys = REQUIRED_COMPOSITION_KEYS.filter((key) => character[key] === undefined)
        if (missingKeys.length > 0) {
          result.missingComposition.push(`${script.id}:${node.id}:${character.characterId}:${missingKeys.join(',')}`)
        }
      }

      for (const command of node.animCommands ?? []) {
        const expression = command.value ?? command.expression
        if (!expression) continue
        const characterId = command.character ?? command.speaker ?? activeSceneCharacters[0]?.characterId
        const character =
          activeSceneCharacters.find((item) => item.characterId === characterId) ??
          activeSceneCharacters.find((item) => item.characterId === command.speaker)
        if (!character || !resolveExpression(manifest, character, expression)) {
          result.unsupportedExpressions.push(`${script.id}:${node.id}:${characterId ?? '(unknown)'}:${expression}`)
        }
      }
    }
  }

  return result
}

const worlds = WORLD_INDEX_PATHS.flatMap((indexPath) => {
  if (!fs.existsSync(path.join(ROOT, indexPath))) return []
  const index = readJson(indexPath)
  const entries = Array.isArray(index) ? index : index.worlds ?? []
  return entries
})

const results = worlds.map(auditWorld)
for (const result of results) {
  console.log(`\n${result.worldId}`)
  console.log(`  scripts: ${result.scripts}`)
  console.log(`  nodes: ${result.nodes}`)
  console.log(`  scene nodes: ${result.sceneNodes}`)
  console.log(`  scene characters: ${result.characters}`)
  console.log(`  missing composition: ${result.missingComposition.length}`)
  console.log(`  missing sprites: ${result.missingSprites.length}`)
  console.log(`  unsupported expressions: ${result.unsupportedExpressions.length}`)
  console.log(`  sprites without mobileScale: ${result.spritesWithoutMobileScale.length}`)
  for (const issue of [
    ...result.missingComposition,
    ...result.missingSprites,
    ...result.unsupportedExpressions,
  ]) {
    console.log(`    - ${issue}`)
  }
}

const fatalCount = results.reduce(
  (sum, result) => sum + result.missingComposition.length + result.missingSprites.length + result.unsupportedExpressions.length,
  0,
)

if (fatalCount > 0) {
  console.error(`\nVN scene audit failed with ${fatalCount} issue(s).`)
  process.exit(1)
}
