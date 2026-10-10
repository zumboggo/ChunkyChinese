import { describe, expect, it } from 'vitest'
import source from '../../stories/chengdu/episodes.json'
import { accepts, freshAttempt, transition, validAttempt, storageKey, validMessage, selectCoverage, flags } from './model'
import type { Episode, Attempt } from './model'
const episodes = source as Episode[]
const coverage = { percent: 0, answerPercent: 0, unknown: ['我'], variant: 'simple' as const, supported: true }
function choose(ep: Episode, a: Attempt, id: string) { a = transition(ep, a, { type: 'showAll' }); return transition(ep, a, { type: 'choose', choiceId: id }) }
function solve(ep: Episode, a: Attempt) {
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
      for (const a of paths) { expect(a.step).toBe(7); expect(a.results.every(r => r.independent)).toBe(true) }
    })
  }
  it('rejects out-of-order, duplicate, premature and fabricated choices', () => {
    const ep = episodes[0], a = freshAttempt(ep, coverage)
    expect(transition(ep, a, { type: 'next' })).toBe(a)
    expect(transition(ep, a, { type: 'choose', choiceId: 'live' })).toBe(a)
    let b = choose(ep, a, 'live')
    expect(transition(ep, b, { type: 'tile', index: -1 })).toBe(b)
    b = transition(ep, b, { type: 'tile', index: 0 })
    expect(transition(ep, b, { type: 'tile', index: 0 })).toBe(b)
    expect(validAttempt(ep, { ...b, tiles: [0,0] })).toBe(false)
    expect(validAttempt(ep, { ...b, solved: true })).toBe(false)
    expect(validAttempt(ep, { ...b, step: 7 })).toBe(false)
  })
  it('preserves unfinished chunks, flags support and offers a model only after errors', () => {
    const ep = episodes[0]
    let a = choose(ep, freshAttempt(ep, coverage), 'live')
    expect(transition(ep, a, { type: 'model' })).toBe(a)
    for(let n=0;n<2;n++) {
      a=transition(ep,a,{type:'clear'})
      for(const index of [2,1,0]) a=transition(ep,a,{type:'tile',index})
      a=transition(ep,a,{type:'check'})
    }
    expect(a.errors).toBe(2)
    expect(validAttempt(ep, JSON.parse(JSON.stringify(a)))).toBe(true)
    a=transition(ep,a,{type:'model'});a=transition(ep,a,{type:'check'});a=transition(ep,a,{type:'next'})
    expect(a.results[0].independent).toBe(false)
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
    expect(storageKey('one',ep)).not.toBe(storageKey('one',{...ep,version:2}))
    expect(flags(ep,a)).toEqual([])
  })
  it('does not pretend unfamiliar vocabulary meets the target', () => {
    const c=selectCoverage(episodes[0],[])
    expect(c.supported).toBe(true);expect(c.percent).toBe(0);expect(c.answerPercent).toBe(0);expect(c.variant).toBe('simple')
    expect(c.unknown.length).toBeGreaterThan(3)
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
