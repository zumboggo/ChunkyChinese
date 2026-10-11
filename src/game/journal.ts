import { freshAttempt, transition, validAttempt, type Action, type Attempt, type Coverage, type Episode, type Preferences, type World } from './model'
export interface EpisodeRecord { current?: Attempt; first?: Attempt; completed?: Attempt }
export interface Journal {
  schema: 1; revision: number; preferences: Preferences; records: Record<string, EpisodeRecord>;
  bestXP: Record<string, number>; friendships: Record<string, number>; facts: string[]; milestones: string[];
  unlocked: string[]; events: Record<string, number>; legacyNotice: boolean
}
export const journalKey = (identity: string) => `chunky-game:journal:1:${encodeURIComponent(identity)}`
export const recordKey = (ep: Episode) => `${ep.id}:${ep.version}`
export const totalXP = (j: Journal) => Object.values(j.bestXP).reduce((a,b)=>a+b,0)
export const friendshipLevel = (n: number) => n >= 8 ? 'Trusted' : n >= 4 ? 'Friendly' : n >= 2 ? 'Familiar' : 'New acquaintance'
export function emptyJournal(): Journal { return { schema:1,revision:0,preferences:{pinyin:true,clues:true,motion:true},records:{},bestXP:{},friendships:{},facts:[],milestones:[],unlocked:[],events:{},legacyNotice:false } }
const add = (list: string[], id: string) => { if(!list.includes(id))list.push(id) }
function unlock(j: Journal,w: World) { for(const [id,b] of Object.entries(w.bonuses))if((j.friendships[b.character]??0)>=b.threshold)add(j.unlocked,id) }
function completion(j: Journal, ep: Episode, w: World) {
  if(j.events[`complete:${ep.id}`]===undefined){
    j.events[`complete:${ep.id}`]=1
    for(const id of ep.participants)j.friendships[id]=(j.friendships[id]??0)+2
  }
  add(j.milestones,ep.milestone);if(w.goal.milestones.every(id=>j.milestones.includes(id)))add(j.milestones,w.goal.id);unlock(j,w)
}
export function readJournal(storage: Storage,identity: string,episodes: Episode[],w: World): Journal {
  const raw=storage.getItem(journalKey(identity))
  if(raw){const value:unknown=JSON.parse(raw);if(!validJournal(value,episodes,w))throw new Error('Your neighbourhood journal could not be read. Existing data has been preserved.');return value}
  const j=emptyJournal()
  try {const p=JSON.parse(storage.getItem(`chunky-game:preferences:${encodeURIComponent(identity)}`)??'{}');j.preferences={pinyin:p?.pinyin!==false,clues:p?.clues!==false,motion:p?.motion!==false}}catch{/* defaults; do not modify old preferences */}
  const prefix=`chunky-game:v1:${encodeURIComponent(identity)}:`
  for(let i=0;i<storage.length;i++){
    const key=storage.key(i)!;if(!key.startsWith(prefix))continue
    const [id,version,suffix]=key.slice(prefix.length).split(':');const ep=episodes.find(e=>e.id===id)
    if(!ep||!['1','2','3'].includes(version))continue
    j.legacyNotice=true
    try {
      const a=JSON.parse(storage.getItem(key)!);const count=version==='1'?7:4
      if(!['first','complete'].includes(suffix)||a.episodeId!==id||a.version!==Number(version)||a.step!==count||!Array.isArray(a.results)||a.results.length!==count||!a.results.every((r:{independent:unknown})=>typeof r?.independent==='boolean'))continue
      const xp=Math.round(16*a.results.reduce((n:number,r:{independent:boolean})=>n+(r.independent?1:0.5),0)/count)
      j.bestXP[id]=Math.max(j.bestXP[id]??0,xp);completion(j,ep,w)
    }catch{/* preserve invalid legacy saves without importing their rewards */}
  }
  return j
}
export function validJournal(value: unknown,episodes: Episode[],w: World): value is Journal {
  if(!value||typeof value!=='object')return false
  const j=value as Journal
  const object=(o:unknown):o is Record<string,unknown>=>!!o&&typeof o==='object'&&!Array.isArray(o)
  const ids=(o:unknown)=>Array.isArray(o)&&o.every(i=>typeof i==='string')&&new Set(o).size===o.length
  if(j.schema!==1||!Number.isSafeInteger(j.revision)||j.revision<0||typeof j.legacyNotice!=='boolean'||!object(j.preferences)||![j.preferences.pinyin,j.preferences.clues,j.preferences.motion].every(b=>typeof b==='boolean'))return false
  if(![j.records,j.bestXP,j.friendships,j.events].every(object)||![j.facts,j.milestones,j.unlocked].every(ids))return false
  if(!Object.values(j.bestXP).every(n=>Number.isInteger(n)&&n>=0&&n<=16)||!Object.values(j.friendships).every(n=>Number.isInteger(n)&&n>=0)||!Object.values(j.events).every(n=>Number.isFinite(n)))return false
  if(!j.facts.every(id=>w.facts[id])||!j.unlocked.every(id=>w.bonuses[id]))return false
  for(const ep of episodes){const r=j.records[recordKey(ep)];if(r&&(!object(r)||![r.current,r.first,r.completed].every(a=>a===undefined||validAttempt(ep,a))))return false}
  return true
}
export function startEpisode(j: Journal,ep: Episode,coverage: Coverage,replay=false,callbacks:string[]=[]): Journal {
  const next=structuredClone(j),key=recordKey(ep),r=next.records[key]??={}
  if(replay||!r.current){r.current=freshAttempt(ep,coverage,callbacks,next.preferences);r.current.memoryEligible=[...j.facts]}
  else Object.assign(r.current,next.preferences)
  next.records[key]=r;next.revision++;return next
}
export function changePreferences(j: Journal,p: Preferences): Journal {const next=structuredClone(j);next.preferences={...p,motion:p.motion!==false};next.revision++;return next}
export function applyAction(j: Journal,ep: Episode,w: World,action: Action): Journal {
  const previous=j.records[recordKey(ep)]?.current;if(!previous||!action||typeof action.type!=='string')return j
  const next=structuredClone(j),r=next.records[recordKey(ep)],a=r.current!
  a.notice=''
  const check=ep.memoryCheck,atEnd=a.step===ep.scenes.length
  if(action.type==='memory'||action.type==='repair'||action.type==='learnFact'){
    if(!atEnd||!check)return j
    const event=`memory:${check.id}`,owner=w.facts[check.fact].character
    if(action.type==='learnFact'){
      if(a.memoryEligible.includes(check.fact)||next.facts.includes(check.fact))return j
      add(next.facts,check.fact);a.notice='A new detail in People I know.'
    }else if(action.type==='memory'){
      if(!a.memoryEligible.includes(check.fact)||next.events[event]!==undefined)return j
      const option=check.options.find(o=>o.id===action.choiceId);if(!option)return j
      const before=next.friendships[owner]??0,delta=option.correct?1:-Math.min(before,1)
      next.friendships[owner]=before+delta;next.events[event]=delta
      // Preserve a repair opportunity even when the friendship floor prevented a loss.
      if(!option.correct)next.events[`${event}:repairable`]=-delta
      a.notice=option.correct?'Remembered a personal detail · Friendship +1':'A small mix-up. You can put it right.'
    }else{
      const amount=next.events[`${event}:repairable`]
      if(amount===undefined||next.events[`${event}:repaired`]!==undefined)return j
      next.friendships[owner]=(next.friendships[owner]??0)+amount;next.events[`${event}:repaired`]=1
      a.notice=amount?'You put it right · Friendship +1':'You put it right.'
    }
    a.revision++
  }else if(action.type==='bonus'||action.type==='closeBonus'){
    if(!atEnd)return j
    if(action.type==='bonus'){
      const bonus=action.choiceId&&w.bonuses[action.choiceId]
      if(!bonus||!ep.participants.includes(bonus.character)||!next.unlocked.includes(action.choiceId!))return j
      a.bonusId=action.choiceId!
    }else a.bonusId=null
    a.revision++
  }else if(action.type==='meaning'&&atEnd){a.meaning=!a.meaning;a.revision++
  }else if(['motion','clues','pinyin'].includes(action.type)){
    const key=action.type as keyof Preferences
    a[key]=!a[key];next.preferences={pinyin:a.pinyin,clues:a.clues,motion:a.motion};a.revision++
  }else{
    const moved=transition(ep,previous,action);if(moved===previous)return j
    r.current=moved;moved.notice=''
    const scene=ep.scenes[previous.step]
    if(moved.solved&&!previous.solved)for(const id of scene?.learnFacts??[])add(next.facts,id)
    const earned=moved.results.reduce((n,result)=>n+(result.independent?4:2),0),best=next.bestXP[ep.id]??0
    if(earned>best){next.bestXP[ep.id]=earned;moved.notice=`Language XP +${earned-best}`}
    if(moved.step===ep.scenes.length){
      const first=next.events[`complete:${ep.id}`]===undefined
      completion(next,ep,w);if(check&&!moved.memoryEligible.includes(check.fact))add(next.facts,check.fact);r.first??=structuredClone(moved);r.completed=structuredClone(moved)
      if(first)moved.notice+=(moved.notice?' · ':'')+'Friendship +2 with each participant · Belonging milestone earned'
    }
  }
  unlock(next,w);next.revision++;return next
}
// One localStorage write contains both the attempt and its effects. The host also
// takes a Web Lock, when available, to serialize competing tabs before this check.
export function writeJournal(storage: Storage,identity: string,previous: Journal,next: Journal) {
  const raw=storage.getItem(journalKey(identity)),revision=raw?JSON.parse(raw).revision:0
  if(revision!==previous.revision)throw new Error('Progress changed in another tab. Reload Game before continuing.')
  storage.setItem(journalKey(identity),JSON.stringify(next))
}
