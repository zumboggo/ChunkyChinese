import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory} from '../shared/engine/story-engine.js'
import {pixelShots} from '../pixel/direction'
import sheets from './sheets.json'

it('covers every episode 18 passage and branch with one of eighteen embedded panels',()=>{
 const pack=JSON.parse(readFileSync('stories/animated/supportive-18.json','utf8'))
 const story=compileStory(pack.script,pack.assets).story
 const shots=pixelShots(pack.script,story)!
 const panels=new Set<string>()
 for(const shot of shots.values()){
  expect(shot.comic).toBeDefined()
  const comic=shot.comic!
  expect(Number.isInteger(comic.panel)&&comic.panel>=0&&comic.panel<6).toBe(true)
  expect(comic.alt.length).toBeGreaterThan(15)
  expect((sheets as Record<string,string>)[comic.sheet]).toMatch(/^data:image\/jpeg;base64,/)
  panels.add(`${comic.sheet}:${comic.panel}`)
 }
 expect(panels.size).toBe(18)
 expect(shots.size).toBe(39)
})
