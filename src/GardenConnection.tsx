import {useState} from 'react'
import {supabase,syncNow} from './supabaseSync'
export default function GardenConnection({signedIn}:{signedIn:boolean}) {
 const [key,setKey]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('')
 async function request(action:string) {
  if(!supabase)throw new Error('Cloud connection unavailable')
  const {data,error}=await supabase.functions.invoke('hearth-garden',{body:{action}})
  if(error)throw new Error('Could not reach your garden. Check your connection and try again.')
  if(data.error)throw new Error(data.error)
  return data
 }
 async function run(action:'pair'|'export'|'revoke') {
  setBusy(true);setMessage('')
  try {
   if(action!=='revoke')await syncNow()
   const data=await request(action)
   if(action==='pair'){setKey(data.token);setMessage('Paste this same key into Settings for both Hearth & Garden and Garden Journal in the Pebble phone app. Keep it private. It can read your world and record prayer; it cannot access your study content.')}
   else if(action==='revoke'){setKey('');setMessage('Watch connections revoked. Your world is still backed up. Generate a new key to reconnect.')}
   else {const url=URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='hearth-garden-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);setMessage('Backup downloaded. Reconnecting with the same account restores your cloud world automatically.')}
  }catch(e){setMessage(e instanceof Error?e.message:'Connection failed')}finally{setBusy(false)}
 }
 return <section className="panel"><h2>Hearth &amp; Garden · Pebble</h2><p>A quiet world that grows with prayer and completed interactive episodes. Full replays count. Weekly supplies reset Sunday at midnight, Shanghai time; earned discoveries stay.</p>
 {!signedIn?<p>Sign in above to connect your watch and back up your world.</p>:<><div className="button-row"><button disabled={busy} onClick={()=>void run('pair')}>Generate connection key</button><button disabled={busy} onClick={()=>void run('export')}>Download world backup</button><button disabled={busy} onClick={()=>void run('revoke')}>Disconnect watches</button></div>
 {key&&<label>Private connection key<input readOnly value={key} onFocus={e=>e.target.select()}/><button onClick={()=>void navigator.clipboard.writeText(key).then(()=>setMessage('Connection key copied.')).catch(()=>setMessage('Select the key and copy it manually.'))}>Copy key</button></label>}</>}
 <p role="status">{message}</p><small>Your world starts with today's episode completions when you first connect. Offline episode completions sync when ChunkyChinese reconnects. Prayer credits are recorded in Garden Journal. Cloud backup is automatic after sync; offline, unsent changes still live on the watch.</small></section>
}
