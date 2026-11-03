import type {ListeningEvent} from '../types'
export function activeElapsedSeconds(start:number,end:number,lastActivity:number,visible:boolean):number {
 return visible?Math.max(0,Math.min(end,lastActivity+60_000)-start)/1000:0
}
export function episodeAttempts(events:ListeningEvent[]) {
 const attempts=new Map<string,{id:string;title:string;seconds:number;completedAt?:string;lastAt:string;partial:boolean}>()
 for(const event of events){
  if(event.source!=='game'||!event.sessionId)continue
  const row=attempts.get(event.sessionId)??{id:event.sessionId,title:event.episodeTitle??event.itemId,seconds:0,lastAt:event.timestamp,partial:Boolean(event.partialTiming)}
  row.seconds+=event.seconds??0
  row.lastAt=row.lastAt>event.timestamp?row.lastAt:event.timestamp
  if(event.type==='complete')row.completedAt=event.timestamp
  attempts.set(row.id,row)
 }
 return [...attempts.values()].sort((a,b)=>b.lastAt.localeCompare(a.lastAt))
}
