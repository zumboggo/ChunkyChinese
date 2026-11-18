export const reactionGroups=["Alden reactions", "Hannah reactions", "Boe reactions", "Jeremy reactions", "Gorgon reactions", "YoungAlden reactions"];
export function reactionActor(i){return reactionGroups[i<24?Math.floor(i/6):i<30?4:5].slice(0,-10); }
export function reactionName(i){const names=i<24?'blink|surprised|thinking|talking|laughing|worried':i<30?'neutral|attentive|thoughtful|skeptical|serious|amused':'neutral|curious|confused|thoughtful|worried';let n=i<24?i%6:i<30?i-24:i-30,at=0;while(n--)at=names.indexOf('|',at)+1;const end=names.indexOf('|',at);return names.slice(at,end<0?undefined:end); }
export function reactionIds(group){const n=reactionGroups.indexOf(group),start=n<4?n*6:n===4?24:30,count=n===5?5:6;return Array.from({length:count},(_,i)=>1000+start+i); }
