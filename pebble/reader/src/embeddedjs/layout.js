// Shared by the watch and layout tests. All measurements use the actual font.
export function wrap(text,measure,width=184){
 const lines=[];let line='';
 const tokens=[];let word='';
 for(const c of text){const code=c.charCodeAt(0);if((code>=0x3400&&code<=0x9fff)||'，。！？；：、“”‘’…'.includes(c)||c===' '||c==='\n'||c==='\t'){if(word){tokens.push(word);word='';}tokens.push(c);}else word+=c;}if(word)tokens.push(word);
 for(const token of tokens){
  if(measure(line+token)<=width){line+=token;continue;}
  // Keep closing Chinese punctuation with the preceding character.
  const last=line.charCodeAt(line.length-1);
  if('，。！？；：、”’'.includes(token)&&last>=0x3400&&last<=0x9fff&&line.length>1){lines.push(line.slice(0,-1).trim());line=line.slice(-1)+token;continue;}
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
