import { readFileSync, writeFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const SEED_PATH = path.join(ROOT, 'public', 'seed', 'lms-vocab-1000.csv')
const PACK_VOCAB_PATH = path.join(ROOT, 'public', 'clip-packs', 'lms-1000-azure', 'vocab.csv')
const DICTIONARY_PATH = path.join(ROOT, 'public', 'dictionary', 'cedict.json')
const REPORT_PATH = path.join(ROOT, 'public', 'seed', 'lms-vocab-1000-validation-report.json')

const BASE_FIELDS = [
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

const CONTEXT_OVERRIDES = new Map([
  ['不想', ['to not want to', 'bù xiǎng']],
  ['到家', ['to arrive home', 'dào jiā']],
  ['地', ['structural particle', 'de']],
  ['得', ['structural particle; to have to', 'de']],
  ['了', ['completed-action particle', 'le']],
  ['只', ['only; just', 'zhǐ']],
  ['啊', ['exclamation particle', 'a']],
  ['吗', ['question particle', 'ma']],
  ['一点儿', ['a little bit', 'yì diǎn er']],
  ['点儿', ['a little; a bit', 'diǎn er']],
  ['嗯', ['uh-huh; hmm', 'ńg']],
  ['干', ['to do; dry', 'gàn']],
  ['西门', ['west gate', 'xī mén']],
  ['的话', ['if; in that case', 'de huà']],
  ['舍不得', ['reluctant to part with', 'shě bu de']],
  ['有一天', ['one day', 'yǒu yì tiān']],
  ['亲爱的', ['dear; beloved', 'qīn ài de']],
  ['很多', ['many; a lot', 'hěn duō']],
  ['住在', ['to live in', 'zhù zài']],
  ['一开始', ['at first; from the beginning', 'yì kāi shǐ']],
  ['的时侯', ['when; at the time of', 'de shí hòu']],
  ['等着', ['waiting; to wait', 'děng zhe']],
  ['海中', ['in the sea', 'hǎi zhōng']],
  ['看着', ['looking at; watching', 'kàn zhe']],
  ['哭着', ['crying; while crying', 'kū zhe']],
  ['学着', ['learning; trying to learn', 'xué zhe']],
  ['笑着', ['smiling; laughing', 'xiào zhe']],
  ['弯刀', ['curved blade; scimitar', 'wān dāo']],
  ['说过', ['have said; said before', 'shuō guo']],
  ['山上', ['on the mountain', 'shān shàng']],
  ['那', ['that', 'nà']],
  ['那样', ['like that', 'nà yàng']],
  ['那是', ['that is', 'nà shì']],
  ['这不', ['this is not; isn\'t this', 'zhè bù']],
  ['人中', ['among people', 'rén zhōng']],
  ['一说', ['once said; as soon as it is said', 'yī shuō']],
  ['与', ['and; with', 'yǔ']],
  ['尼哥', ['Nige; a name', 'ní gē']],
  ['买卖', ['buying and selling; business', 'mǎi mài']],
  ['人会', ['people can; people will', 'rén huì']],
  ['底母', ['Dimu; a name', 'dǐ mǔ']],
  ['慢慢地', ['slowly', 'màn màn de']],
  ['打篮球', ['to play basketball', 'dǎ lán qiú']],
  ['放在', ['to put in; to put on', 'fàng zài']],
  ['真对不起', ['really sorry', 'zhēn duì bù qǐ']],
  ['第一课', ['first lesson', 'dì yī kè']],
  ['这家', ['this shop; this family', 'zhè jiā']],
  ['这时候', ['at this time', 'zhè shí hòu']],
  ['记下', ['to write down; to note down', 'jì xià']],
  ['摆着', ['placed; arranged', 'bǎi zhe']],
  ['铜币', ['copper coin', 'tóng bì']],
  ['愣住', ['to be stunned; to freeze', 'lèng zhù']],
  ['留着', ['to keep; to leave remaining', 'liú zhe']],
  ['李贤', ['Li Xian; a name', 'lǐ xián']],
  ['李夏妍', ['Li Xiayan; a name', 'lǐ xià yán']],
  ['皇家之路', ['Royal Road', 'huáng jiā zhī lù']],
  ['罗森海姆', ['Rosenheim; a place name', 'luó sēn hǎi mǔ']],
  ['塞拉堡', ['Sela Castle; a place name', 'sài lā bǎo']],
  ['扎哈布', ['Zahab; a name', 'zhā hā bù']],
  ['月光雕刻师', ['Moonlight Sculptor', 'yuè guāng diāo kè shī']],
  ['雕刻店', ['sculpture shop', 'diāo kè diàn']],
  ['秘密职业', ['secret profession', 'mì mì zhí yè']],
  ['问问', ['to ask; to inquire', 'wèn wen']],
  ['第三', ['third', 'dì sān']],
  ['这次', ['this time', 'zhè cì']],
  ['很快', ['very fast; soon', 'hěn kuài']],
  ['想想', ['to think about it', 'xiǎng xiang']],
  ['还要', ['still need; also want', 'hái yào']],
  ['听听', ['to listen; have a listen', 'tīng ting']],
])

const WRITE = process.argv.includes('--write')

const rows = parseCsv(readText(SEED_PATH))
const dictionary = JSON.parse(readText(DICTIONARY_PATH))
const entriesByWord = new Map()
for (const entry of dictionary) {
  const entries = entriesByWord.get(entry.simplified) ?? []
  entries.push(entry)
  entriesByWord.set(entry.simplified, entries)
}

const report = {
  generatedAt: new Date().toISOString(),
  rowCount: rows.length,
  updatedRows: 0,
  overrideCount: 0,
  exactDictionaryMatches: 0,
  missingDictionaryEntries: [],
  pinyinChanges: [],
  meaningChanges: [],
}

const cleaned = rows.map((row) => {
  const word = cell(row, 'word')
  const override = CONTEXT_OVERRIDES.get(word)
  const dictionaryEntries = entriesByWord.get(word) ?? []
  const correction = override
    ? { meaning: override[0], pinyin: override[1], source: 'context-override' }
    : correctionFromDictionary(word, cell(row, 'meaning'), dictionaryEntries)

  if (!correction) {
    report.missingDictionaryEntries.push(word)
    return row
  }

  if (override) report.overrideCount += 1
  else report.exactDictionaryMatches += 1

  const currentMeaning = cell(row, 'meaning')
  const nextMeaning = override || !meaningLooksUsable(currentMeaning, dictionaryEntries)
    ? correction.meaning
    : conciseCurrentMeaning(currentMeaning)
  const next = {
    ...row,
    meaning: nextMeaning,
    pinyin: correction.pinyin,
    audioMeaningFilename: currentMeaning === nextMeaning ? cell(row, 'audioMeaningFilename') : '',
  }

  if (cell(row, 'meaning') !== next.meaning) {
    report.meaningChanges.push({ word, before: cell(row, 'meaning'), after: next.meaning, source: correction.source })
  }
  if (normalizePinyin(cell(row, 'pinyin')) !== normalizePinyin(next.pinyin)) {
    report.pinyinChanges.push({ word, before: cell(row, 'pinyin'), after: next.pinyin, source: correction.source })
  }
  if (cell(row, 'meaning') !== next.meaning || cell(row, 'pinyin') !== next.pinyin) {
    report.updatedRows += 1
  }
  return next
})

if (WRITE) {
  const csv = toCsv(cleaned, BASE_FIELDS)
  writeFileSync(SEED_PATH, csv, 'utf8')
  writeFileSync(PACK_VOCAB_PATH, csv, 'utf8')
  writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

console.log(JSON.stringify(report, null, 2))

function correctionFromDictionary(word, currentMeaning, entries) {
  if (entries.length === 0) return undefined
  const generatedPinyin = pinyin(word, { toneType: 'symbol', type: 'string', separator: ' ' })
  const sorted = [...entries].sort(
    (a, b) =>
      entryPenalty(a, generatedPinyin, currentMeaning) -
      entryPenalty(b, generatedPinyin, currentMeaning),
  )
  const entry = sorted[0]
  const meanings = cleanMeanings(entry.english)
  if (meanings.length === 0) return undefined
  return {
    meaning: meanings.slice(0, 2).join('; '),
    pinyin: generatedPinyin,
    source: 'cedict',
  }
}

function cleanMeanings(value) {
  const raw = Array.isArray(value) ? value : [String(value)]
  const cleaned = raw
    .flatMap((item) => String(item).split(/;/u))
    .map((item) => item.replace(/\bCL:[^;]+/gu, '').trim())
    .map((item) => item.replace(/\s*\([^)]*\)\s*/gu, ' ').replace(/\s+/gu, ' ').trim())
    .map((item) => item.replace(/\s*\[[^\]]+\]\s*/gu, ' ').replace(/\s+/gu, ' ').trim())
    .map((item) => item.replace(/[()]/gu, '').trim())
    .filter(Boolean)
    .filter((item) => !/^(abbr\.|variant of|see |also written|erhua variant)/iu.test(item))
    .filter((item) => item.length <= 70)
  return unique(cleaned).slice(0, 2)
}

function meaningLooksUsable(currentMeaning, entries) {
  if (!currentMeaning) return false
  if (/\bpinyin\b|[a-z]{4,}is[A-Z]|\bquéshù\b|Because;|Not enough|America$/u.test(currentMeaning)) {
    return false
  }
  const dictionaryText = entries
    .map((entry) => (Array.isArray(entry.english) ? entry.english.join('; ') : String(entry.english)))
    .join('; ')
  return meaningOverlap(currentMeaning, dictionaryText) >= 0.2
}

function conciseCurrentMeaning(currentMeaning) {
  return currentMeaning
    .split(';')
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 2)
    .join('; ')
}

function entryPenalty(entry, generatedPinyin, currentMeaning) {
  const english = Array.isArray(entry.english) ? entry.english.join('; ') : String(entry.english)
  const entryPinyin = normalizePinyin(toneNumbersToMarks(entry.pinyin))
  const wantedPinyin = normalizePinyin(generatedPinyin)
  let penalty = 0
  if (entryPinyin !== wantedPinyin) penalty += 25
  penalty -= meaningOverlap(currentMeaning, english) * 80
  if (/^[A-Z]/u.test(entry.pinyin)) penalty += 30
  if (/surname|county|prefecture|abbr\.|variant of|see /iu.test(english)) penalty += 20
  if (/^\w+1/u.test(entry.pinyin)) penalty -= 2
  return penalty
}

function meaningOverlap(a, b) {
  const left = meaningTokens(a)
  const right = meaningTokens(b)
  if (left.size === 0 || right.size === 0) return 0
  let hits = 0
  for (const token of left) {
    if (right.has(token)) hits += 1
  }
  return hits / left.size
}

function meaningTokens(value) {
  return new Set(
    String(value)
      .toLocaleLowerCase()
      .replace(/[^a-z\s]/gu, ' ')
      .split(/\s+/u)
      .map((token) => token.replace(/s$/u, ''))
      .map((token) => (token === 'classifier' ? 'measure' : token))
      .map((token) => (token === 'towards' ? 'toward' : token))
      .map((token) => (token === 'moving' ? 'move' : token))
      .filter((token) => token.length > 1)
      .filter((token) => !['the', 'and', 'for', 'with', 'one', 'that', 'this', 'from', 'into'].includes(token)),
  )
}

function toneNumbersToMarks(input) {
  return String(input)
    .replace(/u:/gu, 'v')
    .split(/\s+/u)
    .map(markSyllable)
    .join(' ')
    .replace(/v/gu, 'ü')
}

function markSyllable(syllable) {
  const match = syllable.match(/^([A-Za-züv:]+)([1-5])$/u)
  if (!match) return syllable.toLocaleLowerCase()
  const raw = match[1].toLocaleLowerCase()
  const tone = Number(match[2])
  if (tone === 5) return raw.replace(/v/gu, 'ü')
  const letters = raw.replace(/v/gu, 'ü')
  const targetIndex = toneTargetIndex(letters)
  if (targetIndex < 0) return letters
  return `${letters.slice(0, targetIndex)}${toneMark(letters[targetIndex], tone)}${letters.slice(targetIndex + 1)}`
}

function toneTargetIndex(letters) {
  const a = letters.indexOf('a')
  if (a >= 0) return a
  const e = letters.indexOf('e')
  if (e >= 0) return e
  const ou = letters.indexOf('ou')
  if (ou >= 0) return ou
  for (let index = letters.length - 1; index >= 0; index -= 1) {
    if ('aeiouü'.includes(letters[index])) return index
  }
  return -1
}

function toneMark(letter, tone) {
  const marks = {
    a: ['ā', 'á', 'ǎ', 'à'],
    e: ['ē', 'é', 'ě', 'è'],
    i: ['ī', 'í', 'ǐ', 'ì'],
    o: ['ō', 'ó', 'ǒ', 'ò'],
    u: ['ū', 'ú', 'ǔ', 'ù'],
    ü: ['ǖ', 'ǘ', 'ǚ', 'ǜ'],
  }
  return marks[letter]?.[tone - 1] ?? letter
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
  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).map((cells) => {
    const output = {}
    headers.forEach((header, index) => {
      output[header] = (cells[index] ?? '').trim()
    })
    return output
  })
}

function toCsv(csvRows, headers) {
  const lines = [headers.join(',')]
  for (const row of csvRows) {
    lines.push(headers.map((header) => escapeCsv(row[header])).join(','))
  }
  return `${lines.join('\n')}\n`
}

function escapeCsv(value) {
  const text = String(value ?? '')
  return /[",\n\r]/u.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function cell(row, key) {
  return String(row[key] ?? '').trim()
}

function normalizePinyin(value) {
  return String(value).replace(/[ '’]/gu, '').replace(/u:/gu, 'ü').toLocaleLowerCase()
}

function unique(values) {
  return [...new Set(values)]
}

function readText(filePath) {
  return readFileSync(filePath, 'utf8').replace(/^\uFEFF/u, '')
}
