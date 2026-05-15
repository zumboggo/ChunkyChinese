import type { Sentence, VocabWord, WordStatus } from './types'

const validStatuses: WordStatus[] = ['new', 'learning', 'familiar', 'known', 'review']

export function parseCsv(text: string): Record<string, string>[] {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]

    if (char === '"' && inQuotes && next === '"') {
      field += '"'
      i += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') i += 1
      row.push(field)
      if (row.some((cell) => cell.trim() !== '')) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some((cell) => cell.trim() !== '')) rows.push(row)
  if (rows.length === 0) return []

  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).map((cells) => {
    const output: Record<string, string> = {}
    headers.forEach((header, index) => {
      output[header] = (cells[index] ?? '').trim()
    })
    return output
  })
}

export function toCsv(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Object.keys(rows[0])
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','))
  }
  return `${lines.join('\n')}\n`
}

export function normalizeFilename(value?: string): string {
  return (value ?? '')
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)
    .join('/')
    .toLocaleLowerCase()
}

export function basenameWithoutExt(value?: string): string {
  const normalized = normalizeFilename(value)
  const name = normalized.split('/').pop() ?? normalized
  return name.replace(/\.[^.]+$/, '')
}

export function parseList(value?: string): string[] {
  return (value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function vocabFromCsvRows(rows: Record<string, string>[]): VocabWord[] {
  const now = new Date().toISOString()
  return rows
    .map((row, index): VocabWord | null => {
      const word = readColumn(row, ['word', 'Hanzi', 'Front'])
      if (!word) return null

      const back = readColumn(row, ['Back'])
      const parsedBack = parseBack(back)
      const meaning = readColumn(row, ['meaning', 'English']) || parsedBack.meaning
      const pinyin = readColumn(row, ['pinyin', 'Pinyin']) || parsedBack.pinyin
      if (!meaning) return null

      const rawStatus = readColumn(row, ['status']) as WordStatus
      const status = validStatuses.includes(rawStatus) ? rawStatus : 'new'
      const tags = [
        ...parseList(readColumn(row, ['tags'])),
        ...parseList(readColumn(row, ['Bucket'])),
      ]
      const source = readColumn(row, ['source', 'Source'])
      if (source && !tags.includes(source)) tags.push(source)

      return {
        id: makeWordId(word),
        word,
        meaning,
        status,
        lessonNumber:
          parseNumber(readColumn(row, ['lessonNumber'])) ?? Math.ceil((index + 1) / 5),
        tags: unique(tags),
        partOfSpeech: readColumn(row, ['partOfSpeech']),
        audioWordFilename:
          readColumn(row, ['audioWordFilename']) || `words/${word}.mp3`,
        audioMeaningFilename:
          readColumn(row, ['audioMeaningFilename']) || `meanings/${meaning}.mp3`,
        pinyin,
        source,
        notes: readColumn(row, ['notes', 'Reason', 'Example']),
        mems: readColumn(row, ['mems', 'mnemonics', 'mnemonic', 'memory', 'Mems']),
        fsrsDueAt: readColumn(row, ['fsrsDueAt', 'dueAt']) || undefined,
        fsrsIntervalDays: parseNumber(readColumn(row, ['fsrsIntervalDays', 'intervalDays'])),
        fsrsEase: parseNumber(readColumn(row, ['fsrsEase', 'ease'])),
        fsrsRepetitions: parseNumber(readColumn(row, ['fsrsRepetitions', 'repetitions'])),
        fsrsLapses: parseNumber(readColumn(row, ['fsrsLapses', 'lapses'])),
        createdAt: now,
        updatedAt: now,
        lastReviewedAt: readColumn(row, ['lastReviewedAt']) || undefined,
        seenCount: parseNumber(readColumn(row, ['seenCount'])) ?? 0,
        correctCount: parseNumber(readColumn(row, ['correctCount'])) ?? 0,
        wrongCount: parseNumber(readColumn(row, ['wrongCount'])) ?? 0,
        listenedSeconds: parseNumber(readColumn(row, ['listenedSeconds'])) ?? 0,
      } satisfies VocabWord
    })
    .filter((word): word is VocabWord => Boolean(word))
}

export function sentencesFromCsvRows(rows: Record<string, string>[]): Sentence[] {
  const now = new Date().toISOString()
  return rows
    .map((row): Sentence | null => {
      const chinese = readColumn(row, ['chinese'])
      const english = readColumn(row, ['english'])
      if (!chinese || !english) return null

      return {
        id: makeSentenceId(chinese, english),
        chinese,
        english,
        targetWords: parseList(readColumn(row, ['targetWords'])),
        difficulty: parseNumber(readColumn(row, ['difficulty'])),
        audioSentenceFilename: readColumn(row, ['audioSentenceFilename']),
        audioEnglishFilename: readColumn(row, [
          'audioEnglishFilename',
          'audioSentenceMeaningFilename',
        ]),
        tags: parseList(readColumn(row, ['tags'])),
        createdAt: now,
        updatedAt: now,
      } satisfies Sentence
    })
    .filter((sentence): sentence is Sentence => Boolean(sentence))
}

export function makeWordId(word: string): string {
  return `word:${word.trim()}`
}

export function makeSentenceId(chinese: string, english: string): string {
  return `sentence:${stableHash(`${chinese.trim()}|${english.trim()}`)}`
}

export function stableHash(value: string): string {
  let hash = 5381
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash * 33) ^ value.charCodeAt(i)
  }
  return (hash >>> 0).toString(36)
}

function readColumn(row: Record<string, string>, names: string[]): string {
  const lowerMap = new Map(
    Object.entries(row).map(([key, value]) => [key.toLocaleLowerCase(), value]),
  )
  for (const name of names) {
    const value = row[name] ?? lowerMap.get(name.toLocaleLowerCase())
    if (value?.trim()) return value.trim()
  }
  return ''
}

function parseBack(back: string): { pinyin?: string; meaning?: string } {
  if (!back) return {}
  const [pinyin, ...meaningParts] = back.split(' - ')
  if (meaningParts.length === 0) return { meaning: back.trim() }
  return { pinyin: pinyin.trim(), meaning: meaningParts.join(' - ').trim() }
}

function parseNumber(value: string): number | undefined {
  const number = Number(value)
  return Number.isFinite(number) ? number : undefined
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)))
}

function escapeCsv(value: unknown): string {
  const text = Array.isArray(value) ? value.join(';') : String(value ?? '')
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}
