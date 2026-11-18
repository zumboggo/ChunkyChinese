import {describe,it,expect} from 'vitest'
import {animationCursors} from './readingPresentation'
describe('reading presentation direction',()=>{
 it('binds shots to labels across staging commands, independently of prose',()=>{
  const story={labels:{opening:0,reaction:3},nodes:[{type:'label'},{type:'show'},{type:'say'},{type:'label'},{type:'camera'},{type:'react'},{type:'say'},{type:'say'}]}
  expect([...animationCursors(story,['reaction'])]).toEqual([6])
  expect(animationCursors(story,['reaction']).has(7)).toBe(false)
 })
 it('rejects missing or ambiguous direction instead of silently dropping shots',()=>{
  expect(()=>animationCursors({labels:{},nodes:[]},['missing'])).toThrow('Unknown')
  expect(()=>animationCursors({labels:{a:0},nodes:[{type:'label'},{type:'goto'},{type:'say'}]},['a'])).toThrow('directly')
 })
})
