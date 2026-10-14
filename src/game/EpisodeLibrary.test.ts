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
 it('supports cached older catalogs and local releases',()=>{
  const one=episode('moonlight-01-v2',undefined),two=episode('moonlight-02-v2',undefined)
  expect(nextEpisode([two,one],one)).toBe(two);expect(categoryOf(episode('local',undefined))).toBe('daily-life')
 })
})
