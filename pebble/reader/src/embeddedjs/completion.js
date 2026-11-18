// One credit per complete reading run. Revisiting the ending never creates a run.
export function beginRun(state,now=Date.now(),random=Math.random()){
 if(state.n===-1&&!state.runId)state.runId='pebble-'+now.toString(36)+'-'+Math.floor(random*0x100000000).toString(36);
}
export function completionEvent(pack,state,now=Date.now()){
 if(!state.runId||state.id!==pack.id)return null;
 const node=pack.nodeAt?pack.nodeAt(state.n):pack.nodes[state.n];
 if(node?.type!=='end')return null;
 if(!state.completedAt)state.completedAt=now;
 return {id:state.runId,episode:pack.id,at:state.completedAt};
}
export function enqueue(events,event){if(event&&!events.some(e=>e.id===event.id))events.push(event);return events;}
export function acknowledge(events,id){return events.filter(e=>e.id!==id);}
