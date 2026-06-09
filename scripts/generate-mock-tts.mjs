import fs from 'fs'
import path from 'path'

const SENTENCES_FILE = path.join('public', 'seed', 'lms-sentences.json')
const OUTPUT_DIR = path.join('public', 'audio', 'sentences')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const sentences = JSON.parse(fs.readFileSync(SENTENCES_FILE, 'utf-8'))

// Create a dummy mp3 buffer (just a few bytes)
// Normally this would be a real mp3 file, but this is a mock.
// To make it a valid mp3, we can use an empty mp3 frame.
const dummyMp3 = Buffer.from([0xFF, 0xFB, 0x90, 0x44, 0x00, 0x00, 0x00, 0x00, 0x00])

async function run() {
  const maxClips = 100
  console.log(`Generating up to ${maxClips} clips (MOCK)...`)
  
  const limit = Math.min(sentences.length, maxClips)
  for (let i = 0; i < limit; i++) {
    const sentence = sentences[i]
    const safeWord = encodeURIComponent(sentence.word)
    const outputFile = path.join(OUTPUT_DIR, `${safeWord}.mp3`)

    fs.writeFileSync(outputFile, dummyMp3)
    console.log(`[${i + 1}] Synthesized: ${sentence.word} -> ${sentence.chinese}`)
  }
  
  console.log(`Done generating ${limit} clips.`)
}

run()
