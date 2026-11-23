import {it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {compileStory} from '../shared/engine/story-engine.js'
import {pixelShots} from '../pixel/direction'
import sheets from './sheets.json'

it.each([[18,39,18],[20,36,18],[21,36,18],[22,36,18],[23,41,17],[24,35,17],[25,29,18]])('covers episode %i passages and branches with reviewed embedded panels',(episode,count,panelCount)=>{
 const pack=JSON.parse(readFileSync(`stories/animated/supportive-${episode}.json`,'utf8'))
 const story=compileStory(pack.script,pack.assets).story
 const shots=pixelShots(pack.script,story)!
 const panels=new Set<string>()
 for(const shot of shots.values()){
  expect(shot.comic).toBeDefined()
  const comic=shot.comic!
  expect(Number.isInteger(comic.panel)&&comic.panel>=0&&comic.panel<6).toBe(true)
  expect([1,1.5,2.25]).toContain(comic.aspectRatio??1.5)
  expect(comic.alt.length).toBeGreaterThan(15)
  expect((sheets as Record<string,string>)[comic.sheet]).toMatch(/^data:image\/jpeg;base64,/)
  panels.add(`${comic.sheet}:${comic.panel}`)
 }
 expect(panels.size).toBe(panelCount)
 expect(shots.size).toBe(count)
})
