import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {execFile} from 'node:child_process'
import {promisify} from 'node:util'
import {createHash} from 'node:crypto'

const model='jaaari/kokoro-82m'
const version='f559560eb822dc509045f3921a1921234918b91739db4bf3daab2169b71c7a13'
const run=promisify(execFile)
export const englishText=line=>(line.english||line.interlinear?.map(c=>c.gloss).join(' ')||'').trim()
export const englishKey=text=>createHash('sha256').update(text).digest('hex')
/** Credentials and prediction receipts stay local. A saved prediction is polled,
 * never resubmitted on retries; an uncertain submission stops for inspection. */
export async function generateEpisodeEnglish(packs,{dryRun=false,concurrency=12,maxEstimatedCost=0}={}){
 const output=path.resolve('public/stories/audio'),cache=path.resolve('.local/episode-english-kokoro')
 await fs.mkdir(output,{recursive:true});await fs.mkdir(cache,{recursive:true})
 const jobs=new Map()
 for(const pack of packs)for(const line of Object.values(pack.chinese?.lines??{})){
  const text=englishText(line);if(text)jobs.set(englishKey(text),text)
 }
 const queue=[]
 for(const [key,text] of jobs){try{if((await fs.stat(path.join(output,key+'.m4a'))).size>100)continue}catch{/* New text. */}queue.push({key,text})}
 console.log(JSON.stringify({model,clips:jobs.size,missing:queue.length,characters:queue.reduce((n,j)=>n+j.text.length,0)}))
 if(dryRun)return
 const estimatedCost=queue.length*0.00027
 if(queue.length&&(!Number.isFinite(maxEstimatedCost)||maxEstimatedCost<=0||estimatedCost>maxEstimatedCost))throw Error(`TTS estimate exceeds the configured preflight limit; estimated cost is $${estimatedCost.toFixed(2)}. No requests submitted.`)
 const token=(process.env.REPLICATE_API_TOKEN||await fs.readFile(path.join(os.homedir(),'.claude/replicate-token'),'utf8')).trim()
 const sleep=ms=>new Promise(r=>setTimeout(r,ms))
 async function api(url,options={}){
  const response=await fetch(url,{...options,headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json',...options.headers},signal:AbortSignal.timeout(90000)})
  if(!response.ok)throw Error(`Replicate HTTP ${response.status}`)
  return response.json()
 }
 let done=jobs.size-queue.length,stopped=false
 async function generate({key,text}){
  const receipt=path.join(cache,key+'.json');let prediction
  try{prediction=JSON.parse(await fs.readFile(receipt,'utf8'))}catch(e){if(e.code!=='ENOENT')throw e}
  if(!prediction){
   await fs.writeFile(receipt,JSON.stringify({status:'submission-uncertain'}))
   prediction=await api('https://api.replicate.com/v1/predictions',{method:'POST',headers:{'Cancel-After':'2m',Prefer:'wait=60'},body:JSON.stringify({version,input:{text,voice:'af_bella',speed:1}})})
   await fs.writeFile(receipt,JSON.stringify(prediction))
  }
  if(!prediction.urls?.get)throw Error(`Inspect uncertain TTS submission ${key}; no automatic retry.`)
  while(!['succeeded','failed','canceled'].includes(prediction.status)){
   await sleep(1500);prediction=await api(prediction.urls.get);await fs.writeFile(receipt,JSON.stringify(prediction))
  }
  if(prediction.status!=='succeeded')throw Error(`TTS ${prediction.status}: ${key}`)
  const url=typeof prediction.output==='string'?prediction.output:prediction.output?.audio
  if(typeof url!=='string')throw Error('Unexpected TTS output')
  const response=await fetch(url,{signal:AbortSignal.timeout(60000)})
  if(!response.ok)throw Error(`Audio download HTTP ${response.status}`)
  const data=Buffer.from(await response.arrayBuffer());if(data.length<100)throw Error('Empty TTS recording')
  const source=path.join(cache,key+'.wav'),target=path.join(cache,key+'.m4a')
  await fs.writeFile(source,data)
  if(process.platform==='darwin')await run('/usr/bin/afconvert',[source,target,'-f','m4af','-d','aac','-b','64000'])
  else await run('ffmpeg',['-y','-i',source,'-c:a','aac','-b:a','64k',target])
  await fs.rename(target,path.join(output,key+'.m4a'))
  await fs.unlink(source)
  if(++done%25===0||done===jobs.size)console.log(`${done}/${jobs.size} recordings ready`)
 }
 const results=await Promise.allSettled(Array.from({length:concurrency},async()=>{while(queue.length&&!stopped){const job=queue.shift();try{await generate(job)}catch(e){stopped=true;throw e}}}))
 const failure=results.find(r=>r.status==='rejected');if(failure)throw failure.reason
 const receipts=await Promise.all((await fs.readdir(cache)).filter(f=>f.endsWith('.json')).map(async f=>JSON.parse(await fs.readFile(path.join(cache,f),'utf8'))))
 console.log(JSON.stringify({recordings:done,estimatedActualCost:receipts.reduce((sum,p)=>sum+(p.metrics?.predict_time??0)*0.000225,0)}))
 const manifestPath=path.join(output,'english.json')
 let previous={};try{previous=JSON.parse(await fs.readFile(manifestPath,'utf8')).clips??{}}catch{/* First publication. */}
 await fs.writeFile(manifestPath,JSON.stringify({version:1,model,voice:'af_bella',clips:{...previous,...Object.fromEntries([...jobs.keys()].map(key=>[key,key+'.m4a']))}},null,2)+'\n')
}
