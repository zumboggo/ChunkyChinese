import fs from 'fs'
import path from 'path'
import dotenv from 'dotenv'

// Load environment variables
dotenv.config()

const AZURE_SPEECH_KEY = process.env.AZURE_SPEECH_KEY
const AZURE_SPEECH_REGION = process.env.AZURE_SPEECH_REGION

if (!AZURE_SPEECH_KEY || !AZURE_SPEECH_REGION) {
  console.error('Missing AZURE_SPEECH_KEY or AZURE_SPEECH_REGION in .env')
  process.exit(1)
}

const SENTENCES_FILE = path.join('public', 'seed', 'lms-sentences.json')
const OUTPUT_DIR = path.join('public', 'audio', 'sentences')

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true })
}

const sentences = JSON.parse(fs.readFileSync(SENTENCES_FILE, 'utf-8'))

async function synthesizeSentence(sentence, index) {
  const safeWord = encodeURIComponent(sentence.word)
  const outputFile = path.join(OUTPUT_DIR, `${safeWord}.mp3`)

  if (fs.existsSync(outputFile)) {
    console.log(`[${index + 1}] Skipping ${sentence.word} (already exists)`)
    return
  }

  const url = `https://${AZURE_SPEECH_REGION}.tts.speech.microsoft.com/cognitiveservices/v1`
  const text = sentence.chinese

  const ssml = `<speak version='1.0' xml:lang='zh-CN'><voice xml:lang='zh-CN' xml:gender='Female' name='zh-CN-XiaoxiaoNeural'>${text}</voice></speak>`

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Ocp-Apim-Subscription-Key': AZURE_SPEECH_KEY,
      'Content-Type': 'application/ssml+xml',
      'X-Microsoft-OutputFormat': 'audio-16khz-32kbitrate-mono-mp3',
      'User-Agent': 'ChunkyChineseVocab'
    },
    body: ssml
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`HTTP ${response.status}: ${errorText}`)
  }

  const arrayBuffer = await response.arrayBuffer()
  fs.writeFileSync(outputFile, Buffer.from(arrayBuffer))
  console.log(`[${index + 1}] Synthesized: ${sentence.word} -> ${text}`)
}

async function run() {
  const maxClips = 100
  console.log(`Generating up to ${maxClips} clips via REST API...`)
  
  const limit = Math.min(sentences.length, maxClips)
  for (let i = 0; i < limit; i++) {
    const sentence = sentences[i]
    try {
      await synthesizeSentence(sentence, i)
    } catch (e) {
      console.error(`Failed at index ${i}:`, e.message)
      process.exit(1)
    }
    // Small delay to prevent rate limits
    await new Promise(r => setTimeout(r, 100))
  }
  
  console.log(`Done generating ${limit} clips.`)
}

run()
