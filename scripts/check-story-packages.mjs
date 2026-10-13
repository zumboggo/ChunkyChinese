import {readFileSync,readdirSync} from 'node:fs'
import {resolve} from 'node:path'
import {validateChinese,chineseTexts} from '../src/game/animation/package.ts'
const root=resolve(import.meta.dirname,'..')
for(const file of readdirSync(resolve(root,'stories/animated')).filter(f=>f.endsWith('.json'))){const source=JSON.parse(readFileSync(resolve(root,'stories/animated',file),'utf8')),built=JSON.parse(readFileSync(resolve(root,'public/stories/animated',file),'utf8'));if(JSON.stringify(source)!==JSON.stringify(built))throw Error('Rebuild '+file);const v=validateChinese(source);if(v.errors.length)throw Error(JSON.stringify(v.errors));for(const text of chineseTexts(source)){if(!source.chinese?.lines[text]?.pinyin)throw Error('Missing pinyin: '+text);if(!source.chinese.lines[text].audio)throw Error('Missing speech: '+text)}console.log('Validated '+file)}
