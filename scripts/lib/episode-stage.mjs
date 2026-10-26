import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs'
import {resolve,dirname} from 'node:path'
import {createHash} from 'node:crypto'
export function stageEpisodeRelease({id,plan,pack,root=process.cwd()}){
 if(!/^[a-z0-9-]+$/.test(id))throw Error('Invalid episode ID')
 if(plan.pinyinReviewed!==true)throw Error('Review the generated pinyin, save corrections in annotations, then set pinyinReviewed: true.')
 const catalogPath=resolve(root,'public/stories/animated/catalog.json'),catalog=JSON.parse(readFileSync(catalogPath,'utf8')),entry=plan.catalog
 if(!entry||!/^[a-z0-9-]+$/.test(entry.id)||!['lms','name-of-the-wind','daily-life','practice'].includes(entry.category)||entry.category!=='practice'&&(!Number.isInteger(entry.episode)||entry.episode<1))throw Error('Complete catalog identity/category/episode.')
 const targets=[`stories/animated/${id}.json`,`public/stories/animated/${id}.json`,`stories/animated/source/${id}.story`,`stories/animated/source/${id}.lines.json`].map(p=>resolve(root,p))
 if(targets.some(existsSync)||catalog.some(e=>e.id===entry.id||e.path===id+'.json'||e.category===entry.category&&e.episode===entry.episode))throw Error('Release already exists; published packages are never overwritten.')
 const sw=resolve(root,'public/service-worker.js'),text=readFileSync(sw,'utf8')
 if(!/const CACHE_VERSION = '[^']+'/.test(text))throw Error('Unrecognized service worker version; stage nothing.')
 const metadata=Object.fromEntries(Object.entries(pack.chinese.lines).map(([t,l])=>{const {audio,...rest}=l;return [t,rest]}))
 catalog.push({...entry,path:id+'.json',summary:{title:pack.title,description:pack.description}})
 const version='episode-'+createHash('sha256').update(JSON.stringify(catalog)).digest('hex').slice(0,12)
 const outputs=[JSON.stringify(pack,null,2)+'\n',JSON.stringify(pack),pack.script,JSON.stringify(metadata,null,2)+'\n']
 for(const [i,p] of targets.entries()){mkdirSync(dirname(p),{recursive:true});writeFileSync(p,outputs[i],{flag:'wx'})}
 writeFileSync(catalogPath,JSON.stringify(catalog,null,2)+'\n')
 writeFileSync(sw,text.replace(/const CACHE_VERSION = '[^']+'/,`const CACHE_VERSION = '${version}'`))
 return targets
}
