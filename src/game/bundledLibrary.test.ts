import {afterEach,beforeEach,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
vi.mock('./animation/storage',()=>({read:vi.fn(),write:vi.fn()}))
import {read,write} from './animation/storage'
import {loadBundledEntry,loadBundledLibrary,type CatalogEntry} from './bundledLibrary'
const pack=JSON.parse(readFileSync('stories/animated/moonlight-01-v3.json','utf8'))
const catalog:CatalogEntry[]=[{id:'one',path:'one.json',episode:1},{id:'two',path:'two.json',episode:2}]
beforeEach(()=>{vi.resetAllMocks();vi.mocked(read).mockResolvedValue(undefined);vi.mocked(write).mockResolvedValue('saved')})
it('keeps available episodes when another download fails and recovers on retry',async()=>{
 const fetcher=vi.fn().mockRejectedValueOnce(Error('offline')).mockResolvedValueOnce(new Response(JSON.stringify(pack)))
 vi.stubGlobal('fetch',fetcher);const loaded=vi.fn()
 expect(await loadBundledLibrary(loaded,catalog)).toEqual([catalog[0]])
 expect(loaded.mock.calls.map(([r])=>r.id)).toEqual(['two'])
 fetcher.mockImplementation(async()=>new Response(JSON.stringify(pack)))
 expect(await loadBundledLibrary(loaded,catalog)).toEqual([])
 expect(loaded.mock.calls.map(([r])=>r.id)).toEqual(['two','one','two'])
})
it('opens cached episodes offline, and storage failures do not hide valid downloads',async()=>{
 vi.mocked(read).mockResolvedValueOnce(pack).mockRejectedValueOnce(Error('storage unavailable'))
 vi.mocked(write).mockRejectedValue(Error('quota'))
 const fetcher=vi.fn().mockResolvedValue(new Response(JSON.stringify(pack)));vi.stubGlobal('fetch',fetcher)
 const loaded=vi.fn();expect(await loadBundledLibrary(loaded,catalog)).toEqual([])
 expect(fetcher).toHaveBeenCalledTimes(1);expect(loaded).toHaveBeenCalledTimes(2)
})
it('rejects invalid packages individually without caching them',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response('{}')))
 expect(await loadBundledLibrary(vi.fn(),catalog)).toEqual(catalog);expect(write).not.toHaveBeenCalled()
})
it('attaches current intro metadata even when the immutable episode is cached',async()=>{
 vi.mocked(read).mockResolvedValue(pack)
 const intro={src:'stories/animated/cutscenes/test.mp4',poster:'stories/animated/cutscenes/test.jpg',title:'A realization'}
 const loaded=vi.fn()
 expect(await loadBundledLibrary(loaded,[{...catalog[0],intro}])).toEqual([])
 expect(loaded.mock.calls[0][0]).toMatchObject({id:'one',intro,pack})
})

afterEach(()=>{vi.useRealTimers();vi.unstubAllGlobals()})
it('allows slow headers and slow response bodies beyond the former twenty-second deadline',async()=>{
 vi.useFakeTimers()
 const fetcher=vi.fn().mockImplementation((_url,{signal})=>new Promise((resolve,reject)=>{
  signal.addEventListener('abort',()=>reject(signal.reason))
  setTimeout(()=>resolve({ok:true,json:()=>new Promise((resolve,reject)=>{
   signal.addEventListener('abort',()=>reject(signal.reason))
   setTimeout(()=>resolve(pack),25_000)
  })}),25_000)
 }))
 vi.stubGlobal('fetch',fetcher)
 const loading=loadBundledEntry(catalog[0]);const done=expect(loading).resolves.toMatchObject({id:'one',pack})
 await vi.advanceTimersByTimeAsync(50_000);await done
 expect(write).toHaveBeenCalledWith('bundled:one',pack);expect(vi.getTimerCount()).toBe(0)
})
it.each(['headers','body'])('times out stalled %s with a clear retry message and retries without caching incomplete content',async phase=>{
 vi.useFakeTimers()
 vi.stubGlobal('fetch',vi.fn().mockImplementation((_url,{signal})=>{
  const stalled=()=>new Promise((_resolve,reject)=>signal.addEventListener('abort',()=>reject(signal.reason)))
  return phase==='headers'?stalled():Promise.resolve({ok:true,json:stalled})
 }))
 const loading=loadBundledEntry(catalog[0]);const failed=expect(loading).rejects.toThrow('The episode download took too long. Check your connection, then choose Play / resume episode to retry. Your saved progress is safe.')
 await vi.advanceTimersByTimeAsync(120_000);await failed
 expect(write).not.toHaveBeenCalled();expect(vi.getTimerCount()).toBe(0)
 vi.stubGlobal('fetch',vi.fn().mockResolvedValue(new Response(JSON.stringify(pack))))
 await expect(loadBundledEntry(catalog[0])).resolves.toMatchObject({pack});expect(write).toHaveBeenCalledWith('bundled:one',pack)
})
it.each(['network','http','body'])('explains %s failures without exposing raw browser errors',async failure=>{
 const fetcher=failure==='network'?vi.fn().mockRejectedValue(new TypeError('Failed to fetch')):failure==='http'?vi.fn().mockResolvedValue(new Response('',{status:503})):vi.fn().mockResolvedValue({ok:true,json:()=>Promise.reject(new DOMException('signal is aborted without reason','AbortError'))})
 vi.stubGlobal('fetch',fetcher)
 await expect(loadBundledEntry(catalog[0])).rejects.toThrow('The episode could not finish downloading. Check your connection, then choose Play / resume episode to retry. Your saved progress is safe.')
 expect(write).not.toHaveBeenCalled()
})
