// Build game/pinyin_map.json from the Chinese in the Ren'Py chapter scripts.
//
// Scans every .rpy under renpy/lms/game for runs of Chinese characters and
// produces:
//   - lines: { "<chinese run>": ["tā","hái",...] }  context-aware, one entry
//            per character (aligned to the run), via pinyin-pro word segmentation
//   - chars: { "他": "tā", ... }                     single-char fallback
//
// The runtime filter (game/chunky/pinyin.rpy) extracts the same runs and looks
// them up. Run after editing/adding any Chinese dialogue.
//
// Usage: node scripts/renpy/build-pinyin-map.mjs

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { pinyin } from 'pinyin-pro'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
const GAME_DIR = path.join(ROOT, 'renpy/lms/game')
const OUT = path.join(GAME_DIR, 'pinyin_map.json')

// Keep this set identical to CHUNKY_CJK_PUNCT in game/chunky/pinyin.rpy.
const CJK_PUNCT = '。，、；：？！…—·～〜（）《》〈〉「」『』“”‘’'
const PUNCT_SET = new Set([...CJK_PUNCT])

function isHan(ch) {
  const o = ch.codePointAt(0)
  return (o >= 0x3400 && o <= 0x9fff) || (o >= 0xf900 && o <= 0xfaff)
}
function isCjk(ch) {
  return isHan(ch) || PUNCT_SET.has(ch)
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const full = path.join(dir, name)
    const s = statSync(full)
    if (s.isDirectory()) walk(full, out)
    else if (name.endsWith('.rpy')) out.push(full)
  }
  return out
}

// Extract maximal Chinese runs from a piece of text, skipping {tags} and
// [interpolation] exactly like the runtime filter does.
function extractRuns(text, runs) {
  let i = 0
  const n = text.length
  let buf = ''
  const flush = () => { if (buf) { runs.add(buf); buf = '' } }
  while (i < n) {
    const ch = text[i]
    if (ch === '{') { flush(); const j = text.indexOf('}', i); i = j === -1 ? n : j + 1; continue }
    if (ch === '[') { flush(); const j = text.indexOf(']', i); i = j === -1 ? n : j + 1; continue }
    if (isCjk(ch)) { buf += ch; i++; continue }
    flush(); i++
  }
  flush()
}

function main() {
  const files = walk(GAME_DIR)
  const runs = new Set()
  // Pull the text inside Ren'Py double-quoted strings, then extract runs.
  const stringRe = /"((?:[^"\\]|\\.)*)"/gu
  for (const file of files) {
    const src = readFileSync(file, 'utf8')
    let m
    while ((m = stringRe.exec(src)) !== null) {
      const unescaped = m[1].replace(/\\"/gu, '"').replace(/\\\\/gu, '\\')
      extractRuns(unescaped, runs)
    }
  }

  const lines = {}
  const chars = {}
  for (const run of runs) {
    const arr = pinyin(run, { type: 'array', toneType: 'symbol', nonZh: 'consecutive' })
    // pinyin-pro returns one entry per character; align defensively.
    const cps = [...run]
    const aligned = cps.map((ch, idx) => {
      if (!isHan(ch)) return null
      const py = arr[idx]
      return py && py !== ch ? py : null
    })
    lines[run] = aligned
    cps.forEach((ch, idx) => {
      if (isHan(ch) && aligned[idx] && !chars[ch]) chars[ch] = aligned[idx]
    })
  }

  const payload = { lines, chars }
  writeFileSync(OUT, JSON.stringify(payload), 'utf8')
  console.log(`Wrote ${path.relative(ROOT, OUT)}: ${Object.keys(lines).length} lines, ${Object.keys(chars).length} unique characters.`)
}

main()
