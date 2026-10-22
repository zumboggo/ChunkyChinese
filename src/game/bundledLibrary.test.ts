import {beforeEach,expect,it,vi} from 'vitest'
import {readFileSync} from 'node:fs'
vi.mock('./animation/storage',()=>({read:vi.fn(),write:vi.fn()}))
import {read,write} from './animation/storage'
import {loadBundledLibrary,type CatalogEntry} from './bundledLibrary'
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
