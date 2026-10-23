import {useState} from 'react'
import type {ChineseLine} from './package'

/** Interactive chunks are siblings of choice buttons, never nested inside them. */
export default function EpisodeInterlinear({text,line,showChinese=true,showPinyin,showGloss,interactive=false}:{text:string;line?:ChineseLine;showChinese?:boolean;showPinyin:boolean;showGloss:boolean;interactive?:boolean}) {
 const chunks=line?.interlinear?.length?line.interlinear:[{chinese:text,pinyin:line?.pinyin??'',gloss:line?.english??''}]
 return <span className="reader-interlinear episode-interlinear" lang="zh-CN">
  {chunks.map((chunk,index)=><Chunk key={`${text}:${index}:${showChinese}:${showPinyin}:${showGloss}`} chunk={chunk} index={index} showChinese={showChinese} showPinyin={showPinyin} showGloss={showGloss} interactive={interactive}/>)}
 </span>
}
function Chunk({chunk,index,showChinese,showPinyin,showGloss,interactive}:{chunk:{chinese:string;pinyin?:string;gloss?:string};index:number;showChinese:boolean;showPinyin:boolean;showGloss:boolean;interactive:boolean}){
 const [revealed,setRevealed]=useState(false)
 const canReveal=(!showChinese&&!!chunk.chinese)||(!showPinyin&&!!chunk.pinyin)||(!showGloss&&!!chunk.gloss)
 const content=<>
  {(showPinyin||revealed)&&chunk.pinyin&&<span className="reader-interlinear-pinyin" lang="zh-Latn">{chunk.pinyin}</span>}
  {(showChinese||revealed)&&<strong lang="zh-CN">{chunk.chinese}</strong>}
  {(showGloss||revealed)&&chunk.gloss&&<span className="reader-interlinear-gloss" lang="en">{chunk.gloss}</span>}
  {!revealed&&!showChinese&&!(showPinyin&&chunk.pinyin)&&!(showGloss&&chunk.gloss)&&<span className="chunk-placeholder" lang="en">Chunk {index+1} · tap to reveal</span>}
 </>
 return interactive&&canReveal?<button type="button" className="reader-interlinear-chunk episode-chunk" aria-expanded={revealed} aria-label={`${revealed?'Hide':'Reveal'} chunk ${index+1}`} onClick={()=>setRevealed(v=>!v)} onKeyDown={e=>{if(e.key===' '||e.key==='Enter')e.stopPropagation();if(e.key==='Escape'){setRevealed(false);e.stopPropagation()}}}>{content}</button>:<span className="reader-interlinear-chunk">{content}</span>
}
