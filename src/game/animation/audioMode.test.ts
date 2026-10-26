import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest'
import {playAudioModeLine} from './audioMode'

class TestAudio {
 static current:TestAudio
 volume=1
 onended:(()=>void)|null=null
 onerror:(()=>void)|null=null
 pause=vi.fn()
 play=vi.fn(async()=>{})
 constructor(){TestAudio.current=this}
}
class TestUtterance {text:string;lang='';volume=1;onend:(()=>void)|null=null;onerror:(()=>void)|null=null;constructor(text:string){this.text=text}}
let spoken:TestUtterance[]
const cancel=vi.fn()
beforeEach(()=>{
 vi.useFakeTimers();spoken=[];cancel.mockClear()
 vi.stubGlobal('Audio',TestAudio)
 vi.stubGlobal('SpeechSynthesisUtterance',TestUtterance)
 vi.stubGlobal('window',{speechSynthesis:{speak:(u:TestUtterance)=>spoken.push(u),cancel,getVoices:()=>[]}})
})
afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
const line={audio:'recorded-chinese',english:'Welcome home.'}
describe('Audio Mode sequencing',()=>{
 it('finishes Chinese, waits the chosen delay, then finishes English before resolving',async()=>{
  let finished=false
  const result=playAudioModeLine({text:'回来了？',line,english:true,pause:3,volume:.4,signal:new AbortController().signal}).then(()=>{finished=true})
  expect(TestAudio.current.volume).toBe(.4)
  expect(spoken).toHaveLength(0)
  TestAudio.current.onended?.()
  await vi.advanceTimersByTimeAsync(2999)
  expect(spoken).toHaveLength(0)
  await vi.advanceTimersByTimeAsync(1)
  expect(spoken[0]).toMatchObject({text:'Welcome home.',lang:'en-US',volume:.4})
  expect(finished).toBe(false)
  spoken[0].onend?.();await result
  expect(finished).toBe(true)
 })
 it('never speaks English when cancelled during the translation pause',async()=>{
  const controller=new AbortController()
  const result=playAudioModeLine({text:'回来了？',line,english:true,pause:3,volume:1,signal:controller.signal})
  const rejected=expect(result).rejects.toMatchObject({name:'AbortError'})
  TestAudio.current.onended?.();await vi.advanceTimersByTimeAsync(1000)
  controller.abort();await rejected;await vi.advanceTimersByTimeAsync(5000)
  expect(spoken).toHaveLength(0)
 })
 it('cancels recordings and active device speech',async()=>{
  const recording=new AbortController()
  const first=playAudioModeLine({text:'回来了？',line,english:false,pause:0,volume:1,signal:recording.signal})
  const rejected=expect(first).rejects.toMatchObject({name:'AbortError'})
  recording.abort();await rejected;expect(TestAudio.current.pause).toHaveBeenCalled()
  const voice=new AbortController()
  const second=playAudioModeLine({text:'你好',english:false,pause:0,volume:1,signal:voice.signal})
  const rejectedVoice=expect(second).rejects.toMatchObject({name:'AbortError'})
  expect(spoken[0]).toMatchObject({text:'你好',lang:'zh-CN'})
  voice.abort();await rejectedVoice;expect(cancel).toHaveBeenCalled()
 })
 it('supports no delay and reports missing translations without silently skipping English',async()=>{
  const result=playAudioModeLine({text:'回来了？',line,english:true,pause:0,volume:1,signal:new AbortController().signal})
  TestAudio.current.onended?.();await vi.advanceTimersByTimeAsync(0)
  expect(spoken).toHaveLength(1);spoken[0].onend?.();await result
  const missing=playAudioModeLine({text:'你好',line:{audio:'recording'},english:true,pause:0,volume:1,signal:new AbortController().signal})
  const rejected=expect(missing).rejects.toThrow('no English translation')
  TestAudio.current.onended?.();await rejected
 })
})
