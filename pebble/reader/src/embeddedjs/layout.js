// Shared by the watch and layout tests. All measurements use the actual font.
export function wrap(text,measure,width=184){
 const lines=[];let line='';
 const tokens=text.match(/[\u3400-\u9fff，。！？；：、“”‘’…]|[^\s\u3400-\u9fff，。！？；：、“”‘’…]+|\s+/g)||[];
 for(const token of tokens){
  if(measure(line+token)<=width){line+=token;continue;}
  if(line.trim())lines.push(line.trim());line='';
  if(!token.trim())continue;
  for(const c of token){if(measure(line+c)>width&&line){lines.push(line);line='';}line+=c;}
 }
 if(line.trim())lines.push(line.trim());return lines.length?lines:[''];
}
export function pages(phrase,encounter,measure){
 const py=wrap(phrase.py,t=>measure(t,'py'));
 const lower=wrap(encounter===0?phrase.en:phrase.zh,t=>measure(t,encounter===0?'en':'zh'));
 const per=encounter===0?3:2, count=Math.max(Math.ceil(py.length/2),Math.ceil(lower.length/per));
 return Array.from({length:count},(_,i)=>({py:py.slice(Math.min(i,Math.ceil(py.length/2)-1)*2,Math.min(i,Math.ceil(py.length/2)-1)*2+2),lower:lower.slice(Math.min(i,Math.ceil(lower.length/per)-1)*per,Math.min(i,Math.ceil(lower.length/per)-1)*per+per)}));
}
