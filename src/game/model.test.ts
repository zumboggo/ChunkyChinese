import { describe, expect, it } from 'vitest'
import source from '../../stories/chengdu/episodes.json'
import { accepts, freshAttempt, transition, validAttempt, storageKey, validMessage, selectCoverage, flags, shuffled, bank } from './model'
import type { Episode, Attempt } from './model'
const episodes = source as Episode[]
const coverage = { percent: 0, answerPercent: 0, unknown: ['我'], variant: 'simple' as const, supported: true }
function choose(ep: Episode, a: Attempt, id: string) { void id; a = transition(ep, a, { type: 'showAll' }); if(ep.scenes[a.step].promptMode === 'listen') a = transition(ep,a,{type:'heard'}); return ep.scenes[a.step].kind === 'choice' ? transition(ep, a, { type: 'answer', choiceId: 'correct' }) : a }
function solve(ep: Episode, a: Attempt) {
  if (a.solved) return a
  const c = ep.scenes[a.step].choices.find(c => c.id === a.choiceId)!
  for (let index = 0; index < c[a.variant].chunks.length; index++) a = transition(ep, a, { type: 'tile', index })
  return transition(ep, a, { type: 'check' })
}
describe('Chengdu authored episodes', () => {
  for (const ep of episodes) for (const variant of ['simple', 'rich'] as const) {
    it(`${ep.id}/${variant}: every choice is reachable, accepted and recorded`, () => {
      let paths = [freshAttempt(ep, { ...coverage, variant })]
      for (const scene of ep.scenes) {
        paths = paths.flatMap(a => scene.choices.map(c => {
          const solved = solve(ep, choose(ep, a, c.id))
          expect(solved.solved).toBe(true)
          expect(validAttempt(ep, solved)).toBe(true)
          const next = transition(ep, solved, { type: 'next' })
          expect(validAttempt(ep, next)).toBe(true)
          return next
        }))
      }
      for (const a of paths) { expect(a.step).toBe(4); expect(a.results.every(r => r.independent)).toBe(true) }
    })
  }
  it('rejects out-of-order, duplicate, premature and fabricated choices', () => {
    const ep = episodes[0], a = freshAttempt(ep, coverage)
    expect(transition(ep, a, { type: 'next' })).toBe(a)
    expect(transition(ep, a, { type: 'choose', choiceId: 'live' })).toBe(a)
    let b: Attempt = { ...a, step: 3, choiceId: 'reply', results: Array.from({length:3},()=>({choiceId:'reply',independent:true,errors:0})) }
    expect(transition(ep, b, { type: 'tile', index: -1 })).toBe(b)
    b = transition(ep, b, { type: 'tile', index: 0 })
    expect(transition(ep, b, { type: 'tile', index: 0 })).toBe(b)
    expect(validAttempt(ep, { ...b, tiles: [0,0] })).toBe(false)
    expect(validAttempt(ep, { ...b, solved: true })).toBe(false)
    expect(validAttempt(ep, { ...b, step: 7 })).toBe(false)
  })
  it('preserves unfinished chunks, flags support and offers a model only after errors', () => {
    const ep = episodes[0]
    let a = freshAttempt(ep, coverage)
    for(let i=0;i<3;i++) a=transition(ep,choose(ep,a,'reply'),{type:'next'})
    a=transition(ep,a,{type:'showAll'})
    expect(transition(ep, a, { type: 'model' })).toBe(a)
    for(let n=0;n<2;n++) {
      a=transition(ep,a,{type:'clear'})
      for(const index of [2,1,0]) a=transition(ep,a,{type:'tile',index})
      a=transition(ep,a,{type:'check'})
    }
    expect(a.errors).toBe(2)
    expect(validAttempt(ep, JSON.parse(JSON.stringify(a)))).toBe(true)
    a=transition(ep,a,{type:'model'});a=transition(ep,a,{type:'check'});a=transition(ep,a,{type:'next'})
    expect(a.results[3].independent).toBe(false)
  })
  it('accepts authored variants and interchangeable occurrences only', () => {
    expect(accepts({ chunks: ['我','明天','去'], english:'', alternatives:[[1,0,2]] }, [1,0,2])).toBe(true)
    expect(accepts({ chunks:['好','好','学'],english:'' },[1,0,2])).toBe(true)
    expect(accepts({ chunks:['好','好','学'],english:'' },[0,0,2])).toBe(false)
  })
  it('keeps identity/version storage separate and makes fresh replays', () => {
    const ep=episodes[0],a=freshAttempt(ep,coverage),b=freshAttempt(ep,coverage)
    expect(a.attemptId).not.toBe(b.attemptId)
    expect(storageKey('one',ep)).not.toBe(storageKey('two',ep))
    expect(storageKey('one',ep)).not.toBe(storageKey('one',{...ep,version:1}))
    expect(flags(ep,a)).toEqual([])
  })
  it('does not pretend unfamiliar vocabulary meets the target', () => {
    const c=selectCoverage(episodes[0],[])
    expect(c.supported).toBe(true);expect(c.percent).toBe(0);expect(c.answerPercent).toBe(0);expect(c.variant).toBe('simple')
    expect(c.unknown.length).toBeGreaterThan(3)
  })
  it('uses stable, varied shuffles and defaults with optional scaffolding', () => {
    const orders = new Set(Array.from({length:30},(_,i)=>JSON.stringify(shuffled(8,`attempt-${i}`))))
    expect(orders.size).toBeGreaterThan(10)
    expect(shuffled(8,'same')).toEqual(shuffled(8,'same'))
    expect(shuffled(8,'same').sort()).toEqual([0,1,2,3,4,5,6,7])
    const a=freshAttempt(episodes[0],coverage,[],{pinyin:false,clues:false})
    expect(a.pinyin).toBe(false);expect(a.clues).toBe(false)
    expect(transition(episodes[0],a,{type:'clues'}).clues).toBe(true)
  })
  it('wrong replies do not advance or become independent answers; distractors are covered and rejected', () => {
    for(const ep of episodes) {
      let a=transition(ep,freshAttempt(ep,coverage),{type:'showAll'})
      if(ep.scenes[0].promptMode==='listen')a=transition(ep,a,{type:'heard'})
      for(const option of ep.scenes[0].options!.filter(o=>!o.correct)) {
        a=transition(ep,a,{type:'answer',choiceId:option.id})
        expect(a.solved).toBe(false);expect(a.choiceId).toBe(null)
      }
      a=transition(ep,a,{type:'answer',choiceId:'correct'})
      expect(validAttempt(ep,a)).toBe(true)
      a=transition(ep,a,{type:'next'})
      expect(a.results[0].independent).toBe(false)
      const answer=ep.scenes[3].choices[0].simple
      expect(bank(answer)).toHaveLength(8)
      expect(accepts(answer,[0,1,2,3,4,6])).toBe(false)
    }
  })
  it('listening requires heard audio or transcript support, persists support, and resets it', () => {
    const ep=episodes[2]
    let a=transition(ep,freshAttempt(ep,coverage),{type:'showAll'})
    expect(transition(ep,a,{type:'answer',choiceId:'correct'})).toBe(a)
    expect(transition(ep,a,{type:'meaning'})).toBe(a)
    a=transition(ep,a,{type:'pinyin'})
    expect(a.transcript).toBe(false)
    const heard=transition(ep,a,{type:'heard'})
    expect(heard.hinted).toBe(false)
    expect(transition(ep,transition(ep,heard,{type:'answer',choiceId:'correct'}),{type:'next'}).results[0].independent).toBe(true)
    a=transition(ep,a,{type:'transcript'})
    expect(a.hinted).toBe(true)
    expect(validAttempt(ep,JSON.parse(JSON.stringify(a)))).toBe(true)
    expect(validAttempt(ep,{...a,hinted:false})).toBe(false)
    a=transition(ep,transition(ep,a,{type:'answer',choiceId:'correct'}),{type:'next'})
    expect(a.results[0].independent).toBe(false)
    expect(a.transcript).toBe(false);expect(a.heard).toBe(false)
  })
  it('requires exact source, origin, protocol and launch channel', () => {
    const frame={} as Window, other={} as Window
    const e={source:frame,origin:'https://example.com',data:{protocol:'chunky-game-v1',channel:'a'}} as MessageEvent
    expect(validMessage(e,frame,e.origin,'a')).toBe(true)
    expect(validMessage(e,other,e.origin,'a')).toBe(false)
    expect(validMessage(e,frame,'https://other.com','a')).toBe(false)
    expect(validMessage(e,frame,e.origin,'b')).toBe(false)
  })
})
