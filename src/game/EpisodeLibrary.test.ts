import {describe,it,expect} from 'vitest'
import {categoryOf,nextEpisode,orderedEpisodes} from './EpisodeLibrary'
import type {Release} from './animation/storage'
const episode=(id:string,category:Release['category'],number?:number)=>({id,category,episode:number,created:''}) as Release
describe('episode navigation',()=>{
 it('orders episodes numerically and never advances into another category',()=>{
  const one=episode('one','lms',1),two=episode('two','lms',2),ten=episode('ten','lms',10)
  const all=[ten,episode('practice','practice'),two,episode('daily','daily-life',1),one]
  expect(orderedEpisodes(all,'lms')).toEqual([one,two,ten]);expect(nextEpisode(all,one)).toBe(two);expect(nextEpisode(all,ten)).toBeUndefined();expect(nextEpisode(all,all[1])).toBeUndefined()
 })
 it('keeps the Jedi series separate even when episode numbers overlap',()=>{
  const jedi=episode('jedi-01-v1','jedi',1),next=episode('jedi-02-v1','jedi',2),other=episode('wind-02','name-of-the-wind',2)
  expect(orderedEpisodes([other,next,jedi],'jedi')).toEqual([jedi,next]);expect(nextEpisode([other,next,jedi],jedi)).toBe(next);expect(nextEpisode([other,jedi],jedi)).toBeUndefined()
 })
 it('supports cached older catalogs and local releases',()=>{
  const one=episode('moonlight-01-v2',undefined),two=episode('moonlight-02-v2',undefined)
  expect(nextEpisode([two,one],one)).toBe(two);expect(categoryOf(episode('local',undefined))).toBe('daily-life')
 })
})
