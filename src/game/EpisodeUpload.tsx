import {useState} from 'react'
import {importPackage} from './animation/package'
import {publish} from './animation/storage'

export default function EpisodeUpload({identity}:{identity:string}) {
 const [busy,setBusy]=useState(false),[message,setMessage]=useState('')
 return <section className="panel"><h2>The Game — upload episodes</h2>
  <p>Add an episode ZIP or JSON to your playable library. Episodes and progress stay on this device for your account. Uploading the same package again keeps one copy.</p>
  <label>Episode ZIP or JSON<input type="file" accept=".zip,.json" disabled={busy} onChange={async e=>{
   const file=e.target.files?.[0];e.target.value='';if(!file)return
   setBusy(true);setMessage('Checking episode…')
   try {const pack=await importPackage(file);await publish(identity,pack);setMessage(`${pack.title} is ready in The Game.`)}
   catch(error){setMessage(`Could not upload episode: ${String(error)}`)}
   finally{setBusy(false)}
  }}/></label><p role="status">{message}</p>
 </section>
}
