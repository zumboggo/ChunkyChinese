import {existsSync,readFileSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {execFileSync} from 'node:child_process'

export function animationSource(root,explicit){
 if(explicit){
  const source=resolve(explicit)
  execFileSync('git',['rev-parse','HEAD'],{cwd:source,stdio:'pipe'})
  if(!existsSync(resolve(source,'functions/learning-content/src/story-engine.js')))throw Error('Explicit animation source is missing the engine.')
  return source
 }
 const common=execFileSync('git',['rev-parse','--path-format=absolute','--git-common-dir'],{cwd:root,encoding:'utf8'}).trim()
 const primary=dirname(common)
 const candidates=[explicit,process.env.EPISODE_ANIMATION_SOURCE,resolve(root,'../../Learning is Fun/implementation'),resolve(primary,'../../Learning is Fun/implementation')].filter(Boolean).map(p=>resolve(p))
 const commit=JSON.parse(readFileSync(resolve(root,'src/game/animation/shared/manifest.json'),'utf8')).commit
 for(const source of [...new Set(candidates)]){
  if(!existsSync(source))continue
  try{execFileSync('git',['cat-file','-e',`${commit}:functions/learning-content/src/story-engine.js`],{cwd:source,stdio:'pipe'});return source}catch{/* Try the primary checkout's sibling. */}
 }
 throw Error('Pinned animation source unavailable. Set EPISODE_ANIMATION_SOURCE to the Learning is Fun checkout before authoring or publishing.')
}
