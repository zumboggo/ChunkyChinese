// Node 24 can load this pure TypeScript compiler without a second build system.
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { compilePilotLesson, undeclaredCharacters } from '../src/listeningPilot.ts'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const destination = process.argv[2]
if (!destination) throw new Error('Provide a private output directory outside public/.')
const output = path.resolve(destination)
const relative = path.relative(path.join(root, 'public'), output)
if (!relative.startsWith('..') && !path.isAbsolute(relative)) throw new Error('Do not write pilot recordings into public/.')
const lessons = JSON.parse(await fs.readFile(path.join(root, 'src/content/listening-pilot.json'), 'utf8'))
await fs.mkdir(output, { recursive: true })
for (const lesson of lessons) {
  const unknown = undeclaredCharacters(lesson)
  if (unknown.length) throw new Error(`${lesson.id}: undeclared Chinese: ${unknown.join(', ')}`)
  await fs.writeFile(path.join(output, `${lesson.id}.json`), JSON.stringify({ ...lesson, steps: compilePilotLesson(lesson) }, null, 2))
}
console.log(`Prepared ${lessons.length} lesson timelines in ${output}`)
