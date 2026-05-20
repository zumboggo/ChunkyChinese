import {
  copyFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const LMS_ROOT = path.join(process.env.USERPROFILE ?? '', 'Documents', 'LearnChinese', 'LMS')
const GLOSSIKA_ROOT = path.join(LMS_ROOT, 'Glossika')
const SOURCE_CSV = path.join(GLOSSIKA_ROOT, 'input', 'Future_Known_1000.csv')
const ENRICHED_CSV = path.join(GLOSSIKA_ROOT, 'input', 'Future_Known_1000_enriched.csv')
const OLD_PUBLIC_PACK = path.join(ROOT, 'public', 'clip-packs', 'lms-188-azure')
const OLD_GLOSSIKA_PACK = path.join(GLOSSIKA_ROOT, 'clip_packs', 'chunky_lms_188_azure')
const NEW_PACK_ID = 'lms-1000-azure'
const NEW_PACK_NAME = 'LMS 1000'
const NEW_PUBLIC_PACK = path.join(ROOT, 'public', 'clip-packs', NEW_PACK_ID)
const SEED_CSV = path.join(ROOT, 'public', 'seed', 'lms-vocab-1000.csv')

const BASE_VOCAB_FIELDS = [
  'word',
  'meaning',
  'status',
  'lessonNumber',
  'tags',
  'partOfSpeech',
  'audioWordFilename',
  'audioMeaningFilename',
  'pinyin',
  'source',
  'notes',
  'seenCount',
  'correctCount',
  'wrongCount',
  'listenedSeconds',
  'lastReviewedAt',
]

const VALID_STATUSES = new Set(['new', 'learning', 'familiar', 'known', 'review'])

const ENGLISH_OVERRIDES = {
  一次: 'one time; once',
  上天: 'heaven; the sky',
  上山: 'to go up the mountain',
  上课: 'to attend class',
  不想: 'to not want to',
  丑: 'ugly',
  到家: 'to arrive home',
  友好: 'friendly',
  喊叫: 'to shout; to yell',
  四周: 'all around; surroundings',
  大地: 'the earth; the land',
  大海: 'the sea; ocean',
  大风: 'strong wind',
  天上: 'in the sky; heaven',
  天地: 'heaven and earth; the world',
  宫殿: 'palace',
  山顶: 'mountaintop; summit',
  张开: 'to open; to spread out',
  拍手: 'to clap hands',
  拿起: 'to pick up',
  智慧: 'wisdom',
  月亮: 'moon',
  有力: 'powerful; strong',
  果: 'fruit; result',
  森林: 'forest',
  极大: 'extremely large; enormous',
  河流: 'river',
  洗澡: 'to bathe; to take a shower',
  洲: 'continent',
  海边: 'seaside; by the sea',
  火焰: 'flame',
  无法无天: 'lawless; unruly',
  猴: 'monkey',
  瓶子: 'bottle',
  白天: 'daytime',
  盆: 'basin; pot',
  看起来: 'to look; to seem',
  等到: 'to wait until',
  圣人: 'sage; saint',
  走出: 'to walk out of',
  走向: 'to walk toward',
  避: 'to avoid; to evade',
  钓鱼: 'to fish',
  长生: 'long life; immortality',
  云: 'cloud',
  雷电: 'thunder and lightning',
  飞过: 'to fly over; to fly past',
  有一天: 'one day',
  亲爱的: 'dear; beloved',
  住在: 'to live in; to live at',
  一开始: 'at the beginning; from the start',
  流向: 'to flow toward',
  的时侯: 'when; at the time of',
  等着: 'to be waiting',
  海中: 'in the sea',
  看着: 'to look at; watching',
  哭着: 'crying; while crying',
  学着: 'learning; trying to learn',
  笑着: 'smiling; while laughing',
  弯刀: 'curved blade; scimitar',
  说过: 'have said; said before',
  一点儿: 'a little bit',
  后门: 'back door',
  有名: 'famous; well-known',
  杯子: 'cup; glass',
  水果: 'fruit',
  游泳: 'to swim',
  草: 'grass; Weed',
  中文: 'Chinese language',
  父: 'father',
  不是: 'is not; no',
  在一起: 'together',
  一个人: 'one person; alone',
  西门: 'west gate',
  那时候: 'at that time',
  十二: 'twelve',
  第二天: 'the next day',
  一定要: 'must; be sure to',
  过节: 'to celebrate a festival',
  那是: 'that is',
  看错: 'to misread; to see incorrectly',
  走过: 'to walk past; to pass through',
  这不: 'is this not; this is not',
  在世: 'alive; living',
  大会: 'conference; general assembly',
  到现在: 'until now',
  父爱: 'fatherly love',
  不只: 'not only',
  人中: 'among people',
  对不对: 'right?; is that correct?',
  去死: 'go die; die',
  穿上: 'to put on',
  三次: 'three times',
  小羊: 'lamb; little sheep',
  大节: 'major festival; important principle',
  院子: 'courtyard; yard',
  是不是: 'is it or not; whether',
  什么时候: 'when',
  色: 'color; appearance',
  山上: 'on the mountain',
  流出: 'to flow out',
  第二次: 'second time',
  想见: 'to want to see',
  驴: 'donkey',
  十五: 'fifteen',
  十七: 'seventeen',
  十九: 'nineteen',
  石: 'stone; rock',
  在后: 'behind; afterward',
  不太好: 'not very good',
  买卖: 'buying and selling; business',
  再生: 'rebirth; to regenerate',
  买东西: 'to buy things; to go shopping',
  工钱: 'wages; pay',
  人马: 'team; troops',
  这位: 'this person; this one',
  不了: 'unable to; cannot',
  医: 'medicine; medical',
  不可以: 'cannot; not allowed',
  真神: 'true god',
  一说: 'once said; as soon as it is said',
  拔: 'to pull out; to extract',
  门外: 'outside the door',
  要不是: 'if it were not for',
  离岸: 'offshore; away from shore',
  常常: 'often',
  不会: 'will not; cannot',
  收: 'to receive; to collect; to put away',
  木头: 'wood; log',
  生病: 'to get sick',
  老人: 'old person; elder',
  教官: 'instructor',
  便宜: 'cheap; inexpensive',
  一块: 'one piece; together',
  一眼: 'one glance',
  一种: 'one kind; a kind of',
  人会: 'people can; people will',
  几个: 'several; a few',
  北京: 'Beijing',
  吟游: 'bard; minstrel',
  外语: 'foreign language',
  大声: 'loud; loudly',
  尼哥: 'Nige; a name',
  底母: 'Dimu; a name',
  慢慢地: 'slowly',
  打篮球: 'to play basketball',
  真对不起: 'really sorry',
  第一课: 'first lesson',
  诗人: 'poet',
  这家: 'this shop; this family',
  这时候: 'at this time',
}

const command = process.argv[2] ?? 'prepare'

if (command === 'prepare') {
  prepareTargets()
} else if (command === 'reuse-audio') {
  reuseAudio()
} else if (command === 'finalize') {
  finalizePack()
} else if (command === 'verify') {
  verifyPack()
} else if (command === 'synthesize-missing') {
  await synthesizeMissing()
} else {
  throw new Error(`Unknown command: ${command}`)
}

function prepareTargets() {
  const rows = parseCsv(readText(SOURCE_CSV))
  const enriched = rows.map((row) => {
    const hanzi = cell(row, 'hanzi')
    const english = decodeEntities(cell(row, 'english') || ENGLISH_OVERRIDES[hanzi] || '')
    const pinyinValue = cell(row, 'pinyin') || pinyinFor(hanzi)
    return {
      Hanzi: hanzi,
      Pinyin: pinyinValue,
      English: english,
      Bucket: cell(row, 'bucket'),
      Reason: cell(row, 'reason'),
      Example: cell(row, 'reason'),
      Source: 'Future_Known_1000.csv',
      Status: cell(row, 'status'),
    }
  })

  const missing = enriched.filter((row) => !row.Hanzi || !row.English || !row.Pinyin)
  const duplicateCount = enriched.length - new Set(enriched.map((row) => row.Hanzi)).size
  if (enriched.length !== 1000 || duplicateCount > 0 || missing.length > 0) {
    console.error(JSON.stringify({ rows: enriched.length, duplicateCount, missing: missing.slice(0, 20) }, null, 2))
    throw new Error('Enriched target validation failed.')
  }

  writeText(ENRICHED_CSV, toCsv(enriched, Object.keys(enriched[0]), true))
  console.log(`Wrote ${ENRICHED_CSV}`)
  console.log(`Rows: ${enriched.length}`)
  console.log(`Filled missing English entries: ${Object.keys(ENGLISH_OVERRIDES).length}`)
}

function reuseAudio() {
  const newManifest = readJson(path.join(NEW_PUBLIC_PACK, 'clips_manifest.json'))
  const sourceEntries = [
    ...audioEntriesFromPack(OLD_PUBLIC_PACK),
    ...audioEntriesFromPack(OLD_GLOSSIKA_PACK),
  ]
  const sourceByKey = new Map()
  for (const entry of sourceEntries) {
    if (!sourceByKey.has(entry.key)) sourceByKey.set(entry.key, entry.fullPath)
  }

  let reused = 0
  let alreadyPresent = 0
  let unavailable = 0
  for (const clip of newManifest.clips ?? []) {
    const destination = path.join(NEW_PUBLIC_PACK, clip.path)
    if (existsSync(destination) && statSync(destination).size > 0) {
      alreadyPresent += 1
      continue
    }
    const source = sourceByKey.get(clipKey(clip))
    if (!source) {
      unavailable += 1
      continue
    }
    mkdirSync(path.dirname(destination), { recursive: true })
    copyFileSync(source, destination)
    reused += 1
  }

  console.log(`Already present: ${alreadyPresent}`)
  console.log(`Reused from old packs: ${reused}`)
  console.log(`Still missing: ${unavailable}`)
}

function finalizePack() {
  const manifestPath = path.join(NEW_PUBLIC_PACK, 'clips_manifest.json')
  const manifest = readJson(manifestPath)
  manifest.packName = NEW_PACK_NAME
  writeJson(manifestPath, manifest)

  const sourceRows = parseCsv(readText(SOURCE_CSV))
  const enrichedRows = parseCsv(readText(ENRICHED_CSV))
  const oldRows = existsSync(path.join(OLD_PUBLIC_PACK, 'vocab.csv'))
    ? parseCsv(readText(path.join(OLD_PUBLIC_PACK, 'vocab.csv')))
    : []
  const sourceByWord = new Map(sourceRows.map((row) => [cell(row, 'hanzi'), row]))
  const enrichedByWord = new Map(enrichedRows.map((row) => [cell(row, 'Hanzi'), row]))
  const oldByWord = new Map(oldRows.map((row) => [cell(row, 'word'), row]))

  const vocabPath = path.join(NEW_PUBLIC_PACK, 'vocab.csv')
  const vocabRows = parseCsv(readText(vocabPath)).map((row) => {
    const word = cell(row, 'word')
    const source = sourceByWord.get(word)
    const enriched = enrichedByWord.get(word)
    const old = oldByWord.get(word)
    const oldStatus = cell(old, 'status')
    const nextStatus = VALID_STATUSES.has(oldStatus)
      ? oldStatus
      : statusFor(cell(source, 'status'))
    const tags = unique([
      ...splitList(cell(row, 'tags')),
      cell(source, 'bucket'),
      'LMS 1000',
      'clip-pack',
    ])

    return {
      ...row,
      status: nextStatus,
      tags: tags.join(';'),
      pinyin: cell(enriched, 'Pinyin') || cell(row, 'pinyin') || pinyinFor(word),
      source: 'LMS 1000',
      notes: cell(source, 'reason') || cell(row, 'notes'),
      seenCount: cell(old, 'seenCount') || '0',
      correctCount: cell(old, 'correctCount') || '0',
      wrongCount: cell(old, 'wrongCount') || '0',
      listenedSeconds: cell(old, 'listenedSeconds') || '0',
      lastReviewedAt: cell(old, 'lastReviewedAt'),
    }
  })
  writeText(vocabPath, toCsv(vocabRows, BASE_VOCAB_FIELDS, true))
  writeText(SEED_CSV, toCsv(vocabRows, BASE_VOCAB_FIELDS, true))

  writeJson(path.join(ROOT, 'public', 'clip-packs', 'index.json'), [
    {
      id: NEW_PACK_ID,
      name: NEW_PACK_NAME,
      description: 'Legendary Moonlight Sculptor 1000-word vocabulary with Azure MP3 clips.',
      baseUrl: `clip-packs/${NEW_PACK_ID}`,
      language: 'zh-CN',
    },
  ])

  cleanupUnreferencedFiles(manifest)
  verifyPack()
}

function verifyPack() {
  const vocabRows = parseCsv(readText(path.join(NEW_PUBLIC_PACK, 'vocab.csv')))
  const sentenceRows = parseCsv(readText(path.join(NEW_PUBLIC_PACK, 'sentences.csv')))
  const manifest = readJson(path.join(NEW_PUBLIC_PACK, 'clips_manifest.json'))
  const missingAudio = []
  const missingSsml = []
  for (const clip of manifest.clips ?? []) {
    const audioPath = path.join(NEW_PUBLIC_PACK, clip.path)
    const ssmlPath = path.join(NEW_PUBLIC_PACK, 'ssml', clip.path.replace(/\.mp3$/i, '.ssml'))
    if (!existsSync(audioPath) || statSync(audioPath).size === 0) missingAudio.push(clip.path)
    if (!existsSync(ssmlPath) || statSync(ssmlPath).size === 0) missingSsml.push(path.relative(NEW_PUBLIC_PACK, ssmlPath))
  }
  const blankMeanings = vocabRows.filter((row) => !cell(row, 'meaning'))
  const blankPinyin = vocabRows.filter((row) => !cell(row, 'pinyin'))
  const invalidStatuses = vocabRows.filter((row) => !VALID_STATUSES.has(cell(row, 'status')))
  const clipCounts = groupCounts((manifest.clips ?? []).map((clip) => clip.type))

  console.log(`Pack: ${NEW_PACK_NAME}`)
  console.log(`Words: ${vocabRows.length}`)
  console.log(`Sentences: ${sentenceRows.length}`)
  console.log(`Clips: ${(manifest.clips ?? []).length}`)
  console.log(`Clip counts: ${JSON.stringify(clipCounts)}`)
  console.log(`Missing audio: ${missingAudio.length}`)
  console.log(`Missing SSML: ${missingSsml.length}`)
  console.log(`Blank meanings: ${blankMeanings.length}`)
  console.log(`Blank pinyin: ${blankPinyin.length}`)
  console.log(`Invalid statuses: ${invalidStatuses.length}`)
  if (
    vocabRows.length !== 1000 ||
    missingAudio.length > 0 ||
    missingSsml.length > 0 ||
    blankMeanings.length > 0 ||
    blankPinyin.length > 0 ||
    invalidStatuses.length > 0
  ) {
    console.error(
      JSON.stringify(
        {
          missingAudio: missingAudio.slice(0, 20),
          missingSsml: missingSsml.slice(0, 20),
          blankMeanings: blankMeanings.slice(0, 20).map((row) => cell(row, 'word')),
          blankPinyin: blankPinyin.slice(0, 20).map((row) => cell(row, 'word')),
          invalidStatuses: invalidStatuses.slice(0, 20).map((row) => [cell(row, 'word'), cell(row, 'status')]),
        },
        null,
        2,
      ),
    )
    throw new Error('Pack verification failed.')
  }
}

async function synthesizeMissing() {
  const concurrency = Number.parseInt(readArg('--concurrency') ?? '6', 10)
  const retryCount = Number.parseInt(readArg('--retries') ?? '4', 10)
  const credentials = loadAzureCredentials()
  const manifest = readJson(path.join(NEW_PUBLIC_PACK, 'clips_manifest.json'))
  const seenPaths = new Set()
  const queue = []

  for (const clip of manifest.clips ?? []) {
    if (seenPaths.has(clip.path)) continue
    seenPaths.add(clip.path)
    const audioPath = path.join(NEW_PUBLIC_PACK, clip.path)
    if (existsSync(audioPath) && statSync(audioPath).size > 0) continue
    const ssmlPath = path.join(NEW_PUBLIC_PACK, 'ssml', clip.path.replace(/\.mp3$/i, '.ssml'))
    queue.push({ clip, audioPath, ssmlPath })
  }

  let completed = 0
  let skipped = 0
  let failed = 0
  const total = queue.length
  console.log(`Missing distinct MP3 files: ${total}`)
  console.log(`Concurrency: ${concurrency}`)

  async function worker(workerId) {
    while (queue.length) {
      const item = queue.shift()
      if (!item) return
      if (existsSync(item.audioPath) && statSync(item.audioPath).size > 0) {
        skipped += 1
        completed += 1
        continue
      }
      try {
        await synthesizeOne(item, credentials, retryCount)
        completed += 1
        console.log(`${String(completed).padStart(4, '0')}/${total} worker ${workerId}: ${item.clip.type} ${item.clip.text}`)
      } catch (error) {
        failed += 1
        const message = error instanceof Error ? error.message : String(error)
        console.error(`FAILED worker ${workerId}: ${item.clip.path}: ${message}`)
      }
    }
  }

  await Promise.all(
    Array.from({ length: Math.max(1, concurrency) }, (_, index) => worker(index + 1)),
  )

  console.log(`Completed: ${completed}`)
  console.log(`Skipped: ${skipped}`)
  console.log(`Failed: ${failed}`)
  if (failed > 0) throw new Error(`${failed} Azure TTS requests failed.`)
}

async function synthesizeOne(item, credentials, retryCount) {
  if (!existsSync(item.ssmlPath)) throw new Error(`Missing SSML: ${item.ssmlPath}`)
  const ssml = readText(item.ssmlPath)
  const url = `https://${credentials.region}.tts.speech.microsoft.com/cognitiveservices/v1`
  let lastError
  for (let attempt = 1; attempt <= retryCount + 1; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Ocp-Apim-Subscription-Key': credentials.key,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-48kbitrate-mono-mp3',
          'User-Agent': 'chunky-chinese-lms-1000-pack',
        },
        body: ssml,
      })
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${await response.text()}`)
      }
      mkdirSync(path.dirname(item.audioPath), { recursive: true })
      const tempPath = `${item.audioPath}.${process.pid}.${Date.now()}.tmp`
      writeFileSync(tempPath, Buffer.from(await response.arrayBuffer()))
      if (statSync(tempPath).size === 0) throw new Error('Azure returned an empty MP3.')
      renameSync(tempPath, item.audioPath)
      return
    } catch (error) {
      lastError = error
      if (attempt <= retryCount) await delay(800 * attempt)
    }
  }
  throw lastError
}

function loadAzureCredentials() {
  const envKey = process.env.AZURE_SPEECH_KEY?.trim()
  const envRegion = process.env.AZURE_SPEECH_REGION?.trim()
  if (envKey && envRegion) return { key: envKey, region: envRegion }

  const configPath = path.join(process.env.USERPROFILE ?? '', 'Documents', 'azure-tts-ssml', 'config.json')
  if (existsSync(configPath)) {
    const config = readJson(configPath)
    const key = config.SubscriptionKey?.trim()
    const region = config.ServiceRegion?.trim()
    if (key && region) return { key, region }
  }

  throw new Error('Azure credentials are missing.')
}

function readArg(name) {
  const index = process.argv.indexOf(name)
  if (index === -1) return undefined
  return process.argv[index + 1]
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function audioEntriesFromPack(packDir) {
  const manifestPath = path.join(packDir, 'clips_manifest.json')
  if (!existsSync(manifestPath)) return []
  const manifest = readJson(manifestPath)
  return (manifest.clips ?? [])
    .map((clip) => ({
      key: clipKey(clip),
      fullPath: path.join(packDir, clip.path),
    }))
    .filter((entry) => existsSync(entry.fullPath) && statSync(entry.fullPath).size > 0)
}

function cleanupUnreferencedFiles(manifest) {
  const keepAudio = new Set((manifest.clips ?? []).map((clip) => normalizeRelative(clip.path)))
  const keepSsml = new Set(
    (manifest.clips ?? []).map((clip) => normalizeRelative(path.join('ssml', clip.path.replace(/\.mp3$/i, '.ssml')))),
  )
  let removed = 0
  for (const file of walkFiles(path.join(NEW_PUBLIC_PACK, 'audio'))) {
    if (!keepAudio.has(normalizeRelative(path.relative(NEW_PUBLIC_PACK, file)))) {
      rmSync(file)
      removed += 1
    }
  }
  for (const file of walkFiles(path.join(NEW_PUBLIC_PACK, 'ssml'))) {
    if (!keepSsml.has(normalizeRelative(path.relative(NEW_PUBLIC_PACK, file)))) {
      rmSync(file)
      removed += 1
    }
  }
  console.log(`Removed unreferenced generated files: ${removed}`)
}

function walkFiles(dir) {
  if (!existsSync(dir)) return []
  const output = []
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) output.push(...walkFiles(fullPath))
    else if (entry.isFile()) output.push(fullPath)
  }
  return output
}

function clipKey(clip) {
  return [clip.type, clip.language, clip.text].join('\u0000')
}

function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  const value = text.replace(/^\uFEFF/u, '')

  for (let index = 0; index < value.length; index += 1) {
    const char = value[index]
    const next = value[index + 1]
    if (char === '"' && inQuotes && next === '"') {
      field += '"'
      index += 1
    } else if (char === '"') {
      inQuotes = !inQuotes
    } else if (char === ',' && !inQuotes) {
      row.push(field)
      field = ''
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && next === '\n') index += 1
      row.push(field)
      if (row.some((cellValue) => cellValue.trim())) rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }

  row.push(field)
  if (row.some((cellValue) => cellValue.trim())) rows.push(row)
  if (rows.length === 0) return []
  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).map((cells) => {
    const output = {}
    headers.forEach((header, index) => {
      output[header] = (cells[index] ?? '').trim()
    })
    return output
  })
}

function toCsv(rows, headers, bom = false) {
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','))
  }
  return `${bom ? '\uFEFF' : ''}${lines.join('\n')}\n`
}

function escapeCsv(value) {
  const text = String(value ?? '')
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8').replace(/^\uFEFF/u, '')
}

function writeText(filePath, text) {
  mkdirSync(path.dirname(filePath), { recursive: true })
  writeFileSync(filePath, text, 'utf8')
}

function readJson(filePath) {
  return JSON.parse(readText(filePath))
}

function writeJson(filePath, value) {
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function cell(row, key) {
  if (!row) return ''
  const direct = row[key]
  if (typeof direct === 'string') return direct.trim()
  const lower = key.toLocaleLowerCase()
  const match = Object.entries(row).find(([name]) => name.toLocaleLowerCase() === lower)
  return typeof match?.[1] === 'string' ? match[1].trim() : ''
}

function statusFor(rawStatus) {
  if (VALID_STATUSES.has(rawStatus)) return rawStatus
  if (rawStatus === 'known') return 'known'
  return 'new'
}

function pinyinFor(text) {
  return pinyin(text, { toneType: 'symbol', type: 'string', separator: ' ' })
}

function decodeEntities(value) {
  return String(value)
    .replaceAll('&apos;', "'")
    .replaceAll('&#39;', "'")
    .replaceAll('&quot;', '"')
    .replaceAll('&amp;', '&')
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .trim()
}

function splitList(value) {
  return String(value ?? '')
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
}

function unique(values) {
  return [...new Set(values.filter(Boolean))]
}

function normalizeRelative(value) {
  return value.replaceAll('\\', '/')
}

function groupCounts(values) {
  return values.reduce((counts, value) => {
    counts[value] = (counts[value] ?? 0) + 1
    return counts
  }, {})
}
