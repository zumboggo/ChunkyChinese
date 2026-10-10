import { tokenizeReaderText, readerComprehensionCategory } from '../adaptiveText'
import type { VocabWord } from '../types'

export interface Line { zh: string; english: string; pinyin?: string; audio?: string }
export interface Answer { chunks: string[]; english: string; alternatives?: number[][]; pinyin?: string[]; audio?: string }
export interface Choice { id: string; label: string; simple: Answer; rich: Answer; hint: string; response: string; flag?: string }
export interface Scene { id: string; title: string; speaker: string; paragraphs: string[]; line: Line; choices: Choice[]; aside: { question: string; answer: string }; callback?: { flag: string; text: string } }
export interface Episode { id: string; version: number; title: string; subtitle: string; place: string; newWords: string[]; ending: string; scenes: Scene[]; resources?: string[]; bytes?: number }
export interface Coverage { percent: number; answerPercent: number; unknown: string[]; variant: 'simple' | 'rich'; supported: boolean }
export interface Result { choiceId: string; independent: boolean; errors: number }
export interface Attempt {
  episodeId: string; version: number; attemptId: string; revision: number; variant: 'simple' | 'rich'; coverage: Coverage;
  step: number; choiceId: string | null; tiles: number[]; errors: number; hinted: boolean; model: boolean; solved: boolean;
  paragraph: number; meaning: boolean; pinyin: boolean; aside: boolean; feedback: string; results: Result[]; callbacks: string[]
}
export type Action = { type: string; index?: number; choiceId?: string }

export function measureCoverage(ep: Episode, words: VocabWord[], variant: 'simple' | 'rich'): Coverage {
  const texts = ep.scenes.map(s => s.line.zh)
  const answers = ep.scenes.flatMap(s => s.choices.map(c => c[variant].chunks.join('')))
  const inspect = (lines: string[]) => lines.flatMap(t => tokenizeReaderText(t, words).filter(t => t.isChinese))
  const tokens = inspect([...texts, ...answers]), answerTokens = inspect(answers)
  const known = (ts: typeof tokens) => ts.filter(t => readerComprehensionCategory(t.word) === 'known').length
  const percent = tokens.length ? Math.floor(100 * known(tokens) / tokens.length) : 0
  const answerPercent = answerTokens.length ? Math.floor(100 * known(answerTokens) / answerTokens.length) : 0
  const unknown = [...new Set(tokens.filter(t => readerComprehensionCategory(t.word) !== 'known').map(t => t.text))]
  return { percent, answerPercent, unknown, variant, supported: percent < 95 || answerPercent < 95 }
}
export function selectCoverage(ep: Episode, words: VocabWord[]): Coverage {
  const rich = measureCoverage(ep, words, 'rich')
  return rich.supported ? measureCoverage(ep, words, 'simple') : rich
}
export function freshAttempt(ep: Episode, coverage: Coverage, callbacks: string[] = []): Attempt {
  return { episodeId: ep.id, version: ep.version, attemptId: crypto.randomUUID(), revision: 0, variant: coverage.variant, coverage,
    step: 0, choiceId: null, tiles: [], errors: 0, hinted: false, model: false, solved: false, paragraph: 0,
    meaning: false, pinyin: true, aside: false, feedback: '', results: [], callbacks }
}
export function selectedChoice(ep: Episode, a: Attempt) { return ep.scenes[a.step]?.choices.find(c => c.id === a.choiceId) }
export function accepts(answer: Answer, tiles: number[]): boolean {
  const sequences = [answer.chunks.map((_, i) => i), ...(answer.alternatives ?? [])]
  // Compare text as well as occurrence IDs: identical chunks are interchangeable.
  return tiles.length === answer.chunks.length && new Set(tiles).size === tiles.length && tiles.every(i => Number.isInteger(i) && i >= 0 && i < answer.chunks.length) &&
    sequences.some(seq => seq.every((i, n) => answer.chunks[i] === answer.chunks[tiles[n]]))
}
export function transition(ep: Episode, previous: Attempt, action: Action): Attempt {
  if (!action || typeof action.type !== 'string') return previous
  const a: Attempt = structuredClone(previous)
  const scene = ep.scenes[a.step], choice = selectedChoice(ep, a), answer = choice?.[a.variant]
  if (!scene) return previous
  switch (action.type) {
    case 'pinyin': a.pinyin = !a.pinyin; break
    case 'meaning': a.meaning = !a.meaning; break
    case 'aside': a.aside = !a.aside; break
    case 'reveal': a.paragraph = Math.min(scene.paragraphs.length, a.paragraph + 1); break
    case 'showAll': a.paragraph = scene.paragraphs.length; break
    case 'choose':
      if (a.choiceId || a.paragraph < scene.paragraphs.length || !scene.choices.some(c => c.id === action.choiceId)) return previous
      a.choiceId = action.choiceId!; break
    case 'tile':
      if (!answer || a.solved || !Number.isInteger(action.index) || action.index! < 0 || action.index! >= answer.chunks.length || a.tiles.includes(action.index!)) return previous
      a.tiles.push(action.index!); a.feedback = ''; break
    case 'remove':
      if (a.solved || !Number.isInteger(action.index) || action.index! < 0 || action.index! >= a.tiles.length) return previous
      a.tiles.splice(action.index!, 1); a.feedback = ''; break
    case 'undo': if (a.solved) return previous; a.tiles.pop(); a.feedback = ''; break
    case 'clear': if (a.solved) return previous; a.tiles = []; a.feedback = ''; break
    case 'hint': if (!choice || a.solved) return previous; a.hinted = true; a.feedback = choice.hint; break
    case 'model':
      if (!answer || a.solved || a.errors < 2) return previous
      a.model = true; a.hinted = true; a.tiles = answer.chunks.map((_, i) => i); a.feedback = 'Read the worked answer, then Check to use it.'; break
    case 'check':
      if (!answer || a.solved) return previous
      if (a.tiles.length !== answer.chunks.length) { a.feedback = 'Use all the chunks before checking.'; break }
      if (accepts(answer, a.tiles)) { a.solved = true; a.feedback = 'That works. Here is what happens next.' }
      else { a.errors += 1; a.feedback = choice!.hint }
      break
    case 'next':
      if (!a.solved || !choice) return previous
      a.results.push({ choiceId: choice.id, independent: !a.hinted && a.errors === 0, errors: a.errors })
      a.step += 1; a.choiceId = null; a.tiles = []; a.errors = 0; a.hinted = false; a.model = false; a.solved = false
      a.paragraph = 0; a.meaning = false; a.aside = false; a.feedback = ''; break
    default: return previous
  }
  a.revision += 1
  return a
}
export function flags(ep: Episode, a?: Attempt): string[] {
  return a?.results.flatMap((r, i) => ep.scenes[i]?.choices.find(c => c.id === r.choiceId)?.flag ?? []) ?? []
}
export function storageKey(identity: string, ep: Episode): string {
  return `chunky-game:v1:${encodeURIComponent(identity)}:${ep.id}:${ep.version}`
}
export function validAttempt(ep: Episode, value: unknown): value is Attempt {
  if (!value || typeof value !== 'object') return false
  const a = value as Attempt
  if (a.episodeId !== ep.id || a.version !== ep.version || !['simple', 'rich'].includes(a.variant) || typeof a.attemptId !== 'string' ||
    !Number.isInteger(a.revision) || a.revision < 0 || !Number.isInteger(a.step) || a.step < 0 || a.step > ep.scenes.length ||
    !Array.isArray(a.results) || a.results.length !== a.step || !Array.isArray(a.tiles) || !Array.isArray(a.callbacks) || !a.callbacks.every(f => typeof f === 'string') ||
    !Number.isInteger(a.errors) || a.errors < 0 || typeof a.feedback !== 'string' || !a.coverage || a.coverage.variant !== a.variant ||
    !Array.isArray(a.coverage.unknown) || !a.coverage.unknown.every(w => typeof w === 'string') ||
    ![a.coverage.percent,a.coverage.answerPercent].every(n => Number.isFinite(n) && n >= 0 && n <= 100) || typeof a.coverage.supported !== 'boolean' ||
    ![a.hinted,a.model,a.solved,a.meaning,a.pinyin,a.aside].every(b => typeof b === 'boolean') || !Number.isInteger(a.paragraph) || a.paragraph < 0) return false
  if (!a.results.every((r, i) => r && ep.scenes[i].choices.some(c => c.id === r.choiceId) && typeof r.independent === 'boolean' && Number.isInteger(r.errors) && r.errors >= 0)) return false
  const scene = ep.scenes[a.step]
  if (!scene) return a.choiceId === null && a.tiles.length === 0 && !a.solved
  if (a.paragraph > scene.paragraphs.length) return false
  const c = selectedChoice(ep, a)
  if (a.choiceId !== null && !c) return false
  if (!c) return a.tiles.length === 0 && !a.solved
  const answer = c[a.variant]
  if (a.tiles.some(i => !Number.isInteger(i) || i < 0 || i >= answer.chunks.length) || new Set(a.tiles).size !== a.tiles.length) return false
  return !a.solved || accepts(answer, a.tiles)
}
export function validMessage(event: MessageEvent, source: Window | null, origin: string, channel: string): boolean {
  return event.source === source && event.origin === origin && event.data?.protocol === 'chunky-game-v1' && event.data?.channel === channel
}
