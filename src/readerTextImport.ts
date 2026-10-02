import type { GeneratedStoryPayload } from './generatedStories'

export function titleFromTextFilename(filename: string): string {
  return filename.replace(/\.txt$/i, '').trim() || 'Imported Story'
}

export function parseBilingualReaderText(text: string, filename = 'Imported Story.txt'): GeneratedStoryPayload {
  const lines = text
    .replace(/^\uFEFF/, '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) throw new Error('The text file needs at least one Chinese line followed by its English line.')
  if (lines.length % 2 !== 0) {
    throw new Error(`Line ${lines.length} has no matching English translation. Use alternating Chinese and English lines.`)
  }

  const sentences = []
  for (let index = 0; index < lines.length; index += 2) {
    sentences.push({ chinese: lines[index], english: lines[index + 1] })
  }

  const title = titleFromTextFilename(filename)
  return {
    title,
    prompt: `Imported from ${filename}`,
    sentences,
    unavoidableNewWords: [],
  }
}
