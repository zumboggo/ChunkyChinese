import {it,expect,vi} from 'vitest'
import {defaultEncounters,readEncounters,validEncounter} from './encounters'
it('uses the requested series defaults and independent encounter objects',()=>{
 const supportive=defaultEncounters(true),other=defaultEncounters()
 expect(supportive.count).toBe(3);expect(other.count).toBe(2)
 expect(supportive.encounters[0]).toEqual({chinese:true,english:false,showChinese:true,showPinyin:true,showGloss:true})
 expect(supportive.encounters[1]).toEqual({...other.encounters[1],showChinese:true})
 expect(supportive.encounters[2]).toEqual(other.encounters[1])
 supportive.encounters[2].chinese=false;expect(other.encounters[1].chinese).toBe(true)
})
it('restores valid settings and rejects empty or malformed encounters',()=>{
 const stored=defaultEncounters(true);stored.count=1;stored.readingSeconds=15
 vi.stubGlobal('localStorage',{getItem:()=>JSON.stringify(stored)})
 expect(readEncounters('key',false)).toEqual(stored)
 stored.encounters[0]={chinese:false,english:false,showChinese:false,showPinyin:false,showGloss:false}
 expect(validEncounter(stored.encounters[0])).toBe(false)
 expect(readEncounters('key',false)).toEqual(defaultEncounters())
 vi.stubGlobal('localStorage',{getItem:()=>'{broken'})
 expect(readEncounters('key',true)).toEqual(defaultEncounters(true));vi.unstubAllGlobals()
})
