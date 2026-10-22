import {readFileSync,readdirSync,existsSync} from 'node:fs'
import {resolve} from 'node:path'
import {validateChinese,chineseTexts} from '../src/game/animation/package.ts'
const root=resolve(import.meta.dirname,'..')
for(const file of readdirSync(resolve(root,'stories/animated')).filter(f=>f.endsWith('.json'))){const source=JSON.parse(readFileSync(resolve(root,'stories/animated',file),'utf8')),built=JSON.parse(readFileSync(resolve(root,'public/stories/animated',file),'utf8'));if(JSON.stringify(source)!==JSON.stringify(built))throw Error('Rebuild '+file);const scriptFile=resolve(root,'stories/animated/source',file.replace(/\.json$/,'.story'));if(existsSync(scriptFile)&&readFileSync(scriptFile,'utf8')!==source.script)throw Error('Readable script differs: '+file);const v=validateChinese(source);if(v.errors.length)throw Error(JSON.stringify(v.errors));for(const text of chineseTexts(source)){if(!source.chinese?.lines[text]?.pinyin)throw Error('Missing pinyin: '+text);if(!source.chinese.lines[text].audio)throw Error('Missing speech: '+text)}console.log('Validated '+file)}

const catalog=JSON.parse(readFileSync(resolve(root,'public/stories/animated/catalog.json'),'utf8'));const ids=new Set();for(const entry of catalog){if(!/^[a-z0-9-]+$/.test(entry.id)||!/^[a-z0-9-]+\.json$/.test(entry.path)||ids.has(entry.id))throw Error('Invalid or duplicate catalog entry');ids.add(entry.id);if(!existsSync(resolve(root,'stories/animated',entry.path)))throw Error('Missing catalog package');}
for(const entry of catalog)if(entry.intro){
 const {src,poster,title}=entry.intro
 if(typeof title!=='string'||!title.trim()||!/^stories\/animated\/cutscenes\/[a-z0-9-]+\.mp4$/.test(src)||!/^stories\/animated\/cutscenes\/[a-z0-9-]+\.jpg$/.test(poster))throw Error('Invalid episode introduction: '+entry.id)
 if(!existsSync(resolve(root,'public',src))||!existsSync(resolve(root,'public',poster)))throw Error('Missing introduction media: '+entry.id)
}
