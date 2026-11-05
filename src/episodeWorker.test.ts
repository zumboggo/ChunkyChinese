import {readFileSync} from 'node:fs'
import {runInNewContext} from 'node:vm'
import {expect,it,vi} from 'vitest'

it('serves downloaded episode videos and byte ranges without a network',async()=>{
 const handlers:Record<string,(event:unknown)=>void>={}
 const fetch=vi.fn(()=>{throw Error('offline')})
 const response=new Response('0123456789',{headers:{'Content-Type':'video/mp4'}})
 runInNewContext(readFileSync('public/service-worker.js','utf8'),{
  self:{location:{href:'https://example.com/app/service-worker.js',origin:'https://example.com'},addEventListener:(name:string,handler:(event:unknown)=>void)=>{handlers[name]=handler}},
  URL,Response,AbortController,setTimeout,clearTimeout,fetch,
  caches:{open:async()=>({match:async()=>response.clone()})},
 })
 let pending:Promise<Response>|undefined
 const request=new Request('https://example.com/app/stories/animated/intro.mp4',{headers:{Range:'bytes=2-5'}})
 handlers.fetch({request,respondWith:(value:Promise<Response>)=>{pending=value}})
 const partial=await pending!
 expect(partial.status).toBe(206);expect(partial.headers.get('Content-Range')).toBe('bytes 2-5/10');expect(await partial.text()).toBe('2345')
 handlers.fetch({request:new Request(request.url),respondWith:(value:Promise<Response>)=>{pending=value}})
 expect(await (await pending!).text()).toBe('0123456789');expect(fetch).not.toHaveBeenCalled()
})
