import {useEffect,useRef,useState} from 'react'
import {downloadEpisodes,type DownloadProgress} from './episodeOffline'

export default function EpisodeDownloads(){
 const controller=useRef<AbortController|null>(null)
 const [progress,setProgress]=useState<DownloadProgress|null>(null),[message,setMessage]=useState(''),[busy,setBusy]=useState(false)
 useEffect(()=>()=>controller.current?.abort(),[])
 async function download(){
  if(controller.current)return
  const run=new AbortController();controller.current=run;setBusy(true);setMessage('')
  try{
   const result=await downloadEpisodes(setProgress,run.signal)
   setMessage(result.failed.length?`${result.done} of ${result.total} episodes saved. Could not save: ${result.failed.join(', ')}. Retry to finish; saved files will be reused.`:`All ${result.total} episodes saved for offline play on this device, including voices, artwork and intros.`)
  }catch(error){setMessage(run.signal.aborted?'Download stopped. Saved files are kept; download again to resume.':`Download incomplete. ${error instanceof Error?error.message:String(error)} Saved files are kept; check your connection and free storage, then retry.`)}
  finally{controller.current=null;setBusy(false)}
 }
 return <details className="episode-downloads"><summary>Offline episodes</summary><p>Save every published episode on this device. Keep the app open while downloading; videos and voices may use substantial storage. Download again after new episodes are published. Clearing browser data removes downloads.</p><button disabled={busy} onClick={()=>void download()}>{busy?'Downloading…':'Download all episodes'}</button>{busy&&<button onClick={()=>controller.current?.abort()}>Stop download</button>}{busy&&progress&&<><progress max={progress.total} value={progress.done}/><p role="status">{progress.done} / {progress.total} saved · {progress.title}</p></>}{message&&<p role="status">{message}</p>}</details>
}
