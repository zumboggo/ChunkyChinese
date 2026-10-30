const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms))
/** Only explicit rate-limit rejections can retry a paid POST. Timeouts/5xx remain uncertain. */
export async function providerJson(url,options={}, {fetcher=fetch,wait=sleep,attempts=5,onAttempt=async()=>{},onRejected=async()=>{}}={}){
 for(let i=0;i<attempts;i++){
  await onAttempt()
  const response=await fetcher(url,{...options,signal:AbortSignal.timeout(90000)})
  if(response.ok)return response.json()
  const rejected=response.status===429||[400,401,403,404,422].includes(response.status)
  if(rejected)await onRejected(response.status)
  const retry=response.status===429||(!options.method||options.method==='GET')&&response.status>=500
  if(!retry||i===attempts-1)throw Error(`Provider HTTP ${response.status}${rejected?' (rejected)':' (outcome uncertain)'}`)
  const header=response.headers.get('retry-after'),seconds=Number(header)
  const delay=header?(Number.isFinite(seconds)?seconds*1000:Date.parse(header)-Date.now()):1000*2**i
  // Do not retry sooner than a provider's long Retry-After; stop for a later invocation.
  if(delay>60000)throw Error('Provider retry window exceeds 60 seconds; resume later using saved receipts.')
  await wait(Math.max(1000,Number.isFinite(delay)?delay:1000*2**i))
 }
}

export async function savedPrediction({read,write,submit,poll,wait=sleep}){
 let prediction=await read()
 if(!prediction||prediction.status==='submission-rejected'){
  prediction=await submit({onAttempt:()=>write({status:'submission-uncertain'}),onRejected:httpStatus=>write({status:'submission-rejected',httpStatus})})
  await write(prediction)
 }
 if(!prediction.urls?.get)throw Error('Uncertain audio submission; inspect the saved receipt before retrying. No duplicate submitted.')
 while(!['succeeded','failed','canceled'].includes(prediction.status)){
  await wait(1500);prediction=await poll(prediction.urls.get);await write(prediction)
 }
 if(prediction.status!=='succeeded')throw Error(`TTS ${prediction.status}; saved prediction was not resubmitted.`)
 return prediction
}
