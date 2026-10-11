import {describe,it,expect} from 'vitest'
import catalog from './catalog.json'
import worldSource from './world.json'
import {applyAction,emptyJournal,journalKey,readJournal,recordKey,startEpisode,totalXP,validJournal,writeJournal} from './journal'
import type {Journal} from './journal'
import type {Episode,World,Action} from './model'
const episodes=catalog as unknown as Episode[],w=worldSource as World
const coverage={percent:0,answerPercent:0,unknown:[],variant:'simple' as const,supported:true}
const act=(j:Journal,ep:Episode,a:Action)=>applyAction(j,ep,w,a)
function finish(j:Journal,ep:Episode,support=false){
 j=startEpisode(j,ep,coverage,true)
 for(const scene of ep.scenes){
  j=act(j,ep,{type:'showAll'})
  if(scene.promptMode==='listen')j=act(j,ep,{type:support?'transcript':'heard'})
  if(support){j=act(j,ep,{type:'hint'});if(scene.kind==='choice')j=act(j,ep,{type:'answer',choiceId:scene.options!.find(o=>!o.correct)!.id})}
  if(scene.kind==='choice')j=act(j,ep,{type:'answer',choiceId:scene.options!.find(o=>o.correct)!.id})
  else{for(let i=0;i<scene.choices[0].simple.chunks.length;i++)j=act(j,ep,{type:'tile',index:i});j=act(j,ep,{type:'check'})}
  j=act(j,ep,{type:'next'})
 }
 return j
}
function storage(){const map=new Map<string,string>();return {get length(){return map.size},key:(i:number)=>[...map.keys()][i]??null,getItem:(k:string)=>map.get(k)??null,setItem:(k:string,v:string)=>{map.set(k,v)},removeItem:(k:string)=>map.delete(k),clear:()=>map.clear()} as Storage}
describe('atomic neighbourhood journal',()=>{
 it('rewards best practice only, awards participants once, and keeps first completion',()=>{
  const ep=episodes[0];let j=finish(emptyJournal(),ep,true)
  expect(totalXP(j)).toBe(8);expect(j.friendships.lin).toBe(2)
  const first=structuredClone(j.records[recordKey(ep)].first)
  j=finish(j,ep);expect(totalXP(j)).toBe(16);expect(j.friendships.lin).toBe(2)
  j=finish(j,ep,true);expect(totalXP(j)).toBe(16);expect(j.records[recordKey(ep)].first).toEqual(first)
  expect(validJournal(j,episodes,w)).toBe(true)
 })
 it('introduces unknown facts without testing and keeps eligibility stable on resume',()=>{
  const ep=episodes[2];let j=finish(emptyJournal(),ep)
  expect(j.facts).toContain('lin-tea');expect(j.records[recordKey(ep)].current!.memoryEligible).not.toContain('lin-tea')
  expect(act(j,ep,{type:'memory',choiceId:'coffee'})).toBe(j)
  j=act(j,ep,{type:'learnFact'});expect(j.facts).toContain('lin-tea')
  expect(act(j,ep,{type:'memory',choiceId:'tea'})).toBe(j)
  expect(startEpisode(j,ep,coverage).records[recordKey(ep)].current!.memoryEligible).not.toContain('lin-tea')
  const replay=finish(j,ep);expect(replay.records[recordKey(ep)].current!.memoryEligible).toContain('lin-tea')
 })
 it('applies a memory loss once, repairs exactly once, and retains unlocked bonuses after setbacks',()=>{
  let j=finish(emptyJournal(),episodes[0]);j=finish(j,episodes[2]);const ep=episodes[2]
  expect(j.friendships.lin).toBe(4);expect(j.unlocked).toContain('lin-friendly')
  j=act(j,ep,{type:'memory',choiceId:'coffee'});expect(j.friendships.lin).toBe(3);expect(j.unlocked).toContain('lin-friendly')
  expect(act(j,ep,{type:'memory',choiceId:'coffee'})).toBe(j)
  j=act(j,ep,{type:'repair'});expect(j.friendships.lin).toBe(4)
  expect(act(j,ep,{type:'repair'})).toBe(j)
  j=finish(j,ep);expect(act(j,ep,{type:'memory',choiceId:'tea'})).toBe(j)
  j=act(j,ep,{type:'bonus',choiceId:'lin-friendly'});expect(j.records[recordKey(ep)].current!.bonusId).toBe('lin-friendly')
  expect(act(j,ep,{type:'bonus',choiceId:'zhou-friendly'})).toBe(j)
 })
 it('never farms memory repair at zero, never deducts for ordinary language errors',()=>{
  const ep=episodes[2];let j=emptyJournal();j.facts=['lin-tea'];j=finish(j,ep);j.friendships.lin=0
  j=act(j,ep,{type:'memory',choiceId:'coffee'});expect(j.friendships.lin).toBe(0)
  j=act(j,ep,{type:'repair'});expect(j.friendships.lin).toBe(0)
  j=startEpisode(j,ep,coverage,true);j=act(j,ep,{type:'showAll'});j=act(j,ep,{type:'transcript'});j=act(j,ep,{type:'answer',choiceId:'wrong-1'})
  expect(j.friendships.lin).toBe(0)
 })
 it('awards correct memory once across replay/content versions and all belonging milestones',()=>{
  let j=emptyJournal();for(const ep of episodes.slice(0,3))j=finish(j,ep)
  expect(totalXP(j)).toBe(48);expect(j.friendships).toEqual({lin:4,chen:4,zhou:2});expect(j.milestones).toEqual([...w.goal.milestones,w.goal.id])
  j=act(j,episodes[2],{type:'memory',choiceId:'tea'});expect(j.friendships.lin).toBe(5)
  const updated={...episodes[2],version:5};j=finish(j,updated);expect(j.friendships.lin).toBe(5)
  expect(act(j,updated,{type:'memory',choiceId:'tea'})).toBe(j)
 })
 it('atomically saves results and rejects stale writers; identities stay separate',()=>{
  const s=storage(),before=emptyJournal(),after=finish(before,episodes[0]);writeJournal(s,'a',before,after)
  expect(readJournal(s,'a',episodes,w)).toEqual(after)
  expect(()=>writeJournal(s,'a',before,after)).toThrow('another tab')
  expect(readJournal(s,'b',episodes,w)).toEqual(emptyJournal());expect(s.getItem(journalKey('b'))).toBe(null)
 })
 it('imports legacy versions once with normalized XP, preserving old attempts and never inventing facts',()=>{
  const s=storage();for(const version of [1,2,3]){const count=version===1?7:4;s.setItem(`chunky-game:v1:guest:neighbour:${version}:first`,JSON.stringify({episodeId:'neighbour',version,step:count,results:Array.from({length:count},()=>({independent:true}))}))}
  s.setItem('chunky-game:v1:guest:weekend:3',JSON.stringify({step:2,tiles:[1]}))
  const j=readJournal(s,'guest',episodes,w);expect(j.bestXP.neighbour).toBe(16);expect(j.friendships.lin).toBe(2);expect(j.facts).toEqual([]);expect(j.records).toEqual({})
  expect(readJournal(s,'guest',episodes,w)).toEqual(j)
  const next=startEpisode(j,episodes[0],coverage);writeJournal(s,'guest',j,next)
  expect(readJournal(s,'guest',episodes,w)).toEqual(next);expect(s.getItem('chunky-game:v1:guest:weekend:3')).toBe('{"step":2,"tiles":[1]}')
  s.setItem(journalKey('broken'),'{"schema":1}');expect(()=>readJournal(s,'broken',episodes,w)).toThrow('preserved')
 })
})
