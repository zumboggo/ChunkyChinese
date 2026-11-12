import {createClient} from 'npm:@supabase/supabase-js@2.106.2'
const cors={'Access-Control-Allow-Headers':'authorization,apikey,content-type,x-client-info','Access-Control-Allow-Methods':'POST,OPTIONS'}
const reply=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json','Cache-Control':'no-store'}})
const hash=async(value:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)))).map(b=>b.toString(16).padStart(2,'0')).join('')
Deno.serve(async req=>{
 const origin=req.headers.get('Origin')
 if(origin && !['null','https://zumboggo.github.io'].includes(origin))return reply({error:'Origin not allowed'},403)
 // Native Pebble requests do not need browser CORS; the web account UI uses this origin.
 const headers={...cors,...(origin?{'Access-Control-Allow-Origin':origin}:{}),'Vary':'Origin'}
 const respond=(data:unknown,status=200)=>new Response(JSON.stringify(data),{status,headers:{...headers,'Content-Type':'application/json','Cache-Control':'no-store'}})
 if(req.method==='OPTIONS')return new Response('ok',{headers})
 if(req.method!=='POST')return respond({error:'Use POST'},405)
 try{
  const text=await req.text();if(text.length>24000)return respond({error:'Request too large'},413)
  const body=JSON.parse(text),action=body.action||'sync'
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,{auth:{persistSession:false,autoRefreshToken:false}})
  let owner:string|undefined,account=false
  const auth=req.headers.get('Authorization')?.replace(/^Bearer\s+/i,'')
  if(auth){const {data,error}=await db.auth.getUser(auth);if(!error&&data.user){owner=data.user.id;account=true}}
  if(!owner&&typeof body.token==='string'&&/^[A-Za-z0-9_-]{43}$/.test(body.token)){
   const {data,error}=await db.from('garden_devices').select('user_id').eq('token_hash',await hash(body.token)).maybeSingle()
   if(!error&&data)owner=data.user_id
  }
  if(!owner)return respond({error:'Connect this watch in ChunkyChinese Settings'},401)
  if(action==='pair'){
   if(!account)return respond({error:'Account sign-in required'},403)
   const {error:pError}=await db.from('garden_profiles').upsert({user_id:owner},{onConflict:'user_id',ignoreDuplicates:true});if(pError)throw pError
   const bytes=crypto.getRandomValues(new Uint8Array(32));const token=btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')
   const {error}=await db.from('garden_devices').insert({user_id:owner,token_hash:await hash(token)});if(error)throw error
   return respond({token})
  }
  if(action==='revoke'){
   if(!account)return respond({error:'Account sign-in required'},403)
   const {error}=await db.from('garden_devices').delete().eq('user_id',owner);if(error)throw error
   return respond({ok:true})
  }
  if(action==='export'){
   if(!account)return respond({error:'Account sign-in required'},403)
   const {data:profile,error:p}=await db.from('garden_profiles').select('*').eq('user_id',owner).maybeSingle();if(p)throw p
   const prayers:unknown[]=[]
   for(let offset=0;;offset+=1000){const {data,error}=await db.from('garden_prayers').select('id,credit_day,recorded_at,active').eq('user_id',owner).order('id').range(offset,offset+999);if(error)throw error;prayers.push(...data);if(data.length<1000)break}
   const {data:world,error:w}=await db.rpc('garden_sync',{owner,actions:[]});if(w)throw w
   return respond({version:1,exportedAt:new Date().toISOString(),profile,prayers,world})
  }
  if(action!=='sync')return respond({error:'Unknown action'},400)
  if(body.ops!==undefined&&!Array.isArray(body.ops))return respond({error:'Invalid operations'},400)
  const {data,error}=await db.rpc('garden_sync',{owner,actions:body.ops||[]});if(error)throw error
  return respond(data)
 }catch(error){console.error('Hearth Garden request failed',error instanceof Error?error.message:'database error');return respond({error:'World sync could not finish. Your queued actions are safe; try again.'},400)}
})
