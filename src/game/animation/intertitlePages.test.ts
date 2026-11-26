import {describe,it,expect} from 'vitest'
import {readFileSync} from 'node:fs'
import {intertitlePages,usesIntertitles} from './intertitlePages'
import type {ChinesePackage} from './package'
describe.each([18,19,20,21,22,23,24,25,26,27])('Episode %i intertitles',episode=>{
 const pack=JSON.parse(readFileSync(`public/stories/animated/supportive-${episode}.json`,'utf8')) as ChinesePackage
 it('preserves every reviewed chunk in order with no overfull pages or avoidable singletons',()=>{
  for(const line of Object.values(pack.chinese!.lines)){
   const pages=intertitlePages(line)
   expect(pages.flatMap(p=>p.interlinear)).toEqual(line.interlinear)
   for(const page of pages){expect(page.interlinear!.length).toBeLessThanOrEqual(3);if(line.interlinear!.length>1)expect(page.interlinear!.length).toBeGreaterThanOrEqual(2)}
  }
 })
 it('selects the approved release without retrofitting other episodes',()=>{expect(usesIntertitles(pack.script)).toBe(true);expect(usesIntertitles(JSON.parse(readFileSync('public/stories/animated/supportive-17.json','utf8')).script)).toBe(false)})
 it('supports newly authored scripts through explicit presentation metadata',()=>{expect(usesIntertitles('story 2\nI: 新的故事。\nend',{mode:'reading',layout:'intertitles',animationLabels:[]})).toBe(true)})
})
