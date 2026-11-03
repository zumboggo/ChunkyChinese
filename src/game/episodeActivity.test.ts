import 'fake-indexeddb/auto'
import {describe,it,expect} from 'vitest'
import {activeElapsedSeconds,episodeAttempts} from './episodeActivity'
import {getDashboardStats,recordEvent} from '../db'
import type {ListeningEvent} from '../types'
describe('episode activity',()=>{
 it('counts only the active portion of an idle gap and excludes hidden time',()=>{
  expect(activeElapsedSeconds(0,90000,0,true)).toBe(60)
  expect(activeElapsedSeconds(55000,90000,0,true)).toBe(5)
  expect(activeElapsedSeconds(90000,100000,0,true)).toBe(0)
  expect(activeElapsedSeconds(0,5000,0,false)).toBe(0)
  expect(activeElapsedSeconds(90000,95000,90000,true)).toBe(5)
 })
 it('combines resumed visits while separating repeat attempts',()=>{
  const base:ListeningEvent={id:'1',timestamp:new Date().toISOString(),type:'play',source:'game',itemType:'lesson',itemId:'ep1',sessionId:'attempt1',seconds:20,episodeTitle:'Episode One'}
  const rows=episodeAttempts([base,{...base,id:'2',seconds:40},{...base,id:'3',type:'complete',seconds:0},{...base,id:'4',sessionId:'attempt2',partialTiming:true}])
  expect(rows.find(r=>r.id==='attempt1')).toMatchObject({seconds:60,completedAt:base.timestamp,partial:false})
  expect(rows.find(r=>r.id==='attempt2')).toMatchObject({seconds:20,partial:true})
  expect(rows.find(r=>r.id==='attempt2')?.completedAt).toBeUndefined()
 })
 it('includes game minutes in the heatmap, totals and streak',async()=>{
  const before=await getDashboardStats()
  await recordEvent({source:'game',type:'play',itemType:'lesson',itemId:'ep',seconds:90,sessionId:'test'})
  await recordEvent({source:'game',type:'complete',itemType:'lesson',itemId:'ep',seconds:0,sessionId:'test'})
  const after=await getDashboardStats()
  expect(after.ranges.today.studyMinutes-before.ranges.today.studyMinutes).toBeCloseTo(1.5)
  expect(after.studyHeatmap.at(-1)!.studySeconds-before.studyHeatmap.at(-1)!.studySeconds).toBe(90)
  expect(after.currentStreak).toBeGreaterThan(0)
 })
})
