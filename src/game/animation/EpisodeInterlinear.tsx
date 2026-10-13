import type {ChineseLine} from './package'

/** Reader's interlinear visual vocabulary; spans keep a choice one valid button. */
export default function EpisodeInterlinear({text,line,showPinyin,showGloss}:{text:string;line?:ChineseLine;showPinyin:boolean;showGloss:boolean}) {
 if(!line?.interlinear?.length)return <><span lang={/[\u3400-\u9fff]/u.test(text)?'zh-CN':undefined}>{text}</span>{showPinyin&&line?.pinyin&&<span className="pinyin block">{line.pinyin}</span>}</>
 return <span className={`reader-interlinear episode-interlinear${showPinyin?'':' hide-pinyin'}${showGloss?'':' hide-meaning'}`} lang="zh-CN">
  {line.interlinear.map((chunk,index)=><span className="reader-interlinear-chunk" key={index}>
   {showPinyin&&<span className="reader-interlinear-pinyin" lang="zh-Latn">{chunk.pinyin}</span>}
   <strong>{chunk.chinese}</strong>
   {showGloss&&<span className="reader-interlinear-gloss" lang="en">{chunk.gloss}</span>}
  </span>)}
 </span>
}
