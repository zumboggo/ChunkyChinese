import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import { expect, it, vi } from 'vitest'
const source=readFileSync(new URL('../../public/service-worker.js',import.meta.url),'utf8')
async function requestAudio(status:number, failCache=false, cached=false) {
  type Event={request:Request;respondWith:(value:Promise<Response>)=>void}
  const handlers=new Map<string,(event:Event)=>void>()
  const response=new Response('audio-bytes',{status})
  const put=vi.fn(async()=>{if(failCache)throw new Error('Cannot cache')})
  const fetch=vi.fn(async()=>response)
  runInNewContext(source,{URL,self:{location:new URL('https://example.com/ChunkyChinese/service-worker.js'),addEventListener:(type:string,fn:(event:Event)=>void)=>handlers.set(type,fn)},fetch,caches:{open:async()=>({match:async()=>cached?response:undefined,put})}})
  let promise:Promise<Response>|undefined
  handlers.get('fetch')!({request:new Request('https://example.com/ChunkyChinese/game/v3/audio/test.m4a',{headers:{Range:'bytes=0-'}}),respondWith:value=>{promise=value}})
  return {response:await promise,put,fetch}
}
it('passes partial audio through without attempting to cache HTTP 206',async()=>{
  const result=await requestAudio(206,true)
  expect(result.response?.status).toBe(206)
  expect(await result.response?.text()).toBe('audio-bytes')
  expect(result.put).not.toHaveBeenCalled()
})
it('preserves playable audio when caching a complete response fails',async()=>{
  const result=await requestAudio(200,true)
  expect(result.response?.status).toBe(200)
  expect(result.put).toHaveBeenCalledOnce()
})
it('replays downloaded audio without using the network',async()=>{
  const result=await requestAudio(200,false,true)
  expect(await result.response?.text()).toBe('audio-bytes')
  expect(result.fetch).not.toHaveBeenCalled()
})
