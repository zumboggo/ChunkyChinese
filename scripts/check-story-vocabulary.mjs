// Local authoring only: never publish the learner's vocabulary snapshot.
// Usage: node scripts/check-story-vocabulary.mjs PACKAGE PRIVATE_WORDS_JSON [LEXICON_JSON]
// Words: [{word: "我", known: true}]. Lexicon entries affect segmentation, not knowledge.
import {readFileSync} from 'node:fs'
import {compileStory,initialStoryState,settleStory,advanceStory} from '../src/game/animation/shared/engine/story-engine.js'
const [file,wordsFile,lexiconFile]=process.argv.slice(2)
if(!file||!wordsFile)throw Error('Provide a package and private vocabulary snapshot.')
const pack=JSON.parse(readFileSync(file,'utf8')),words=JSON.parse(readFileSync(wordsFile,'utf8'))
const dictionary=new Map(words.map(w=>[w.word,w.known===true]))
for(const word of lexiconFile?JSON.parse(readFileSync(lexiconFile,'utf8')):[])if(!dictionary.has(word))dictionary.set(word,false)
const segmenter=new Intl.Segmenter('zh-CN',{granularity:'word'})
function measure(text){
 const tokens=[]
 for(let i=0;i<text.length;){
  if(!/[\u3400-\u9fff]/u.test(text[i])){i++;continue}
  let token
  for(let length=Math.min(8,text.length-i);length>0;length--){const candidate=text.slice(i,i+length);if(dictionary.has(candidate)){token=candidate;break}}
  token??=[...segmenter.segment(text.slice(i))][0].segment
  tokens.push({text:token,known:dictionary.get(token)===true});i+=token.length
 }
 return tokens
}
const {story,errors}=compileStory(pack.script,pack.assets)
if(errors.length)throw Error(JSON.stringify(errors))
if(story.nodes.some(n=>n.type==='chance'))throw Error('Chance stories need a seed/outcome audit; this check enumerates deterministic choices only.')
const routes=[]
function visit(state,choices,tokens){
 if(routes.length>4096)throw Error('Too many routes for exhaustive authoring check.')
 if(state.ended){const known=tokens.filter(t=>t.known).length;routes.push({choices,known,total:tokens.length,percent:100*known/tokens.length,unknown:[...new Set(tokens.filter(t=>!t.known).map(t=>t.text))]});return}
 const n=story.nodes[state.cursor]
 if(n.type==='choice'){
  // All options are visible, even those not selected. Count each once.
  const visible=n.options.flatMap(o=>measure(o.text))
  for(const o of n.options)visit(advanceStory(story,state,o.id),[...choices,o.id],[...tokens,...visible])
 }else visit(advanceStory(story,state,null),choices,[...tokens,...measure(n.text??'')])
}
visit(settleStory(story,initialStoryState(story,1)),[],[])
console.log(JSON.stringify({method:'Word occurrences, longest dictionary match (max 8 characters), then Intl Chinese segmentation. All displayed choice options included; punctuation, Latin names and Arabic digits excluded. Unfamiliar lexicon entries remain unknown.',knownWords:words.filter(w=>w.known).length,routes},null,2))
if(routes.some(r=>r.percent<95||r.percent>98))process.exitCode=1
