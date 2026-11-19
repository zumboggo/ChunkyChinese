import {createHash} from 'node:crypto';
// Reuse reviewed language and branches. Explicit reviewed pixel direction is
// attached separately; do not invent performances for undirected stories.
export function phoneEpisode(pack,entry){
 const nodes=[],labels=new Map();let choice;
 const phrases=text=>{
  const line=pack.chinese?.lines?.[text];
  if(!line?.interlinear?.length||line.interlinear.map(p=>p.chinese).join('')!==text)throw Error('Missing reviewed chunks in '+entry.id);
  return line.interlinear.map(p=>{if(!p.pinyin||!p.gloss)throw Error('Incomplete phrase in '+entry.id);return {py:p.pinyin,en:p.gloss};});
 };
 for(const raw of pack.script.split('\n')){
  const line=raw.trim();if(!line||line==='story 2')continue;let m;
  if((m=line.match(/^label (\S+)$/))){if(labels.has(m[1]))throw Error('Duplicate label');labels.set(m[1],nodes.length);choice=null;}
  else if((m=line.match(/^choice (\S+)$/))){choice={type:'choice',id:m[1],options:[]};nodes.push(choice);}
  else if((m=line.match(/^option (\S+) "([^"]+)" -> (\S+)$/))){if(!choice)throw Error('Orphan option');choice.options.push({id:m[1],phrases:phrases(m[2]),to:m[3]});}
  else if((m=line.match(/^goto (\S+)$/)))nodes.push({type:'goto',to:m[1]});
  else if(line==='end')nodes.push({type:'end'});
  else if((m=line.match(/^(\w+)(?: \[([^\]]+)\])?: (.+)$/)))nodes.push({type:'line',speaker:m[1]==='I'?'Narrator':m[1],phrases:phrases(m[3])});
  else if(!/^(scene|show|rest|orient|camera|look|react|express|move) /.test(line))throw Error('Unsupported command in '+entry.id+': '+line);
 }
 const target=label=>{if(!labels.has(label))throw Error('Missing label '+label);return labels.get(label);};
 for(const n of nodes){if(n.type==='goto')n.to=target(n.to);for(const o of n.options||[])o.to=target(o.to);}
 const result={format:1,id:'supportive-'+entry.episode,number:entry.episode,title:pack.title,shortTitle:pack.title.replace(/^Super Supportive\s*(?:·\s*)?(?:Episode\s*)?\d+\s*[:·]\s*/i,''),sources:pack.sources,notice:pack.notice,entry:target('opening'),presentation:'reading',nodes};
 result.version=createHash('sha256').update(JSON.stringify(result)).digest('hex').slice(0,12);
 return result;
}

// Visual-only direction keeps the existing content version and passage indices,
// so downloaded reader bookmarks survive this presentation update.
export function attachPixelDirection(pack,source,direction){
 let hash=2166136261;for(let i=0;i<source.script.length;i++)hash=Math.imul(hash^source.script.charCodeAt(i),16777619);
 if((hash>>>0).toString(16).padStart(8,'0')!==direction.scriptFingerprint)throw Error('Review pixel direction for the changed script');
 let anchor='',offset=0,index=0;
 const lines=pack.nodes.filter(n=>n.type==='line');
 for(const raw of source.script.split('\n')){const line=raw.trim();if(line.startsWith('label ')){anchor=line.slice(6);offset=0;}
  else if(/^\w+(?: \[[^\]]+\])?: .+$/.test(line)){
   const shot=direction.shots.find(s=>s.anchor===anchor&&s.offset===offset);if(!shot)throw Error('Missing pixel direction');lines[index++].pixelShot=shot;offset++;
  }
 }
 if(index!==lines.length)throw Error('Pixel direction count differs from story');
 pack.presentation=direction.shots.every(s=>s.comic)?'comic':'pixel';
}
