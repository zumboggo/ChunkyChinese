import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {renderToStaticMarkup} from 'react-dom/server'
import EpisodeInterlinear from './EpisodeInterlinear'
import {validateChinese,exportPackage,importPackage,type ChinesePackage} from './package'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-01-v2.json','utf8')) as ChinesePackage
const old=JSON.parse(readFileSync('stories/animated/moonlight-01.json','utf8')) as ChinesePackage
describe('interlinear episode presentation',()=>{
 it('annotates every line without changing words, audio, assets or story progression',()=>{
  expect(pack.script).toBe(old.script);expect(pack.assets).toEqual(old.assets)
  expect(validateChinese(pack).errors).toEqual([])
  for(const [text,line] of Object.entries(pack.chinese!.lines)){
   expect(line.interlinear?.map(c=>c.chinese).join('')).toBe(text)
   expect(line.interlinear?.every(c=>c.pinyin&&c.gloss)).toBe(true)
   expect(line.audio).toBe(old.chinese!.lines[text].audio)
  }
 })
 it('rejects incomplete, malformed and mismatched chunk metadata',()=>{
  for(const chunks of [[],[{chinese:'错',pinyin:'cuò',gloss:'wrong'}],[{chinese:'回来了？',gloss:'home?'}]]){
   const p=structuredClone(pack);p.chinese!.lines['回来了？'].interlinear=chunks
   expect(validateChinese(p).errors.length).toBeGreaterThan(0)
  }
 })
 it('renders choice chunks without nested interactive elements and honors independent help toggles',()=>{
  const text='我会照顾她的。',line=pack.chinese!.lines[text]
  const markup=renderToStaticMarkup(<button><EpisodeInterlinear text={text} line={line} showPinyin showGloss/></button>)
  expect(markup.match(/<button/g)).toHaveLength(1);expect(markup).toContain('look after her')
  const plain=renderToStaticMarkup(<EpisodeInterlinear text={text} line={line} showPinyin={false} showGloss={false}/>)
  expect(plain).not.toContain('reader-interlinear-pinyin');expect(plain).not.toContain('reader-interlinear-gloss');expect(plain).toContain('照顾她的。')
 })
 it('preserves reviewed chunks through ZIP export and import',async()=>{
  const blob=await exportPackage(pack)
  const restored=await importPackage(new File([await blob.arrayBuffer()],'episode.zip'))
  expect(restored.chinese).toEqual(pack.chinese)
 })
})
