import {describe,it,expect,vi} from 'vitest'
import {readFileSync} from 'node:fs'
import ts from 'typescript'
import {webcrypto} from 'node:crypto'
function setup(validToken=false,user=false) {
 let handler:(r:Request)=>Promise<Response>=async()=>new Response()
 const rpc=vi.fn(async(_name:string,args:unknown)=>({data:{state:{day:1},args},error:null}))
 const tokenQuery={select:()=>tokenQuery,eq:()=>tokenQuery,maybeSingle:async()=>({data:validToken?{user_id:'token-owner'}:null,error:null})}
 const db={auth:{getUser:async()=>({data:{user:user?{id:'account-owner'}:null},error:user?null:new Error('bad jwt')})},from:vi.fn(()=>tokenQuery),rpc}
 const source=readFileSync(new URL('../supabase/functions/hearth-garden/index.ts',import.meta.url),'utf8').replace(/^import .*\n/,'')
 const js=ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.None}}).outputText
 new Function('createClient','Deno','crypto',js)(()=>db,{env:{get:()=>''},serve:(h:typeof handler)=>{handler=h}},webcrypto)
 const request=(body:unknown,headers:Record<string,string>={})=>handler(new Request('https://example.test',{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(body)}))
 return {request,db,rpc}
}
describe('garden bridge access boundaries',()=>{
 it('rejects no credentials before database access',async()=>{const h=setup();expect((await h.request({})).status).toBe(401);expect(h.db.from).not.toHaveBeenCalled();expect(h.rpc).not.toHaveBeenCalled()})
 it('rejects malformed and unknown keys',async()=>{const h=setup();expect((await h.request({token:'bad'})).status).toBe(401);expect((await h.request({token:'A'.repeat(43)})).status).toBe(401);expect(h.rpc).not.toHaveBeenCalled()})
 it('binds valid keys to their own owner, ignoring supplied user IDs',async()=>{const h=setup(true);expect((await h.request({token:'A'.repeat(43),owner:'victim',ops:[]})).status).toBe(200);expect(h.rpc).toHaveBeenCalledWith('garden_sync',{owner:'token-owner',actions:[]})})
 it('does not let watch keys pair, export or revoke',async()=>{const h=setup(true);for(const action of ['pair','export','revoke'])expect((await h.request({token:'A'.repeat(43),action})).status).toBe(403)})
 it('rejects unrelated browser origins',async()=>{const h=setup(true);expect((await h.request({token:'A'.repeat(43)},{Origin:'https://unrelated.example'})).status).toBe(403);expect(h.db.from).not.toHaveBeenCalled()})
 it('uses the verified account identity for owner actions',async()=>{const h=setup(false,true);expect((await h.request({ops:[],owner:'victim'},{Authorization:'Bearer valid'})).status).toBe(200);expect(h.rpc).toHaveBeenCalledWith('garden_sync',{owner:'account-owner',actions:[]})})
})
