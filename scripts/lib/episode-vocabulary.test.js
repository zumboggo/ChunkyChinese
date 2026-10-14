import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {auditVocabulary} from './episode-vocabulary.mjs'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-02.json','utf8'))
const supplement=JSON.parse(readFileSync('stories/authoring/common-familiar-100.json','utf8'))
describe('vocabulary-first episode audit',()=>{
 it('keeps assumed familiarity separate, deduplicates reviewed words and never changes the export',()=>{
  const words=[{word:'我',known:true},{word:'不',known:false}],before=structuredClone(words)
  const result=auditVocabulary({...pack,script:'story 2\nI: 我不。\nend\n'},words,{supplement:['我','不']})
  expect(result.knownWords).toBe(1);expect(result.assumedAdditionalWords).toBe(1)
  expect(result.routes[0]).toMatchObject({known:2,measured:1,assumed:1,total:2,percent:100})
  expect(words).toEqual(before)
  expect(auditVocabulary({...pack,script:'story 2\nI: 我不。\nend\n'},words).routes[0].percent).toBe(50)
 })
 it('counts all visible options, only reached dialogue and unfamiliar lexicon terms as unknown',()=>{
  const script='story 2\nchoice c\noption a "我" -> a\noption b "不" -> b\nlabel a\nI: 钱包。\ngoto done\nlabel b\nI: 我。\nlabel done\nend\n'
  const r=auditVocabulary({...pack,script},[{word:'我',known:true},{word:'钱',known:true},{word:'包',known:true}],{supplement:['不'],lexicon:['钱包']})
  expect(r.routes).toHaveLength(2);expect(r.routes[0]).toMatchObject({known:2,total:3,unknown:['钱包']})
  expect(r.routes[1]).toMatchObject({known:3,total:3,unknown:[]})
 })
 it('rejects empty Mandarin and chance scripts rather than reporting misleading coverage',()=>{
  expect(()=>auditVocabulary({...pack,script:'story 2\nI: Hello.\nend\n'},[])).toThrow('No Mandarin')
  expect(()=>auditVocabulary({...pack,script:'story 2\nchance c 50 -> a else b\nlabel a\nI: 我。\ngoto done\nlabel b\nI: 你。\nlabel done\nend\n'},[])).toThrow('Chance')
 })
 it('ships exactly 100 unique, nonempty assumed words',()=>{
  expect(supplement.words).toHaveLength(100);expect(new Set(supplement.words).size).toBe(100)
  expect(supplement.words.every(w=>/^[\u3400-\u9fff]+$/u.test(w))).toBe(true)
  expect(supplement.words).toEqual(expect.arrayContaining(['不','也','因为','先','吧']))
 })
})

it('reports English and mixed exposure without inflating Mandarin familiarity',()=>{
 const script='story 2\nI: 我。\nI: English bridge.\nI: 我 play.\nchoice c\noption a "我" -> done\noption b "English option" -> done\nlabel done\nend\n'
 const r=auditVocabulary({...pack,script},[{word:'我',known:true}])
 for(const route of r.routes){expect(route.percent).toBe(100);expect(route.exposure).toEqual({mandarin:2,english:2,mixed:1,totalEntries:5,mandarinEntryPercent:60})}
})
