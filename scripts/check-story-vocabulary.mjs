// Legacy positional usage preserves baseline-only historical audits.
// New draft workflow: npm run game:draft -- --series=moonlight --script=PATH --vocab=PRIVATE_JSON
import {readFileSync,writeFileSync} from 'node:fs'
import {resolve} from 'node:path'
import {auditVocabulary} from './lib/episode-vocabulary.mjs'
const args=process.argv.slice(2),flags=Object.fromEntries(args.filter(a=>a.startsWith('--')).map(a=>{const i=a.indexOf('=');return [a.slice(2,i<0?undefined:i),i<0?true:a.slice(i+1)]})),pos=args.filter(a=>!a.startsWith('--'))
const read=p=>JSON.parse(readFileSync(p,'utf8'))
let series
if(flags.series){if(!/^[a-z0-9-]+$/.test(flags.series))throw Error('Invalid series ID');series=read(`stories/authoring/series/${flags.series}.json`)}
const file=flags.script??pos[0],wordsFile=flags.vocab??pos[1]
if(!file||!wordsFile)throw Error('Provide package/script and private vocabulary JSON. See docs/episode-authoring.md.')
const assetsFile=flags['assets-from']??series?.assetsFrom
const pack=file.endsWith('.story')?{script:readFileSync(file,'utf8'),assets:read(assetsFile??'MISSING_ASSETS_FROM').assets}:read(file)
const lexiconFile=flags.lexicon??pos[2],supplementFile=flags.supplement??series?.vocabularySupplement
const supplemental=supplementFile?read(supplementFile):null
const report=auditVocabulary(pack,read(wordsFile),{lexicon:lexiconFile?read(lexiconFile):[],supplement:supplemental?.words??[],min:series?.coverage?.min??95,max:series?.coverage?.max??98})
if(flags.report){const out=resolve(flags.report),privateRoot=resolve('.local')+'/';if(!out.startsWith(privateRoot))throw Error('Write learner-specific reports under ignored .local/.');writeFileSync(out,JSON.stringify(report,null,2)+'\n')}
if(flags.series||flags.summary){
 console.log(`${report.routes.length} routes · ${report.range.min.toFixed(2)}–${report.range.max.toFixed(2)}% familiar · ${report.passes?'PASS':'REVISE'} (target ${report.target.min}–${report.target.max}%)`)
 console.log(`${report.knownWords} reviewed-known + ${report.assumedAdditionalWords} assumed familiar = ${report.effectiveFamiliarWords} unique words`)
 console.log('Mandarin exposure by route (entries, not listening time): '+report.routes.map(r=>`${r.exposure.mandarinEntryPercent.toFixed(1)}% · ${r.exposure.mandarin} Mandarin / ${r.exposure.english} English / ${r.exposure.mixed} mixed`).join('; '))
 console.log('Unfamiliar words (maximum occurrences on one route): '+report.unknownFrequency.map(w=>`${w.word} ×${w.maxPerRoute}`).join(', '))
}else console.log(JSON.stringify(report,null,2))
if(!report.passes)process.exitCode=1
