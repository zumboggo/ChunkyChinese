import {useEffect,useRef,useState} from 'react'
import {bundledCatalog} from './bundledLibrary'
import {downloadEpisodes,type DownloadProgress} from './episodeOffline'

const selectionKey='chunky-episode-download-selection-v1'
const series=[['super-supportive','Super Supportive'],['lms','Legendary Moonlight Sculptor'],['name-of-the-wind','The Name of the Wind'],['jedi','The Voices Beneath the Water'],['daily-life','Daily Life'],['practice','Practice']]
const category=(entry:typeof bundledCatalog[number])=>entry.category??(entry.id.startsWith('moonlight-')?'lms':'daily-life')
function savedSelection():string[]{
 try{const value=JSON.parse(localStorage.getItem(selectionKey)??'[]');return Array.isArray(value)?value.filter(id=>typeof id==='string'&&bundledCatalog.some(e=>e.id===id)):[]}catch{return []}
}
export default function EpisodeDownloads(){
 const controller=useRef<AbortController|null>(null)
 const [selected,setSelected]=useState<string[]>(savedSelection),[book,setBook]=useState('super-supportive')
 const [progress,setProgress]=useState<DownloadProgress|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 const episodes=bundledCatalog.filter(e=>category(e)===book).sort((a,b)=>(a.episode??0)-(b.episode??0))
 useEffect(()=>()=>controller.current?.abort(),[])
 useEffect(()=>{try{localStorage.setItem(selectionKey,JSON.stringify(selected))}catch{/* Downloads still work when preferences cannot be saved. */}},[selected])
 async function download(ids=selected){
  if(controller.current||!ids.length)return
  setSelected(ids)
  const run=new AbortController();controller.current=run;setBusy(true);setMessage('')
  try{
   const result=await downloadEpisodes(setProgress,run.signal,bundledCatalog.filter(e=>ids.includes(e.id)))
   setMessage(result.failed.length?`${result.done} of ${result.total} episodes saved. Could not save: ${result.failed.join(', ')}. Resume to finish; saved files will be reused.`:`All ${result.total} selected episodes saved for offline play on this device, including voices, artwork and intros.`)
  }catch(error){setMessage(run.signal.aborted?'Download paused. Saved files are kept; choose Download / resume selected to continue.':`Download incomplete. ${error instanceof Error?error.message:String(error)} Saved files are kept; check your connection and free storage, then resume.`)}
  finally{controller.current=null;setBusy(false)}
 }
 return <details className="episode-downloads"><summary>Offline episodes</summary>
  <p>Download a few episodes or one series at a time. Completed files are kept if you pause, lose connection, or close the app. Resume with the same selection; only missing files download again. An interrupted file restarts from its beginning.</p>
  <fieldset disabled={busy}><legend>Choose episodes to keep offline</legend>
   <label>Download series <select value={book} onChange={e=>setBook(e.target.value)}>{series.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label>
   <button onClick={()=>setSelected(episodes.map(e=>e.id))}>Select this series only</button><button onClick={()=>setSelected([])}>Clear selection</button>
   <div style={{maxHeight:'18rem',overflowY:'auto'}}>{episodes.map(e=><label key={e.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 0'}}><input type="checkbox" checked={selected.includes(e.id)} onChange={event=>setSelected(old=>event.target.checked?[...old,e.id]:old.filter(id=>id!==e.id))}/>{e.summary?.title??e.id}</label>)}</div>
  </fieldset>
  <p>{selected.length} episodes selected across all series.</p>
  <button disabled={busy||!selected.length} onClick={()=>void download()}>{busy?'Downloading…':'Download / resume selected'}</button>
  {busy&&<button onClick={()=>controller.current?.abort()}>Pause download</button>}
  <details><summary>Entire library</summary><button disabled={busy} onClick={()=>void download(bundledCatalog.map(e=>e.id))}>Download all episodes</button></details>
  {progress&&<><progress max={progress.total} value={progress.done}/><p role="status">{progress.done} / {progress.total} saved{busy?` · ${progress.title}`:''}</p></>}
  {message&&<p role="status">{message}</p>}
  <p>Keep the app open while downloading. Videos and voices may use substantial storage. Clearing browser data removes downloads.</p>
 </details>
}
