// Generate public, original lesson recordings. Credentials and intermediate clips stay private.
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { compilePilotLesson, measurePilot } from '../src/listeningPilot.ts'

const model = 'minimax/speech-02-hd'
const token = (process.env.REPLICATE_API_TOKEN || await fs.readFile(path.join(os.homedir(), '.claude/replicate-token'), 'utf8')).trim()
const ffmpeg = process.env.FFMPEG_PATH
if (!ffmpeg) throw new Error('Set FFMPEG_PATH to a local FFmpeg executable.')
const cache = path.resolve(process.env.LISTENING_AUDIO_CACHE || '../.local/replicate-listening')
const output = path.resolve('public/listening')
await fs.mkdir(cache, { recursive: true }); await fs.mkdir(output, { recursive: true })
const lessons = JSON.parse(await fs.readFile('src/content/listening-pilot.json', 'utf8'))
const voices = { narrator: 'English_Wiselady', a: 'Chinese (Mandarin)_IntellectualGirl', b: 'Chinese (Mandarin)_Gentleman' }
const jobs = new Map()
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20)
for (const lesson of lessons) {
  lesson.steps = compilePilotLesson(lesson)
  for (const step of lesson.steps.filter(s => s.kind === 'speech')) {
    const input = { text: step.text, voice_id: voices[step.language === 'en' ? 'narrator' : step.speaker], language_boost: step.language === 'en' ? 'English' : 'Chinese', speed: step.language === 'en' ? 1 : 0.95, audio_format: 'mp3', sample_rate: 32000, bitrate: 128000, channel: 'mono' }
    step.clipKey = hash({ model, input })
    jobs.set(step.clipKey, input)
  }
}
console.log(`${lessons.length} lessons; ${jobs.size} distinct voice clips (existing clips reused).`)
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))
async function api(url, options = {}) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(url, { ...options, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', ...options.headers }, signal: AbortSignal.timeout(120000) })
    if (response.status === 429) { await sleep(12000 * (attempt + 1)); continue }
    if (!response.ok) throw new Error(`Replicate HTTP ${response.status}: ${(await response.text()).slice(0, 200)}`)
    return response.json()
  }
  throw new Error('Replicate rate limit persisted; rerun to resume cached work.')
}
let finished = 0
async function generate(key, input) {
  const file = path.join(cache, `${key}.mp3`)
  try { if ((await fs.stat(file)).size > 100) { finished++; return } } catch { /* New clip. */ }
  const pending = path.join(cache, `${key}.prediction.json`)
  let prediction
  try { prediction = JSON.parse(await fs.readFile(pending, 'utf8')) } catch { /* Not yet submitted. */ }
  if (!prediction) {
    prediction = await api(`https://api.replicate.com/v1/models/${model}/predictions`, { method: 'POST', headers: { Prefer: 'wait=60' }, body: JSON.stringify({ input }) })
    await fs.writeFile(pending, JSON.stringify(prediction))
  }
  while (!['succeeded', 'failed', 'canceled'].includes(prediction.status)) {
    await sleep(1000)
    prediction = await api(prediction.urls.get)
    await fs.writeFile(pending, JSON.stringify(prediction))
  }
  if (prediction.status !== 'succeeded') throw new Error(`Speech generation ${prediction.status}: ${prediction.error || key}`)
  if (typeof prediction.output !== 'string') throw new Error('Unexpected audio output')
  const response = await fetch(prediction.output, { signal: AbortSignal.timeout(60000) })
  if (!response.ok) throw new Error(`Audio download HTTP ${response.status}`)
  const bytes = Buffer.from(await response.arrayBuffer())
  if (bytes.length < 100) throw new Error('Empty generated audio')
  await fs.writeFile(file, bytes)
  finished++
  if (finished % 10 === 0 || finished === jobs.size) console.log(`${finished}/${jobs.size} clips ready`)
}
const queue = [...jobs.entries()]
await Promise.all(Array.from({ length: 2 }, async () => { while (queue.length) { const job = queue.shift(); if (job) await generate(...job) } }))
const pcm = new Map()
for (const key of jobs.keys()) {
  const bytes = execFileSync(ffmpeg, ['-v', 'error', '-i', path.join(cache, `${key}.mp3`), '-f', 's16le', '-ac', '1', '-ar', '32000', 'pipe:1'], { maxBuffer: 32 * 1024 * 1024 })
  if (bytes.length < 640) throw new Error(`Empty decoded clip ${key}`)
  pcm.set(key, bytes)
}
const manifest = { version: 1, provider: 'Replicate', model, voices, lessons: [] }
for (const lesson of lessons) {
  let seconds = 0
  const buffers = [], segments = [], durations = {}
  for (const step of lesson.steps) {
    const bytes = step.kind === 'pause' ? Buffer.alloc(Math.round(step.seconds * 32000) * 2) : pcm.get(step.clipKey)
    const duration = bytes.length / 64000
    if (step.kind === 'speech') durations[step.id] = duration
    segments.push({ id: step.id, kind: step.kind, phase: step.phase, text: step.text, language: step.language, speaker: step.speaker, startSeconds: seconds, durationSeconds: duration })
    buffers.push(bytes); seconds += duration
  }
  const timing = measurePilot(lesson.steps, durations)
  console.log(`${lesson.id}: ${seconds.toFixed(1)}s ${timing.withinTarget ? 'PASS' : 'NEEDS TIMING ADJUSTMENT'}`)
  const file = `${lesson.id}-${hash(segments).slice(0, 8)}.mp3`
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-f', 's16le', '-ar', '32000', '-ac', '1', '-i', 'pipe:0', '-c:a', 'libmp3lame', '-b:a', '128k', path.join(output, file)], { input: Buffer.concat(buffers), maxBuffer: 32 * 1024 * 1024 })
  manifest.lessons.push({ id: lesson.id, title: lesson.title, file, seconds, withinTarget: timing.withinTarget, segments })
}
// Preserve separately imported recordings when rebuilding the original pilot.
let existing = { lessons: [] }
try { existing = JSON.parse(await fs.readFile(path.join(output, 'course-v1.json'), 'utf8')) } catch { /* First generation. */ }
const generatedIds = new Set(manifest.lessons.map(lesson => lesson.id))
manifest.lessons.push(...existing.lessons.filter(lesson => !generatedIds.has(lesson.id)))
await fs.writeFile(path.join(output, 'course-v1.json'), JSON.stringify(manifest, null, 2) + '\n')
if (manifest.lessons.some(l => generatedIds.has(l.id) && !l.withinTarget)) throw new Error('Adjust lesson timing before publishing. Generated clips are cached; reruns do not regenerate them.')
