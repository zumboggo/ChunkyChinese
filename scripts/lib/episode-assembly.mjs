import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve,dirname,extname} from 'node:path'
import {createHash} from 'node:crypto'
import {pinyin} from 'pinyin-pro'
import {createCharacter} from '../../src/game/animation/shared/engine/character-builder.js'
import {chineseTexts} from '../../src/game/animation/package.ts'
export const digest=value=>createHash('sha256').update(value).digest('hex')
const read=p=>JSON.parse(readFileSync(p,'utf8'))
export const writeJson=(p,v)=>{mkdirSync(dirname(p),{recursive:true});writeFileSync(p,JSON.stringify(v,null,2)+'\n')}
const privatePath=p=>{const full=resolve(p);if(!full.startsWith(resolve('.local')+'/'))throw Error('Authoring outputs must stay under .local/');return full}
export function loadAssets(plan){
 const assets=structuredClone(read(plan.assetsFrom).assets)
 if(plan.castFrom)assets.characters={...assets.characters,...read(plan.castFrom)}
 if(!plan.authoring)return assets
 const author=read(plan.authoring)
 if(author.castRecipes)for(const recipe of read(author.castRecipes))assets.characters[recipe.id]=createCharacter(recipe)
 for(const [id,bg] of Object.entries(author.backgrounds??{})){
  const extension=extname(bg.file).toLowerCase(),mime={'.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp'}[extension]
  if(!mime)throw Error('Backgrounds must be PNG, JPEG or WebP; use game:background for authored SVG scenes.')
  assets.backgrounds[id]={name:bg.name,src:`data:${mime};base64,${readFileSync(bg.file).toString('base64')}`}
 }
 return assets
}
const statePath=plan=>privatePath(resolve(dirname(plan.authoring),'assembly-state.json'))
const scriptHash=plan=>digest(readFileSync(plan.script))
export function freezeScript(plan,assets){
 const path=privatePath(plan.authoring),author=read(path),existing=new Map((author.lines??[]).map(l=>[l.chinese,l]))
 const texts=chineseTexts({script:readFileSync(plan.script,'utf8'),assets})
 author.lines=texts.map(chinese=>existing.get(chinese)??{chinese,english:'',pinyin:'',chunks:[]})
 writeJson(path,author)
 writeJson(statePath(plan),{scriptHash:scriptHash(plan),frozenAt:new Date().toISOString()})
 return {entries:texts.length,authoring:path}
}
export function compileAnnotations(plan,assets,{reviewed=false,requireReview=false}={}){
 const author=read(privatePath(plan.authoring)),state=read(statePath(plan))
 if(state.scriptHash!==scriptHash(plan))throw Error('Script changed after freeze. Re-audit with --draft --freeze before annotating or generating audio.')
 const texts=chineseTexts({script:readFileSync(plan.script,'utf8'),assets}),rows=author.lines??[]
 if(rows.length!==texts.length||new Set(rows.map(r=>r.chinese)).size!==rows.length)throw Error('Annotation rows must match each unique frozen story entry once.')
 const lines={}
 for(const chinese of texts){
  const row=rows.find(r=>r.chinese===chinese)
  if(!row?.english?.trim()||!row.chunks?.length||row.chunks.map(c=>c.chinese).join('')!==chinese||row.chunks.some(c=>!c.gloss?.trim()))throw Error('Complete English and matching phrase chunks: '+chinese)
  lines[chinese]={english:row.english,pinyin:row.pinyin?.trim()||pinyin(chinese,{toneType:'symbol'}),interlinear:row.chunks.map(c=>({chinese:c.chinese,gloss:c.gloss,pinyin:c.pinyin?.trim()||pinyin(c.chinese,{toneType:'symbol'})}))}
 }
 const hash=digest(JSON.stringify(lines))
 if(requireReview&&state.reviewedHash!==hash)throw Error('Language review missing or changed. Inspect pinyin-review.txt, correct the authoring file, then run game:assemble -- --plan=PLAN --reviewed.')
 writeJson(privatePath(plan.annotations),lines)
 writeFileSync(privatePath(resolve(dirname(plan.authoring),'pinyin-review.txt')),Object.entries(lines).map(([zh,l])=>`${zh}\n${l.pinyin}\n${l.english}\n${l.interlinear.map(c=>`${c.chinese} [${c.pinyin}] ${c.gloss}`).join(' | ')}`).join('\n\n')+'\n')
 if(reviewed)writeJson(statePath(plan),{...state,reviewedHash:hash,reviewedAt:new Date().toISOString()})
 return lines
}
/** Copy only new media, or identical bytes on retry. Never replace a released asset. */
export function stageMedia(plan){
 if(!plan.media)return []
 const m=plan.media,checks=read(m.checks),video=readFileSync(m.video)
 if(checks.sha256!==digest(video)||!checks.audio_non_silent||checks.speech_check!=='pass')throw Error('Opening media requires a matching, passing speech/audio report.')
 if(!m.provenance?.scene||!m.provenance?.style||!m.provenance?.identityReference)throw Error('Record the opening scene, medium and identity reference.')
 const base=`public/stories/animated/cutscenes/${plan.id}`
 const entries=[[m.video,base+'.mp4'],[m.poster,base+'.poster.jpg'],[m.image,`stories/characters/${plan.series}/${plan.id}-opening${extname(m.image)}`]]
 for(const [source,target] of entries){const data=readFileSync(source);if(existsSync(target)&&!readFileSync(target).equals(data))throw Error('Refusing to overwrite media: '+target)}
 for(const [source,target] of entries){mkdirSync(dirname(target),{recursive:true});if(!existsSync(target))writeFileSync(target,readFileSync(source),{flag:'wx'})}
 plan.catalog.intro={src:base.slice(7)+'.mp4',poster:base.slice(7)+'.poster.jpg',title:checks.expected_dialogue,durationSeconds:checks.total_seconds}
 return entries.map(([,target])=>target)
}
export function stageCast(plan,assets){
 if(!plan.authoring)return
 const author=read(plan.authoring)
 if(!author.castRecipes)return
 const path=`public/stories/animated/cast/${plan.id}.json`,data=JSON.stringify(assets.characters,null,2)+'\n'
 if(existsSync(path)&&readFileSync(path,'utf8')!==data)throw Error('Refusing to replace cast bundle: '+path)
 if(!existsSync(path)){mkdirSync(dirname(path),{recursive:true});writeFileSync(path,data,{flag:'wx'})}
 plan.castFrom=path
 plan.continuation.castRecipes=author.castRecipes
 plan.continuation.castBundle=path
}
export function saveAuthoringRecord(plan,report,vocabulary){
 const path=`stories/authoring/${plan.id}.json`
 const result={...(existsSync(path)?read(path):{}),...Object.fromEntries(['id','series','title','description','sources','planning','continuation','routes','catalog'].filter(k=>plan[k]!==undefined).map(k=>[k,plan[k]]))}
 if(plan.media){
  const {sha256,dimensions,total_seconds,hold_seconds,motion_seconds,audio_non_silent,speech_check,transcription}=read(plan.media.checks)
  result.teaser={...plan.media.provenance,image:`stories/characters/${plan.series}/${plan.id}-opening${extname(plan.media.image)}`,checks:{sha256,dimensions,total_seconds,hold_seconds,motion_seconds,audio_non_silent,speech_check,transcription}}
 }
 result.verification={packageBytes:report.bytes,reachableRoutes:report.routeCoverage.total,browserRoutes:report.routeCoverage.browser,familiarityPercent:vocabulary.range,pinyinReviewed:true,browser:'Full selected route suite on phone and desktop; exhaustive engine/replay checks.',reviewTargets:plan.review?.lines??[]}
 writeJson(path,result)
}
