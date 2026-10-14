import {compileStory,initialStoryState,settleStory,advanceStory} from '../../src/game/animation/shared/engine/story-engine.js'

export function auditVocabulary(pack,words,{lexicon=[],supplement=[],min=95,max=98}={}){
 if(!Array.isArray(words)||words.some(w=>!w||typeof w.word!=='string'||typeof w.known!=='boolean'))throw Error('Vocabulary must be an array of {word, known} records.')
 if(!Array.isArray(supplement)||new Set(supplement).size!==supplement.length||supplement.some(w=>typeof w!=='string'||!w.trim()))throw Error('Supplement needs unique, nonempty words.')
 const baseline=new Set(words.filter(w=>w.known).map(w=>w.word)),assumed=new Set(supplement.filter(w=>!baseline.has(w)))
 const dictionary=new Set([...words.map(w=>w.word),...lexicon,...supplement]),segmenter=new Intl.Segmenter('zh-CN',{granularity:'word'})
 function measure(text){
  const tokens=[]
  for(let i=0;i<text.length;){
   if(!/[\u3400-\u9fff]/u.test(text[i])){i++;continue}
   let token
   for(let n=Math.min(8,text.length-i);n>0;n--){const s=text.slice(i,i+n);if(dictionary.has(s)){token=s;break}}
   token??=[...segmenter.segment(text.slice(i))][0].segment
   tokens.push({text:token,baseline:baseline.has(token),assumed:assumed.has(token)});i+=token.length
  }
  return tokens
 }
 const {story,errors}=compileStory(pack.script,pack.assets)
 if(errors.length)throw Error(JSON.stringify(errors))
 if(story.nodes.some(n=>n.type==='chance'))throw Error('Chance stories require an explicit outcome audit; this command enumerates deterministic choices only.')
 const routes=[],unknownCounts=new Map()
 function visit(state,choices,tokens,exposure={mandarin:0,english:0,mixed:0},depth=0){
  if(routes.length>=4096||depth>2000)throw Error('Route/step limit exceeded; narrow the draft.')
  if(state.ended){
   if(!tokens.length)throw Error('No Mandarin word occurrences to audit.')
   const measured=tokens.filter(t=>t.baseline).length,assumedCount=tokens.filter(t=>t.assumed).length,known=measured+assumedCount
   const counts=new Map();for(const t of tokens)if(!t.baseline&&!t.assumed)counts.set(t.text,(counts.get(t.text)??0)+1)
   for(const [w,n] of counts)unknownCounts.set(w,Math.max(n,unknownCounts.get(w)??0))
   routes.push({choices,known,measured,assumed:assumedCount,total:tokens.length,percent:100*known/tokens.length,unknown:[...counts.keys()],exposure:{...exposure,totalEntries:exposure.mandarin+exposure.english+exposure.mixed,mandarinEntryPercent:100*(exposure.mandarin+exposure.mixed)/(exposure.mandarin+exposure.english+exposure.mixed)}});return
  }
  const n=story.nodes[state.cursor]
  const count=texts=>{const result={...exposure};for(const text of texts){const zh=/[\u3400-\u9fff]/u.test(text),en=/[a-zA-Z]/u.test(text);if(zh&&en)result.mixed++;else if(zh)result.mandarin++;else if(en)result.english++}return result}
  if(n.type==='choice'){
   const visible=n.options.flatMap(o=>measure(o.text))
   for(const o of n.options)visit(advanceStory(story,state,o.id),[...choices,o.id],[...tokens,...visible],count(n.options.map(o=>o.text)),depth+1)
  }else visit(advanceStory(story,state,null),choices,[...tokens,...measure(n.text??'')],count([n.text??'']),depth+1)
 }
 visit(settleStory(story,initialStoryState(story,1)),[],[])
 const percentages=routes.map(r=>r.percent)
 return {exposureMethod:'Reached text entries, including every visible choice; mixed entries reported separately. Not word share, listening time or mastery.',method:'Chinese word occurrences: longest dictionary match (up to 8 characters), then Intl segmentation. Includes all visible choices. Excludes punctuation, Latin names and Arabic numerals. Supplement entries are assumed familiar, not reviewed mastery.',knownWords:baseline.size,assumedAdditionalWords:assumed.size,effectiveFamiliarWords:baseline.size+assumed.size,range:{min:Math.min(...percentages),max:Math.max(...percentages)},target:{min,max},passes:routes.every(r=>r.percent>=min&&r.percent<=max),unknownFrequency:[...unknownCounts].sort((a,b)=>b[1]-a[1]).map(([word,maxPerRoute])=>({word,maxPerRoute})),routes}
}
