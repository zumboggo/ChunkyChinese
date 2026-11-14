const actors=["Alden", "Hannah", "Boe", "Jeremy", "Gorgon", "YoungAlden"];
const names="blink|surprised|thinking|talking|laughing|worried|blink|surprised|thinking|talking|laughing|worried|blink|surprised|thinking|talking|laughing|worried|blink|surprised|thinking|talking|laughing|worried|neutral|attentive|thoughtful|skeptical|serious|amused|neutral|curious|confused|thoughtful|worried|exhausted|holding-back-sadness|quietly-determined|sheepish|strained-smile|reassuring|deadpan-disbelief|uncomfortable-concern|grudging-approval|sleepy|awkward-concern|sincere-encouragement|weary-patience|restrained-disapproval|reluctant-softening|tearful|frightened|small-brave-resolve";
const owners="00000011111122222233333344444455555000111222333444555";
export const reactionGroups=actors.map(a=>a+' reactions');
export function reactionActor(i){return actors[+owners[i]];}
export function reactionName(i){let at=0;while(i--)at=names.indexOf('|',at)+1;const end=names.indexOf('|',at);return names.slice(at,end<0?undefined:end); }
export function reactionIds(group){const n=reactionGroups.indexOf(group),out=[];for(let i=0;i<owners.length;i++)if(+owners[i]===n)out.push(1000+i);return out;}
