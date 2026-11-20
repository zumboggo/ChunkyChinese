import {afterEach,beforeEach,expect,it,vi} from 'vitest'
vi.mock('./bundledLibrary',()=>({bundledCatalog:[],loadBundledEntry:vi.fn()}))
vi.mock('../flightOffline',()=>({prepareOfflineAppShell:vi.fn()}))
import {loadBundledEntry} from './bundledLibrary'
import {prepareOfflineAppShell} from '../flightOffline'
import {downloadEpisodes,episodeMedia} from './episodeOffline'
const catalog=[{id:'one',path:'one.json'},{id:'two',path:'two.json'}]
const saved=new Map<string,Response>()
beforeEach(()=>{
 vi.resetAllMocks();saved.clear()
 vi.mocked(prepareOfflineAppShell).mockResolvedValue({cached:5,failed:0})
 vi.mocked(loadBundledEntry).mockImplementation(async entry=>({id:entry.id,created:'',pack:{intro:{src:'stories/animated/test.mp4'}}} as never))
 vi.stubGlobal('navigator',{storage:{persist:vi.fn().mockResolvedValue(true)}})
 vi.stubGlobal('caches',{open:async()=>({match:async(url:string)=>saved.get(url),put:async(url:string,r:Response)=>{saved.set(url,r)}})})
 vi.stubGlobal('fetch',vi.fn(async()=>new Response('media')))
})
afterEach(()=>vi.unstubAllGlobals())
it('collects local media without copying embedded audio or external source citations',()=>{
 expect(episodeMedia({a:'data:audio/mp3;base64,abc',b:'https://example.com/source',c:['stories/animated/test.mp4','stories/animated/test.mp4']})).toEqual(['/stories/animated/test.mp4'])
})
it('requires durable packages, saves media once, and reuses downloads on retries',async()=>{
 const result=await downloadEpisodes(vi.fn(),new AbortController().signal,catalog)
 expect(result).toMatchObject({done:2,failed:[]})
 expect(loadBundledEntry).toHaveBeenCalledWith(catalog[0],expect.objectContaining({requireStorage:true}))
 expect(fetch).toHaveBeenCalledTimes(4)
 await downloadEpisodes(vi.fn(),new AbortController().signal,catalog)
 expect(fetch).toHaveBeenCalledTimes(4)
})
it('reports storage failure and continues with the remaining episodes',async()=>{
 vi.mocked(loadBundledEntry).mockRejectedValueOnce(Error('QuotaExceededError'))
 expect(await downloadEpisodes(vi.fn(),new AbortController().signal,catalog)).toMatchObject({done:1,failed:['one']})
})
it('does not mark an episode ready if media fails',async()=>{
 vi.mocked(fetch).mockResolvedValueOnce(new Response('',{status:503}))
 expect(await downloadEpisodes(vi.fn(),new AbortController().signal,catalog)).toMatchObject({done:1,failed:['one']})
})
it('does not begin downloading if the offline app shell is incomplete',async()=>{
 vi.mocked(prepareOfflineAppShell).mockResolvedValue({cached:2,failed:1})
 await expect(downloadEpisodes(vi.fn(),new AbortController().signal,catalog)).rejects.toThrow('Some app files')
 expect(loadBundledEntry).not.toHaveBeenCalled()
})
it('stops before another episode when cancelled and preserves saved files',async()=>{
 const controller=new AbortController()
 vi.mocked(loadBundledEntry).mockImplementationOnce(async()=>{controller.abort();throw Error('aborted')})
 await expect(downloadEpisodes(vi.fn(),controller.signal,catalog)).rejects.toThrow()
 expect(loadBundledEntry).toHaveBeenCalledTimes(1)
})
it('downloads only the chosen episodes and resumes after an interrupted media file',async()=>{
 const controller=new AbortController()
 vi.mocked(loadBundledEntry).mockResolvedValue({id:'two',created:'',pack:{intro:{src:'stories/animated/first.mp4'},other:'stories/animated/second.mp4'}} as never)
 vi.mocked(fetch).mockImplementation(async url=>{
  if(String(url).endsWith('second.mp4')){controller.abort();throw Error('connection interrupted')}
  return new Response('media')
 })
 await expect(downloadEpisodes(vi.fn(),controller.signal,[catalog[1]])).rejects.toThrow()
 expect(saved.has('/stories/animated/first.mp4')).toBe(true)
 expect(saved.has('/stories/animated/second.mp4')).toBe(false)
 vi.mocked(fetch).mockClear().mockImplementation(async()=>new Response('media'))
 expect(await downloadEpisodes(vi.fn(),new AbortController().signal,[catalog[1]])).toMatchObject({done:1,total:1,failed:[]})
 expect(vi.mocked(loadBundledEntry).mock.calls.every(([entry])=>entry.id==='two')).toBe(true)
 expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).endsWith('first.mp4'))).toBe(false)
 expect(saved.has('/stories/animated/second.mp4')).toBe(true)
})
